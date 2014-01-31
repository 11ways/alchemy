var continuation = require('continuation');
    mkdirp = require('mkdirp'),
    ncp    = require('ncp').ncp,
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
alchemy.use = function use(moduleName, registerAs, options) {
	
	if (typeof registerAs == 'object') {
		options = registerAs;
		registerAs = false;
	}
	
	if (typeof options == 'undefined') options = {};
	if (typeof options.force == 'undefined') options.force = false;
	
	if (typeof alchemy.requirements[moduleName] == 'undefined' && !options.force) {
		try {
			alchemy.requirements[moduleName] = require(moduleName);
		} catch (err) {
			// Use level 5, which should display the correct location if the error
			// happened inside the required module.
			log.error('Failed to load module "' + moduleName.bold + '"', {level: 5, err: err});
		}
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
 * Replace placeholders in the text with values inside the object.
 * You can specify the delimiter, which is '%' by default.
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   text      The original text containing the placeholders
 * @param   {Object}   obj       The object containing the placeholder values
 * @param   {String}   delimiter The delimiter the placeholder is between
 *
 * @return  {String}   The text with the found placeholders replaced
 */
alchemy.fillPlaceholders = function fillPlaceholders(text, obj, delimiter) {

	if (typeof text != 'string' || typeof obj != 'object') {
		return text;
	}

	if (typeof delimiter == 'undefined') {
		delimiter = '%';
	}

	text = text.replace(RegExp(delimiter + '(\\w+)' + delimiter, 'g'), function(all, name) {
		return obj[name] || all;
	});

	return text;
};

/**
 * Do something if alchemy is ready
 * Right now it just waits for db connections
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Function} fnc   The function to execute
 *
 * @returns {Boolean}  If the function was executed immediately or not
 */
alchemy.ready = function ready (fnc) {
	alchemy.sputnik.after(['startServer', 'datasources'], function() {
		fnc();
	});
};

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
 * A function for deep cloning an object/array
 * 
 * @author   James Padolsey
 */
alchemy.cloneDeep = function cloneDeep(obj) {
	if (Object.prototype.toString.call(obj) === '[object Array]') {
		var out = [], i = 0, len = obj.length;
		for ( ; i < len; i++ ) {
			out[i] = arguments.callee(obj[i]);
		}
		return out;
	}

	if (typeof obj === 'object') {
		var out = {}, i;
		for ( i in obj ) {
			out[i] = arguments.callee(obj[i]);
		}

		return out;
	}

	return obj;
}

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
alchemy.cloneSafe = function cloneSafe(original) {
	return JSON.parse(JSON.stringify(original));
};

/**
 * Inject the properties of one object into another target object
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   target     The object to inject the extension into
 * @param   {Object}   extension  The object to inject
 *
 * @returns {Object}   Returns the injected target (which it also modifies byref)
 */
alchemy.inject = function inject(target, first, second) {
	
	var length = arguments.length, extension, key, i;
	
	// Go over every argument, other than the first
	for (i = 1; i <= length; i++) {
		extension = arguments[i];

		// If the given extension isn't valid, continue
		if (!extension) continue;
		
		// Go over every property of the current object
		for (key in extension) {
			target[key] = extension[key];
		}
	}
	
	return target;
};

/**
 * Merge multiple objects together, a recursive inject
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.merge = function merge(target, object) {

	var length = arguments.length,
	    extension,
	    type,
	    item,
	    key,
	    i;
	
	if (typeof target === 'undefined' || target === null) {
		target = {};
	}

	// Go over every argument, other than the first
	for (i = 1; i <= length; i++) {
		extension = arguments[i];

		// If the given extension isn't valid, continue
		if (!extension) continue;
		
		// Go over every property of the current object
		for (key in extension) {

			// Handle objects (objects, arrays, dates, ...)
			if (typeof extension[key] === 'object' && extension[key] !== null) {

				item = extension[key];

				// Check for arrays first
				if (Array.isArray(item)) {
					// If the target is already an array, replace them
					if (Array.isArray(target[key])) {

						// Delete everything from the original array
						target[key].length = 0;

						// Push all the new elements
						// We can't use concat because it doesn't work for certain elements
						target[key].push.apply(target[key], item);
					} else {
						target[key] = item.slice(0);
					}
				} else {

					if (item.constructor) {
						type = item.constructor.name;
					}
					
					if (type == 'Object') {
						target[key] = alchemy.merge(target[key], item);
					} else {
						// Just copy it
						// @todo: clone other types too!
						target[key] = item;
					}
				}

			} else {
				target[key] = extension[key];
			}
		}
	}
	
	return target;
};

/**
 * Create a path in an object.
 * Example: my.special.object would create an object like
 * {my: {special: {object}}}
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.objectPath = function objectPath(obj, path, value, skipLastEntry) {

	var argLength = arguments.length,
	    pieces,
	    here,
	    key,
	    end,
	    i;

	if (typeof obj == 'string') {
		value = path;
		path = obj;
		obj = {};
		argLength += 1;
	}

	// If no default end value is given, use a new object
	// Caution: undefined is also a valid end value,
	// so we check the arguments length for that
	if (typeof value == 'undefined' && argLength < 3) {
		value = {};
	}

	// Split the path into pieces
	pieces = path.split('.');

	// Set out current position
	here = obj;

	for (i = 0; i < pieces.length; i++) {
		key = pieces[i];

		// Is this the final piece?
		end = ((i+1) == pieces.length);

		if (end) {

			// Only set the last entry if we don't want to skip it
			if (!skipLastEntry) {
				here[key] = value;
			}
		} else if (typeof here[key] != 'object' || here[key] === null) {
			here[key] = {};
		}

		here = here[key];
	}

	return obj;
};

/**
 * Cast something to an object
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.objectify = function objectify(value) {

	var type = typeof value,
	    result = {},
	    key;

	if (type === 'string' || type === 'number') {
		result.value = value;
	} else if (type === 'object') {

		for (key in value) {

			if (value.hasOwnProperty(key)) {
				result[key] = value[key];
			}
		}
	}

	return result;
};

/**
 * Augment certain properties into an instance's context,
 * without modifying the original instance
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   original   The original instance/context
 * @param    {Object}   addition   The object to inject into it
 *
 * @return   {Object}
 */
alchemy.augment = function augment(original, addition) {
	
	var OriginalContextWrapper, augmentedContext, level, parent;
	
	// Create a new, empty function
	OriginalContextWrapper = function OriginalContextWrapper(){};

	// Set the original context object as its prototype
	OriginalContextWrapper.prototype = original;

	// Now create a new instance of it
	var augmentedContext = new OriginalContextWrapper();

	// If a (valid) addition is given, augment it
	if (typeof addition === 'object') {
		// Now inject the additions into the new context,
		// this will leave the original context untouched
		alchemy.inject(augmentedContext, addition);

		// Increase the augment level
		if (original.__augment__) {
			level = original.__augmentLevel;
			parent = original.__augment__;
		} else {
			level = 0;
			parent = false;
		}
		
		// Also add the additions one level deeper,
		// that way we can retrieve what was augmented
		alchemy.inject(augmentedContext, {__augment__: addition});

		// Set the current augment level
		augmentedContext.__augmentLevel = level + 1;

		// Set the augment parent
		augmentedContext.__augmentParent = parent;

		// Set the augment root, if it isn't set already
		if (!augmentedContext.__augmentRoot) {
			augmentedContext.__augmentRoot = original;
		}

		// Set properties which should not be inherited by other augmentations
		augmentedContext.__augmentNoInherit = {
			__augmentLevel: true,
			__augmentParent: true,
			__augmentNoInherit: true,
			__augmentRoot: true
		};

		// If this instance has an augmented() method, run it
		if (typeof augmentedContext.augmented === 'function') {
			augmentedContext.augmented(addition);
		}
	}
	
	// Finally return the augmentedContext
	return augmentedContext;
};

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
 * Overwrite an existing object without breaking references
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {object}   target   The object to overwrite
 * @param   {object}   obj      The object to replace it with
 */
alchemy.overwrite = function overwrite(target, obj) {

	var key;

	for (key in target) {
		delete target[key];
	}

	for (key in obj) {
		target[key] = obj[key];
	}
};

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
	    result,
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

			result = getArgumentFromObject(arg, options);

			if (result.found) {
				return result.value;
			}

			if (result.break) {
				break;
			}
		}

		// Go one deeper
		current = current.caller;
		loopCount++;
	}

	return undefined;
};

