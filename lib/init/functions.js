var ncp    = require('ncp').ncp,
    mkdirp = require('mkdirp'),
    queues = {};

/**
 * A wrapper function for requiring modules
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   moduleName     The name/path of the module to load
 * @param   {object}   options        Extra options
 *                     options.force  Force a new requirement and do not cache
 *
 * @returns {object}   The result of the require()
 */
alchemy.use = function use (moduleName, registerAs, options) {
	
	if (typeof registerAs == 'object') {
		options = registerAs;
		registerAs = false;
	}
	
	if (typeof options == 'undefined') options = {};
	if (typeof options.force == 'undefined') options.force = false;
	
	if (typeof alchemy.requirements[moduleName] == 'undefined' && !options.force) {
		alchemy.requirements[moduleName] = require(moduleName);
	}
	
	if (registerAs) alchemy.modules[registerAs] = alchemy.requirements[moduleName];
	
	// If we want to force a new requirement
	if (options.force) {
		return require(moduleName);
	} else {
		return alchemy.requirements[moduleName];
	}
}

/**
 * Do something if alchemy is ready
 * Right now it just waits for db connections
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {function\ fnc   The function to execute
 *
 * @returns {boolean}  If the function was executed immediately or not
 */
alchemy.ready = function ready (fnc) {
	
	alchemy.sputnik.after(['startServer', 'datasources'], function() {
		fnc();
	});

}

var _duplicateCheck = {};

/**
 * Resolve the provided arguments to a useable path string.
 * Only used strings, discards objects.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   pathToDirs      The path containing the dirs to load
 */
alchemy.pathResolve = function pathResolve (pathToDirs) {
	
	var i, path = alchemy.use('path');
	
	// If there are multiple arguments, resolve them into one path
	if (arguments.length > 1) {
		
		pathArguments = [];
		
		for (i in arguments) {
			if (typeof arguments[i] == 'string') pathArguments.push(arguments[i]);
		}
		
		if (pathArguments.length > 1) {
			pathToDirs = path.resolve.apply(null, pathArguments);
		}
	}
	
	return pathToDirs;
}

/**
 * Start all the loaded plugins
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.startPlugins = function startPlugins () {
	
	var path = alchemy.use('path');
	var fs = alchemy.use('fs');
	
	var name, pluginPath;
	
	for (name in alchemy.plugins) {
		
		pluginPath = alchemy.pathResolve(APP_ROOT, 'plugins', name);
		
		// Create a new plugin entry
		Plugin[name] = {};
		
		pr('Using plugin path: ' + pluginPath.blue.bold);
		alchemy.usePath(pluginPath, {plugin: true});
	}
}

/**
 * Copyright Andrée Hansson, 2010
 * Use it however you want, attribution would be nice though.
 * Website:        http://andreehansson.se/
 * GMail/Twitter:  peolanha
 *
 * update 4: Leonardo Dutra, http://twitter.com/leodutra
 *
 * @author   Andrée Hansson
 * @since    2010
 *
 * @param   {object}   superObj
 * @param   {object}   extension
 *
 * @returns {object}   A deeply cloned version of the extension object
 */
alchemy.clone = function clone(superObj, extension) {

	// Overload support
	if (!extension) return clone({}, superObj);
	
	if (superObj && extension) {
		
		var deep = function() {}; // prepare sword
		
		deep.prototype = superObj; // hold it
		
		superObj = new deep; // pull it
		
		return (deep = function(o, ext) { // concentrate
			var k;
			
			for (k in ext) {
				o[k] = typeof ext[k] === 'object' && ext[k] ? deep({}, ext[k]) : ext[k];
			}
			
			return o;
		})(superObj, extension); // push it deep, slicing
	}
	
	return superObj;
};

/**
 * This clone function can be used for simple objects
 * that need to be JSONified at a later point.
 * Do note: this will already remove functions.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   original   The original simple object
 * 
 * @return   {Object}              The JSON-cloned object
 */
alchemy.cloneSafe = function cloneSafe (original) {
	return JSON.parse(JSON.stringify(original));
};

/**
 * Inject the properties of one object into another target object
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {object}   target     The object to inject the extension into
 * @param   {object}   extension  The object to inject
 *
 * @returns {object}   Returns the injected target (which it also modifies byref)
 */
alchemy.inject = function inject (target, first, second) {
	
	var length = arguments.length;
	
	// Go over every argument, other than the first
	for (var i = 1; i <= length; i++) {
		var extension = arguments[i];
		
		// Go over every property of the current object
		for (var i in extension) {
			target[i] = extension[i];
		}
	}
	
	return target;
}

/**
 * See if an object is empty or not
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {object}   o     The object to test
 *
 * @returns {boolean}
 */
alchemy.isEmpty = function isEmpty (o) {

  for(var p in o) {
    if (o[p] != o.constructor.prototype[p])
      return false;
  }
  return true;
}

/**
 * Recursively replace keys and/or values in an object/array
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {object|array}   haystack     The haystack
 * @param   {string}         needle       The thing to look for
 * @param   {mixed}          replacement  The replacement
 * @param   {object}         options      Optional options
 *                            .keys       If the key matches the `needle`,
 *                                        replace the value with `replacement`
 *                                        Default: TRUE
 *                                        
 *                            .values     If the value matches the `needle`,
 *                                        replace it with `replacement`
 *                                        Default: TRUE
 *                                        
 *                            .replaceKey If the key matches the `needle`,
 *                                        replace the key with `replacement`
 *                                        Default: FALSE
 *
 * @returns {object|array}
 */
