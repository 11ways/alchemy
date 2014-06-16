var continuation = alchemy.use('continuation'),
    mkdirp       = alchemy.use('mkdirp'),
    ncp          = alchemy.use('ncp').ncp,
    fs           = alchemy.use('fs'),
    path         = alchemy.use('path'),
    async        = alchemy.use('async'),
    child        = alchemy.use('child_process'),
    crypto       = alchemy.use('crypto'),
    mmm          = alchemy.use('mmmagic'),
    mongo        = alchemy.use('mongodb'),
    Url          = alchemy.use('url'),
    http         = alchemy.use('http'),
    Magic        = mmm.Magic,
    queues       = {},
    timers       = {},
    lpQueue      = 0,
    moduledirs;

/**
 * Schedule a function in a low priority queue
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Function}   fnc
 * @param    {Number}     wait   How long to wait before executing
 */
alchemy.lowPriority = function lowPriority(fnc, wait) {

	var start,
	    total,
	    exec,
	    lag  = alchemy.toobusy.lag();

	// Set the default wait to 20 ms
	if (!wait) {
		wait = 20;
	}

	// The function that will do the executing
	if (fnc.name == 'execLowPriority') {
		exec = fnc;
	} else {

		// Increase the low priority queue count
		lpQueue++;

		// When we queued the function
		start = Date.now();

		exec = function execLowPriority() {

			// Decrease the low priority queue count
			lpQueue--;

			// When we're executing the function
			total = Date.now() - start;
			fnc(total);
		};

		exec.rescheduled = 0;
	}

	if (lag > 0 || (lpQueue > 100 && exec.rescheduled < 3)) {

		exec.rescheduled++;

		wait = 500 + ~~(lpQueue/(4*exec.rescheduled));

		if (wait > 1000) {
			wait = 999;
		}

		if (exec.rescheduled > 3) {
			return exec();
		}

		setTimeout(function(){alchemy.lowPriority(exec)}, wait);
	} else {
		setTimeout(exec, wait);
	}
};

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
	alchemy.sputnik.after(['startServer', 'datasources', 'listening'], function() {
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
		
		pluginPath = alchemy.plugins[name].__path;
		
		// Create a new plugin entry
		Plugin[name] = {};
		
		alchemy.usePath(pluginPath, {plugin: true});
	}
};

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
	
	// Make sure the target object is appropriately set
	if (typeof target != 'object' || target === null) {

		// The target wasn't an object
		// If the to-be-injected object is an array, make the target an array
		if (Array.isArray(object)) {
			target = [];
		} else {
			target = {};
		}
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
 * Find out which model this field belongs to,
 * defaults to the given model
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.getFieldInfo = function getFieldInfo(path, model) {

	var pieces,
	    modelName,
	    first,
	    alias,
	    field;

	if (!path) {
		return {};
	}

	pieces = path.split('.');

	// Get the (possible) alias this field applies to
	first = pieces[0];

	// Cast the first piece to a model name
	modelName = first.modelName();

	// If the alias is a valid modelname, use it
	if (modelName == first || modelName.replace(/Datum$/, 'Data') == first) {
		alias = first;

		// Remove the first entry
		pieces.shift();
	} else {
		if (model) {
			alias = model.modelName;
		}
	}

	modelName = false;

	if (model) {
		// If this is an alias of an associated model, get its real modelname
		if (model.aliasAssociations && model.aliasAssociations[alias]) {
			modelName = model.aliasAssociations[alias].modelName;
		} else {
			modelName = alias;
		}
	}

	// Construct the field path based on the rest of the array
	field = pieces.join('.');

	return {
		modelName: modelName,
		alias: alias,
		field: field
	};
};

/**
 * Start all the loaded plugins
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String|Array}    prefix    The prefix to get
 * @param    {Object}          choices   The available choices
 * @param    {Boolean}         beStrict
 */
alchemy.pickTranslation = function pickTranslation(prefix, choices, beStrict) {

	var i, result;

	if (typeof prefix === 'function' && prefix.name == 'renderCallback') {
		prefix = Array.cast(prefix.prefix).concat(prefix.fallback);
	}

	if (typeof choices === 'string') {
		if (beStrict) {
			return;
		} else {
			return choices;
		}
	}

	if (Array.isArray(prefix)) {
		for (i = 0; i < prefix.length; i++) {
			
			result = this.pickTranslation(prefix[i], choices);

			// If the result has been found, and is filled in, use it
			if (result) {
				break;
			}
		}
	} else {
		result = choices[prefix];
	}

	return result;
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
 * Search for an object inside an array
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.queryArray = function queryArray(type, conditions, arr) {

	var results = [],
	    limit;

	if (typeof type == 'object') {
		arr = conditions;
		conditions = type;
		type = 'first';
	}

	if (type == 'first') {
		limit = 1;
	} else {
		limit = Infinity;
	}

	arr.filter(function(value, index) {

		var path,
		    test;

		// If we have as much results as we want, do nothing
		if (!(results.length < limit)) {
			return;
		}

		// Go over every condition (path => value)
		for (path in conditions) {
			if (alchemy.getObjectPath(value, path) == conditions[path]) {
				test = true;
			} else {
				test = false;
				break;
			}
		}

		if (test) {
			results.push(value);
		}
	});

	if (limit == 1) {
		return results[0];
	} else {
		return results;
	}
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

	if (!callback) {
		callback = function(){};
	}

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
alchemy.shared = function shared(name, type, value) {

	if (typeof type !== 'string') {
		value = type;
		type = 'object';
	}

	// Create it if it doesn't exist
	if (!sharedObjects[name]) {
		if (type === 'array' || type === 'Array') {
			sharedObjects[name] = value || [];
		} else {
			sharedObjects[name] = value || {};
		}
	}

	return sharedObjects[name];
};

/**
 * Return the key:items of the first object that are no longer in the second
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}
 * @param    {Object}
 *
 * @return   {Object}   The items in the first item that are not in the second
 */
alchemy.getDifference = function getDifference(first, second) {

	var key,
	    result = {};

	for (key in first) {

		// If the key in the first item doesn't show up in the second item,
		// add it to the result
		if (typeof second[key] === 'undefined') {
			result[key] = first[key];
		}
	}

	return result;
};

/**
 * Return the shared items
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}
 * @param    {Object}
 *
 * @return   {Object}   The items in the second item that are also in the first
 */
alchemy.getShared = function getShared(first, second) {

	var key,
	    result = {};

	for (key in first) {

		if (typeof second[key] !== 'undefined') {
			result[key] = second[key];
		}
	}

	return result;
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

	return extended;
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
 * See if values of one object occur in the other
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.areIn = function areIn(type, arr, obj) {

	var result = true,
	    values,
	    i;

	if (typeof type !== 'string') {
		obj = arr;
		arr = type;
		type = 'or';
	}

	type = type.toLowerCase();

	if (!Array.isArray(arr)) {
		values = Object.keys(arr);
	} else {
		values = arr;
	}

	for (i = 0; i < values.length; i++) {

		if (values[i] in obj) {
			if (type == 'or') {
				return true;
			}
		} else {
			if (type != 'or') {
				return false;
			}

			result = false;
		}
	}

	return result;
};

alchemy.ObjectId = mongo.ObjectID;

/**
 * Get an object id,
 * return false if no valid data was given (instead of throwing an error)
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.castObjectId = function castObjectId(obj) {

	var type = typeof obj;

	if (obj && type === 'object' && obj.constructor && obj.constructor.name === 'ObjectID') {
		return obj;
	} else if (type === 'string' && obj.isObjectId()) {
		return alchemy.ObjectId(obj);
	}

	return undefined;
};

/**
 * Get basic file information
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   filePath   A path to the file
 * @param    {Object}   options
 * @param    {Function} callback
 */
alchemy.getFileInfo = function getFileInfo(filePath, options, callback) {

	var tasks = {};

	if (typeof filePath !== 'string') {
		return callback(alchemy.createError('No valid file path given!'));
	}

	if (typeof options == 'function') {
		callback = options;
		options = {};
	}

	// Use sha1 as hashing default
	if (typeof options.hash == 'undefined') {
		options.hash = 'sha1';
	}

	// Prepare a function to calculate the hash if it's wanted
	if (options.hash) {
		tasks.hash = function getHash(next) {
			
			var checksum = crypto.createHash(options.hash),
			    stream;

			// Start reading the file
			stream = fs.ReadStream(filePath);

			// Update the checksum on data
			stream.on('data', function updateDigest(d) {
				checksum.update(d);
			});

			// When it's done, send the hexadecimal digest
			stream.on('end', function finalizeDigest() {
				next(null, checksum.digest('hex'));
			});
		};
	}

	// Prepare a function for the stat information
	tasks.stat = function getStat(next) {
		fs.stat(filePath, function returnStats(err, stats) {
			next(err, stats);
		});
	};

	// Get the filename
	tasks.filename = function getFilename(next) {
		var pieces = filePath.split('/');
		next(null, pieces[pieces.length-1]);
	};

	// Get the extension
	tasks.extension = function getExtension(next) {
		var pieces = filePath.split('.');
		next(null, pieces[pieces.length-1]);
	};

	// Get the mime type
	tasks.mimetype = function getMimetype(next) {

		var magic = new Magic(mmm.MAGIC_MIME_TYPE);

		magic.detectFile(filePath, function(err, result) {
			next(err, result);
		});
	};

	async.parallel(tasks, function(err, result) {

		var pieces;

		if (err) {
			return callback(err);
		}

		// Set the size
		result.size = result.stat.size;

		// Remove the stat object
		delete result.stat;

		// Get the name without extension
		pieces = result.filename.split('.');

		// Remove the last piece, the extension
		pieces.splice(pieces.length-1, 1);

		// Join again
		result.name = pieces.join('.');

		callback(null, result);
	});
};

/**
 * Copy a file
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   source     Origin path
 * @param    {String}   target     Target path
 * @param    {Function} cb
 */
alchemy.copyFile = function copyFile(source, target, cb) {

	var targetDir,
	    cmd;

	// We assume the last piece of the target is the file name
	// Split the string by slashes
	targetDir = target.split('/');

	// Remove the last piece
	targetDir.splice(targetDir.length-1, 1);

	// Join it again
	targetDir = targetDir.join('/');

	// Make sure the target directory exists
	alchemy.createDir(targetDir, function ensuredDir(err) {
		
		if (err) {
			return cb(err);
		}

		cmd = child.execFile('/bin/cp', ['--no-target-directory', source, target]);

		cmd.on('exit', function(code, signal) {

			if (code > 0) {
				cb('Failed to copy file');
			} else {
				cb(null);
			}
		});
	});
};

/**
 * Download a url to a temporary location
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {String}   url       The url
 * @param    {Object}   options
 * @param    {Function} callback  Callback
 */
alchemy.downloadFile = function downloadFile(url, options, callback) {

	var filepath,
	    options,
	    file,
	    res;

	if (typeof options === 'function') {
		callback = options;
		options = {};
	} else if (!options && typeof options !== 'object') {
		options = {};
	}

	if (typeof callback !== 'function') {
		callback = function(){};
	}

	// Construct a temporary file path
	filepath = '/tmp/' + alchemy.ObjectId();

	// Open the temp file
	file = fs.createWriteStream(filepath);

	// Initiate the get
	http.get(url, function(res) {

		if (res.statusCode == 404) {
			return callback(alchemy.createError('Path does not exist'));
		}

		if (options.type && res.headers['content-type']) {
			if (res.headers['content-type'].indexOf(options.type) < 0) {
				return callback(alchemy.createError('Received unexpected filetype'));
			}
		}

		// @todo: maybe implement content-type for downloaded file, too?
		// Because webservers can lie about filetypes

		// Pipe the response stream into the file
		res.pipe(file);

		// Close the file when finished and callback
		file.on('finish', function() {
			file.close(function() {
				callback(null, filepath);
			});
		});
	});
};

/**
 * Move a file
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   source     Origin path
 * @param    {String}   target     Target path
 * @param    {Function} cb
 */
alchemy.moveFile = function moveFile(source, target, cb) {

	// Copy the file first
	alchemy.copyFile(source, target, function doUnlink(err) {
		
		if (err) {
			return cb(err);
		}

		// Unlink the source file
		fs.unlink(source, function afterUnlink() {
			cb();
		});
	});
};

/**
 * Create a list, an array with extra methods
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.List = function List() {

	// Create a new array
	var result = Array.apply(Array, arguments);

	// Add our modified toString method
	result.toString = listToString;

	return result;
};

function listToString() {
	return this[0];
}

/**
 * Create an object that can be diffed
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   obj
 */
alchemy.preDiff = function preDiff(obj) {

	var result,
	    key;

	if (Array.isArray(obj)) {
		result = [];
	} else {
		result = {};
	}

	for (key in obj) {
		// Only allow own properties
		if (obj.hasOwnProperty(key)) {

			if (typeof obj[key] === 'object' && obj[key]) {

				switch (obj[key].constructor.name) {

					// Recurse objects
					case 'Object':
					case 'Array':
						result[key] = preDiff(obj[key]);
						break;

					// Copy simple objects
					case 'RegExp':
					case 'Date':
						result[key] = obj[key];
						break;

					case 'ObjectID':
						result[key] = '__diff_ObjectID_' + String(obj[key]);
						break;

					default:
						result[key] = String(obj[key]);

				}
			} else {
				result[key] = obj[key];
			}
		}
	}

	return result;
};

/**
 * Transform a diff delta object that can be saved in the database
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   obj
 */
alchemy.postDiff = function postDiff(obj) {

	var result,
	    key;

	if (Array.isArray(obj)) {
		result = [];
	} else {
		result = {};
	}

	for (key in obj) {
		
		if (typeof obj[key] === 'object' && obj[key]) {

			switch (obj[key].constructor.name) {

				// Recurse objects
				case 'Object':
				case 'Array':
					result[key] = postDiff(obj[key]);
					break;

				default:
					result[key] = obj[key];

			}
		} else if (typeof obj[key] === 'string') {

			if (obj[key].indexOf('__diff_ObjectID_') === 0) {
				result[key] = alchemy.castObjectId(obj[key].replace('__diff_ObjectID_', ''));
			} else {
				result[key] = obj[key];
			}
		} else {
			result[key] = obj[key];
		}
	}

	return result;
};

/**
 * Create an error,
 * a basic wrapper for new Error() (for now)
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   message
 *
 * @return   {Error}
 */
alchemy.createError = function createError(message) {
	return new Error(message);
};

/**
 * Get the current time in nanoseconds
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @return   {Number}
 */
alchemy.nanotime = function nanotime() {
	var hrTime = process.hrtime();
	return hrTime[0] * 1000000000 + hrTime[1];
};

/**
 * Start a very precise timer
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @return   {String}   name
 */
alchemy.time = function time(name) {

	// Prepare the entry first, before starting the clock
	if (!timers[name]) {
		timers[name] = {
			total: 0,
			first: alchemy.nanotime()
		};
	}

	// Start the timer
	timers[name].start = alchemy.nanotime();
};

/**
 * End a very precise timer,
 * output the duration since the start to the console
 * and return the duration too.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @return   {String}   name
 */
alchemy.timeEnd = function timeEnd(name, showNano, extra, iterated) {

	// Immediately stop the timer
	var stop   = alchemy.nanotime(),
	    diff   = stop - timers[name].start,
	    extra  = extra || '';

	if (iterated) {
		diff = diff / iterated;
	}

	// Increase the total
	timers[name].total += diff;

	if (!showNano) {
		diff = ~~(diff / 1000);
		console.log('Timer ' + name + ' in ' + diff + ' µs ' + extra);
	} else {
		console.log('Timer ' + name + ' in ' + diff + ' ns ' + extra);
	}

	return diff;
};

/**
 * Get the total of all the registered durations for the given name
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @return   {String}   name
 */
alchemy.timeTotal = function timeTotal(name, showNano) {

	var total = timers[name].total;

	if (!showNano) {
		total = ~~(total / 1000);
		console.log('Timer ' + name + ' total spent ' + total + ' µs');
	} else {
		console.log('Timer ' + name + ' total spent ' + total + ' ns');
	}

	return total;
};