function getArgumentFromObject(arg, options, recurse) {

	if (typeof recurse == 'undefined') {
		recurse = 0;
	}
	
	var vet = true,
	    eqname,
	    result,
	    has,
	    key;

	result = {
		found: false,
		value: null,
		break: false
	};

	// See what properties it needs to equal
	if (typeof options.equal === 'object') {

		for (eqname in options.equal) {

			if (typeof arg !== 'undefined' && arg !== null && arg[eqname] === options.equal[eqname]) {
				vet = vet && true;
			} else {
				vet = vet && false;
				break;
			}
		}
	}

	// If vet is true, see what properties it needs to have
	if (vet) {
		for (has = 0; has < options.has.length; has++) {

			if (typeof arg[options.has[has]] !== 'undefined') {
				vet = vet && true;
			} else {
				vet = vet && false;
				break;
			}
		}
	}

	// If this argument has been vetted, return it!
	if (vet) {
		result.found = true;
		result.value = arg;
	}

	// If position is important, only do the one we asked for
	if (options.type === 'position') {
		result.break = true;
		return result;
	}

	if (!result.found && options.recurseArguments && typeof arg == 'object') {
		
		for (key in arg) {
			if (recurse <= options.max) {
				result = getArgumentFromObject(arg[key], options, recurse+1);

				if (result.found) {
					return result;
				}
			}
		}
	}

	return result;
}