alchemy.replace = function replace (haystack, needle, replacement, options) {

	if (typeof options == 'undefined') options = {};
	if (typeof options.keys == 'undefined') options.keys = true;
	if (typeof options.replaceKey == 'undefined') options.replaceKey = false;
	if (typeof options.values == 'undefined') options.values = true;
	
	var result, _value, replaced;
	
	if (haystack instanceof Array) {
		result = [];
	} else {
		result = {};
	}
	
	for (var i in haystack) {
		
		replaced = false;
		
		if (haystack[i] == needle && options.values) {
			_value = replacement;
			replaced = true;
		} else {
			_value = haystack[i];
		}
		
		if (i == needle && options.keys) {
			if (options.replaceKey) {
				result[replacement] = _value;
			} else {
				result[i] = replacement;
			}
		} else {
			if (haystack[i] instanceof Array || haystack[i] instanceof Object) {
				result[i] = alchemy.replace(haystack[i], needle, replacement, options);
			} else {
				result[i] = _value;
			}
		}
		
	}
  
	return result;
}

/**
 * Retrieve a specific argument from the callchain
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   options     Definition of the argument to find
 *
 * @returns {Mixed}
 */
alchemy.getArgument = function getArgument(options) {

	if (typeof options === 'undefined') options = {};
	if (typeof options.type === 'undefined') options.type = 'position';
	if (typeof options.max === 'undefined') options.max = 4;
	if (typeof options.position === 'undefined') options.position = 0;
	if (typeof options.has === 'undefined') options.has = [];
	else if (typeof options.has === 'string') options.has = [options.has];
	if (typeof options.start === 'undefined') options.start = getArgument.caller.caller;

	// Get this function's caller's caller
	var current   = options.start,
	    render    = false,
	    maximum   = options.max,
	    loopCount = 0,
	    eqname,
	    vet,
	    has,
	    arg,
	    i;

	// If a current function is available and we stick to the loop limit
	while (current && loopCount < options.max) {

		// Go over every argument
		for (i = options.position; i < current.arguments.length; i++) {

			vet = true;
			arg = current.arguments[i];

			// See what properties it needs to equal
			if (typeof options.equal === 'object') {

				for (eqname in options.equal) {

					if (arg[eqname] === options.equal[eqname]) {
						vet = vet && true;
					} else {
						vet = vet && false;
						break;
					}
				}
			}

			// If vet is false, continue to the next argument
			if (!vet) continue;

			// See what properties it needs to have
			for (has = 0; has < options.has.length; has++) {

				if (typeof arg[options.has[has]] !== 'undefined') {
					vet = vet && true;
				} else {
					vet = vet && false;
					break;
				}
			}

			// If this argument has been vetted, return it!
			if (vet) {
				return arg;
			}

			// If position is important, only do the one we asked for
			if (options.type === 'position') break;
		}

		// Go one deeper
		current = current.caller;
		loopCount++;
	}

	return undefined;
};

/**
 * Copy a directory
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   source     The source path
 * @param   {String}   target     The target path
 * @param   {Function} callback   The function to call when done
 */
alchemy.copyDir = function copyDir(source, target, callback) {

	// Create the target directory if needed
	alchemy.createDir(target, function(err, made) {
		ncp(source, target, callback);
	});
};

/**
 * Create a directory
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   target     The target path
 * @param   {Function} callback   The function to call when done
 */
alchemy.createDir = function createDir(target, callback) {
	mkdirp(target, callback);
};

/**
 * Queue (asynchronous) functions to run after each other,
 * without the need for one final callback
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.queueFunction = function queueFunction(queueName, fnc, callback) {

	if (typeof queueName === 'function') {
		callback = fnc;
		fnc = queueName;
		queueName = 'AlchemyMainQueue';
	}

	var entry = {fnc: fnc, callback: callback},
	    queue;

	if (typeof queues[queueName] === 'undefined') queues[queueName] = {
		entries: [],
		busy: false
	};

	queue = queues[queueName];
	queue.entries.push(entry);

	doQueue(queueName);

};

/**
 * Execute a specific function queue
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
function doQueue(queueName) {

	var i, queueName, queue, entry;

	queue = queues[queueName];

	// If the queue isn't busy and there are functions waiting to be
	// executed, perform the first one
	if (!queue.busy && queue.entries.length) {

		// Close around the queue object
		(function(queue, queueName) {

			// Set the queue as busy
			queue.busy = true;

			// Get the first entry inside this queue
			entry = queue.entries.shift();

			entry.fnc(function queuedFncCallback() {

				// The queue can be freed up again
				queue.busy = false;

				// Make it do the next function
				doQueue(queueName);

				// Perform the callback, and pass the arguments
				if (entry.callback) entry.callback.apply(null, arguments);

			});

		}(queue, queueName));

	}

}

/**
 * Execute all the function queues
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
function doQueues() {
	for (queueName in queues) {
		doQueue(queueName);
	}
}

alchemy._q = queues;