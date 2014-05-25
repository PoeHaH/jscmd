if (!String.prototype.trim)
{
	String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g, '');};
}
var cmd = (function ()
{	
	var settings = {sandbox:true,height:250,inputFirst:true,initialCommand:null};
	var model = function(s)
	{
		var scope = null;
		var commands = [];
		var historyPosition = -1;
		var currPosition = -1;
		this.getPreviousCommand = function()
		{
			var r = commands[historyPosition==commands.length-1?historyPosition:historyPosition-1];
			if(typeof r !== 'undefined') historyPosition --;
			return r;
		};
		this.getNextCommand = function()
		{
			var r = commands[historyPosition+1];
			if(typeof r !== 'undefined') historyPosition ++;
			return r||'';
		};
		this.addCommand=function(c)
		{
			if(this.getPreviousCommand()!=c)
			{
				commands.push(c);
				currPosition ++;
				if(currPosition != historyPosition) historyPosition = currPosition;
			}
		};
		function isCircular(o)
		{
			var seen = [];
			function detect (o)
			{
				if (typeof o === 'object')
				{
					if (seen.indexOf(o)!== -1) 
					{
						return true;
					}
					seen.push(o);
					for(var key in o)
					{
						if (o.hasOwnProperty(key) && detect(o[key]))
						{
							return true;
						}
					}
				}
				return false;
			}
			return detect(o);
		}
		this.processCommand=function(c)
		{
			if(scope!=null)
			{
				c = c.trim();
				this.addCommand(c);
				try{
					if (!scope.eval && scope.execScript)
						scope.execScript("null"); // for <=IE8. Hack to have iframe.eval method magically appear.Otherwise it's undefined.
					var r = scope.eval(c);
					var t = typeof r;
					//if no circular references & browser support, we can use JSON.stringify
					if(!isCircular(r) && typeof JSON ==='object' && typeof JSON.stringify === 'function')r=JSON.stringify(r);
					return {type:t,text:r};
				}catch(e){
					return {type:'error',text:e.name+': '+e.message,extra:e.stack};
				}
			}
			else throw new Error("Can't perform command without a scope");
		};
		this.setScope=function(s)
		{
			scope = s;
		}
		this.getScope = function(){return scope;};
	};
	var view = function(s)
	{
		var c = document.createElement('div');
		var i = document.createElement('textarea');
		var w = document.createElement('div');
		var sb = null;
		c.className='cmd-container';
		w.className = 'cmd-window';
		w.style.height = s.height+'px';
		i.className = 'cmd-input';
		i.setAttribute('rows',1);
		i.value='> ';
		i.setAttribute('spellcheck', 'false');
		this.container = c;
		this.inputBox = i;
		this.consoleWindow = w;
		if(s.sandbox)
		{
			sb = document.createElement('iframe');
			sb.setAttribute('height', '0');
			sb.setAttribute('width','0');
			sb.style.display='none';
		}
		this.sandbox = sb;
		this.getInputvalue = function(){return this.inputBox.value;};
		this.setInputvalue = function(v){this.inputBox.value = '> '+v;};
		this.setInputHeight = function()
		{
			var r = this.inputBox.value.split(/\r\n|\r|\n/).length*parseInt(this.inputBox.getAttribute('data-h'));
			this.inputBox.style.height = r+"px";	
		}
		this.appendResult=function(o)
		{
			var l = document.createElement('span');
			l.className = 'cmd-line';
			l.className += ' cmd-'+o.type;
			l.style.display='block';
			l.innerHTML= o.text;
			if(o.type == 'error' && typeof o.extra !== 'undefined') l.setAttribute('title',o.extra);
			this.consoleWindow.insertBefore(l,this.consoleWindow.hasChildNodes()?this.consoleWindow.childNodes[0]:null);
		};
		this.render = function()
		{
			if(s.inputFirst)
			{
				this.container.appendChild(this.inputBox);
				this.container.appendChild(this.consoleWindow);
			}
			else
			{	
				this.container.appendChild(this.consoleWindow);
				this.container.appendChild(this.inputBox);
			}
			document.getElementById(s.container).appendChild(this.container);
			this.inputBox.setAttribute('data-h',(this.inputBox.clientHeight));
			if(s.sandbox && this.sandbox!=null)
			{
				document.body.appendChild(this.sandbox);
			}
		};
	};
	var controller = function(s)
	{
		var m = new model(s);
		var v = new view(s);
		v.render();
		m.setScope(window);
		if(v.sandbox != null)
		{
			if(typeof v.sandbox.contentWindow.console === 'undefined')
				v.sandbox.contentWindow.console = window.console;
			m.setScope(v.sandbox.contentWindow);
		}
		m.getScope().console.log = function(m){if(m!=null && typeof m !== 'undefined')return m;else if(m == null)return m; else return typeof m;};
		m.getScope().console.dir = function(o){if(typeof o === 'object'){var t = '';for (var k in o){if(o[k]!=null)t += k+' : '+o[k].toString()+'. ';else t += k+' : null. ';}return m.getScope().console.log(t);}else return m.getScope().console.log(o);}
		try{v.sandbox.contentWindow.parent=null}catch(e){};
		var inputMap = {38:'_upArrow',40:'_downArrow',13:'_enter'};
		if(s.initialCommand!=null)
		{
			v.setInputvalue(s.initialCommand);
			v.appendResult(m.processCommand(s.initialCommand));
		}
		v.inputBox.onkeydown = function(e)
		{
			e = e||window.event;//IE does not pass event argument, it uses window.event instead
			v.setInputHeight();
			if(e.keyCode == 38)e.preventDefault ? e.preventDefault() : e.returnValue = false;
			if(e.keyCode == 13 && !e.shiftKey)e.preventDefault ? e.preventDefault() : e.returnValue = false;
		}
		v.inputBox.onkeyup = function(e)
		{
			e = e||window.event;
			switch(inputMap[e.keyCode])
			{
				case '_enter':_enter(e);break;
				case '_upArrow':_upArrow(e);break;
				case '_downArrow':_downArrow(e);break;
				default:_keyUp(e);
			}
			v.setInputHeight();
		};
		var _keyUp =function(e)
		{
			if(v.getInputvalue().substring(0,1) !='>')
				v.setInputvalue(v.getInputvalue());
		};
		var _enter = function(e)
		{
			if(!e.shiftKey)
			{
				var c = v.getInputvalue().replace(/^>(\s)*/,'');
				v.setInputvalue('');
				if(c.length>0)
					v.appendResult(m.processCommand(c));
			}
		};
		var _upArrow = function(e)
		{
			var p = m.getPreviousCommand();
			if(typeof p !== 'undefined')v.setInputvalue(p);
		};
		var _downArrow = function(e)
		{
			var p = m.getNextCommand();
			if(typeof p !== 'undefined')v.setInputvalue(p);
		};
	
	};
	//public stuff
	var p =
	{
		init:function(s)
		{
			for(var p in s)
			{
				settings[p] = s[p];
			}
			if(window.location.hash && window.location.hash.replace('#','').length>0)
				settings.initialCommand = window.location.hash.replace('#','');
			var c = new controller(settings);
		}
	};
	return p;
})();
