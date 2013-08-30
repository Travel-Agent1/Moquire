var moquire = (function(){

	var whenDone = function(){};
	var requirementsRemaining = 0;
	var requirementsLoaded = 0;
	var requireConfig = {};
	var contextCounter = 0;
	var contextCreatedEventListeners = [];
  
  
	function createContextName(){
		return "context" + (contextCounter++);
	}
	
	var moduleCounter = 0;
	function createModuleName(){
		return "module" + (moduleCounter++);
	}
	
	function typeOf(obj) {
		return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
	}
	
	function typeOfArray(array){
		return Array.prototype.map.call(array, typeOf);
	}
	
	function testArguments(args, expectedTypes){
		if(args.length != expectedTypes.length){
			return false;
		}
		var givenTypes = typeOfArray(args);
		
		return expectedTypes.every(function(expectedType, i){
			return expectedType == givenTypes[i];
		});
	}
	
	function extendConfig(source, name, map){
		var target = {
			context: name,
			map: map
		};
	
		for(var p in source){
			target[p] = source[p];
		}
		return target;
	}

	function createRequireContext(config, then){
		var requireContext = require.config(config);
		var doneContextCreatedEventListeners = 0;

		function done(){
			doneContextCreatedEventListeners++;
			if(doneContextCreatedEventListeners === contextCreatedEventListeners.length){
				then(requireContext);
			}
		}
		if(contextCreatedEventListeners.length == 0){
			then(requireContext);
		}else{
			contextCreatedEventListeners.forEach(function(listener){
				listener(requireContext, done);
			});
		}
	}
	
	function createModule(name, factory){
		define(name, [], factory);
	}
	
	function createMap(map, levelTwo){
		var twoLevels = false;
		for(var key in map){
			var val = map[key];
			if(typeof val === "function"){
				var name = createModuleName();
				createModule(name, val);
				map[key] = name;
			} else if (typeof val === "object"){
				twoLevels = true;
				map[key] = createMap(val, true);
			}
		}
		if(twoLevels === false && levelTwo !== true){
			map = {'*': map};
		}
		return map;
	}


    function requirementLoaded(){
      requirementsLoaded++;
      if(requirementsLoaded == requirementsRemaining && typeof whenDone == "function"){
        whenDone();
      }
    }

	function callRequire(method, dependencies, factory){
		requirementsRemaining++;
		method(dependencies, function(){
			factory.apply(this, arguments);
			requirementLoaded();
		});
	}
	
	function requireWithMap(map, dependencies, factory){
		var config = extendConfig(requireConfig, createContextName(), createMap(map));

		createRequireContext(config, function(mappedRequire){
			callRequire(mappedRequire, dependencies, factory);
		});
	}
	
	function requireWithoutMap(dependencies, factory){
		callRequire(require, dependencies, factory);
	}
	
	function moquire(arg0, arg1, arg2){
		
		if(testArguments(arguments, ["array", "function"])){
			requireWithoutMap(arg0, arg1);
		}else if(testArguments(arguments, ["object", "array", "function"])){
			requireWithMap(arg0, arg1, arg2);
		}else{
			throw new Error("could not moquire\n" + 
			"Invalid argument types (" + typeOfArray(arguments).join(", ") + ")\n" + 
			"expected (array, function) or (object, array, function)");
		}
	}
	
	moquire.config = function(config){
		requireConfig = config;
		return config;
	};

	moquire.then = function(callback){
		if(requirementsRemaining != 0 && requirementsRemaining == requirementsLoaded){
			callback();
		}else{
			whenDone = callback;
		}
	}
  
	moquire.onContextCreated = function(listener){
		contextCreatedEventListeners.push(listener);
	};

	moquire.onContextCreated.dont = function(listener){
		var index = contextCreatedEventListeners.indexOf(listener);

		if(index >= 0){
			contextCreatedEventListeners.splice(index, 1);
		}
	};
	
	return moquire;

})();