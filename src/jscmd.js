var cmd = (function (o)
{	
	//private stuff
	var settings = {sandbox:true,height:250,showHints:true,inputFirst:true};
	var mainHints,seconHints = [];
	var setHints = function(f)
	{
		f = f || window;
		var r =[];
		for(var k in f)
			r.push(k);
		return r;
	}
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
			console.log(r);
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
			commands.push(c);
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
				currPosition ++;
				if(currPosition != historyPosition) historyPosition = currPosition;
				try{
					var r = scope.eval(c);
					//if no circular references & browser support, we can use JSON.stringify
					if(!isCircular(r) && typeof JSON ==='object' && typeof JSON.stringify === 'function')r=JSON.stringify(r);
					return {type:typeof r,text:r};
				}catch(e){
					return {type:'error',text:e.name+': '+e.message};
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
		var i = document.createElement('input');
		var w = document.createElement('div');
		var sb = null;
		c.className='cmd-container';
		w.className = 'cmd-window';
		w.style.height = s.height+'px';
		i.className = 'cmd-input';
		i.setAttribute('value', '> ');
		i.setAttribute('spellcheck', 'false');
		this.container = c;
		this.inputBox = i;
		this.consoleWindow = w;
		if(s.sandbox)
		{
			sb = document.createElement('iframe');
			sb.setAttribute('height', '0');
			sb.style.visibility='hidden';
		}
		this.sandbox = sb;
		this.getInputvalue = function(){return this.inputBox.value;};
		this.setInputvalue = function(v){this.inputBox.value = '> '+v;};
		this.appendResult=function(o)
		{
			var l = document.createElement('span');
			l.className = 'cmd-line';
			l.className += ' cmd-'+o.type;
			l.style.display='block';
			l.innerText= o.text;
			this.consoleWindow.insertBefore(l,this.consoleWindow.childNodes[0]);
		}
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
		if(v.sandbox != null)m.setScope(v.sandbox.contentWindow);
		m.getScope().console.log = function(m){if(m!=null && typeof m !== 'undefined')return m.toString();else if(m == null)return m; else return typeof m;};
		m.getScope().console.dir = function(o){if(typeof o === 'object'){var t = '';for (var k in o){if(o[k]!=null)t += k+' : '+o[k].toString()+'. ';else t += k+' : null. ';}return m.getScope().console.log(t);}else return m.getScope().console.log(o);}
		v.sandbox.contentWindow.parent=null;
		var inputMap = {38:'_upArrow',40:'_downArrow',13:'_enter'};
		v.inputBox.onkeydown = function(e)
		{
			if(e.keyCode == 38) e.preventDefault();
		}
		v.inputBox.onkeyup = function(e)
		{
			switch(inputMap[e.keyCode])
			{
				case '_enter':_enter(e);break;
				case '_upArrow':_upArrow(e);break;
				case '_downArrow':_downArrow(e);break;
				default:_keyUp(e);
			}
		};
		var _keyUp =function(e)
		{
			if(v.getInputvalue().substring(0,1) !='>')
				v.setInputvalue(v.getInputvalue());
		};
		var _enter = function(e)
		{
			var c = v.getInputvalue().replace(/^>(\s)*/,'');
			v.setInputvalue('');
			if(c.length>0)
				v.appendResult(m.processCommand(c));
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
			mainHints = setHints();
			var c = new controller(settings);
		}
	};
	return p;
})();