/**
 * Get the render object from calling functions
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
alchemy.getRenderObject = function getRenderObject(start) {

	if (!start) {
		start = getRenderObject.caller.caller;
	} else {
		start = {arguments: start};
	}

	return alchemy.getArgument({
		// Needs the req property
		has: 'req',
		// Has a property name that equals to this
		equal: {name: 'renderCallback'},
		// Start with this function
		start: start,
		// Also look inside the arguments
		recurseArguments: true,
		type: false
	});
}

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
 *
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

var sharedObjects = {};

/**
 * Create a shared object
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   name   The name of the object to get
 * @param   {String}   type   The type to create (array or object)
 *
 * @return  {Object|Array}
 */
alchemy.shared = function shared(name, type) {

	// Create it if it doesn't exist
	if (!sharedObjects[name]) {
		if (type === 'array' || type === 'Array') {
			sharedObjects[name] = [];
		} else {
			sharedObjects[name] = {};
		}
	}

	return sharedObjects[name];
};

var createQueue = {};

/**
 * Create/extend a certain class
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}     type      The name of the class to extend
 * @param    {Function}   fnc       The class constructor
 * @param    {Function}   callback  The function to execute after this creation
 *
 * @return    {undefined}
 */
alchemy.create = function create(type, fnc, callback) {

	var extended;

	// If no type is given, we should extend the BaseClass (Nuclei)
	if (typeof type === 'function') {

		// If the fnc is also a function, it's actually the callback
		if (typeof fnc === 'function') {
			callback = fnc;
		}

		fnc = type;
		type = 'BaseClass';
	}

	// If this base type's class doesn't exist yet, queue it
	if (typeof alchemy.classes[type] === 'undefined') {

		// Make sure this queue exists
		if (typeof createQueue[type] === 'undefined') {
			createQueue[type] = [];

			alchemy.Nuclei.events.once('ClassExtended-' + type, function() {

				var i, total = createQueue[type].length;

				for (i = 0; i < total; i++) {
					alchemy.classes[type].extend(createQueue[type][i]);
				}

				// Clear out the queue
				delete createQueue[type];
			});
		}

		// Push this new type extension to the queue
		createQueue[type].push(fnc);

		return;
	}

	// Finally: do the extending
	extended = alchemy.classes[type].extend(fnc);

	if (callback) {
		callback(extended);
	}
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

// All compiled continuations go in here
var continuations = [];

/**
 * The error class for continuations
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
var continuationError = function continuationError(callerInfo, original) {

	var entry = original.stack[original.level||5],
	    file;

	if (entry) {
		file = entry.file;
	} else {
		file = '';
	}
	
	this.trace = callerInfo.text;
	this.name = callerInfo.name;
	this.line = callerInfo.line;
	this.message = 'Continuation - ' + file + '\n' + callerInfo.message + original.trace;
};

/**
 * Handle continuation errors
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy._handle_continuation_error = function _handle_continuation_error(err, id) {

	var obj = continuations[id],
	    match,
	    code,
	    line;

	match = err.stack.split('\n')[1];
	match = /\<anonymous\>\:(\d.*?)\:(\d.*?)\)/.exec(match);

	code = obj.compiledCode.split('\n');

	for (line = 0; line < code.length; line++) {

		if (line == (match[1]-1)) {
			code[line] = ('>>>>>  |  ' + code[line]).bold.red;
		} else {
			code[line] = '       |  ' + code[line];
		}
	}

	code = code.join('\n');

	err.message = err.message.bold.red + '\n' + code;

	throw new continuationError(err, obj.callerInfo);
};

/**
 * Create a continuation function
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Function}   fnc           The function to compile
 * @param    {Boolean}    alreadyEval   Already create the actual function,
 *                                      but this loses scope!
 *
 * @return   {String}     The code to pass to eval()
 */
alchemy.continuation = function createContinuationFunction(fnc, alreadyEval) {
	
	var name = fnc.name,
	    code = fnc.toString(),
	    obj  = {},
	    options,
	    result,
	    id;

	if (typeof alreadyEval == 'object') {
		options = alreadyEval;
		alreadyEval = false;
	} else {
		options = {};
	}

	if (options.alreadyEval) {
		alreadyEval = options.alreadyEval;
	}

	// Get the id of this new continuation
	id = (continuations.push(obj) -1);

	obj.id = id;

	if (options.callerInfo) {
		obj.callerInfo = options.callerInfo;
	} else {
		obj.callerInfo = log.getCallerInfo(6);
	}

	// If no name is given, create one ourselves
	if (!name) {
		name = ' anonymousContinuation';
		code = code.split('function');
		code[1] = name + code[1];
		code = code.join('function');
	}

	// Add try catch blacks
	code = code.split('{');
	code[1] = '\ntry {\n' + code[1];
	code = code.join('{');

	code = code.split('}');
	code[code.length-2] = code[code.length-2] + '\n} catch(err) {alchemy._handle_continuation_error(err, ' + id + ')}\n';
	code = code.join('}');

	obj.originalCode = code;
	
	code = continuation.compile(code);
	obj.compiledCode = code;

	if (alreadyEval) {
		eval('result = ' + code);
	} else {
		result = '(' + code + ')';
	}

	return result;
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

/**
 * Turn a string into a valid layout path
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.layoutify = function layoutify(paths) {

	var i;

	if (!Array.isArray(paths)) {
		paths = [paths];
	}

	for (i = 0; i < paths.length; i++) {
		paths[i] = 'layouts/' + paths[i];
	}

	return paths;
};

/**
 * Remove certain elements from an array
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
Object.defineProperty(Array.prototype, 'clean', {
	value: function clean(deleteValue) {
		for (var i = 0; i < this.length; i++) {
			if (this[i] === deleteValue) {
				this.splice(i, 1);
				i--;
			}
		}
		return this;
	}
});