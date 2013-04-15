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

var staticQueue = {};
var staticSet = false;

/**
 * Set a public path
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   publicPath   The public path
 * @param    {String}   localPath
 * @param    {Integer}  order        The order will only matter if called before ready
 */
alchemy.static = function _static (publicPath, localPath, order) {
	
	if (staticSet) {
		alchemy._app.use(publicPath, alchemy.express.static(localPath));
	} else {
		if (typeof order == 'undefined') order = 10;
		if (typeof staticQueue[order] == 'undefined') staticQueue[order] = [];
		staticQueue[order].push({publicPath: publicPath, localPath: localPath});
	}
}

/**
 * Actually link all the static stuff
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 */
alchemy.setStatic = function setStatic () {
	
	// Get all the keys of the object as an array
	var keys = Object.keys(staticQueue);
	
	// Sort the object keys
	keys.sort();
	
	for (var i in keys) {
		var q = staticQueue[keys[i]];
		
		for (var nr in q) {
			
			var p = q[nr];

			if (p.publicPath == '/') {
				alchemy._app.use('/public', alchemy.express.static(p.localPath));
			} else {
				alchemy._app.use(p.publicPath, alchemy.express.static(p.localPath));
			}
		}
	}
	
	staticSet = true;
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

	if (alchemy._associationsCreated) {
		if (typeof fnc == 'function') fnc();
		return true;
	}
	
	// Not connected yet, execute once we are!
	if (typeof fnc == 'function') alchemy.once('associationsCreated', fnc);
	
	return false;
}

/**
 * Require all files in a certain directory.
 * Does not cache the files.
 * 
 * Start with the 'app_' file if it's available.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   pathToFiles      The path to load
 *
 * @returns {boolean}  If we were able to load in the directory
 */
alchemy.usePath = function usePath (pathToFiles, options) {
	
	// Get some modules from the cache
	var fs = alchemy.use('fs');
	var path = alchemy.use('path');
	
	// Declarations
	var files = false, fileCount, fileName, fileStat, filePath, bootstrapPath;
	
	// Read in the directory file listing
	try {
		files = fs.readdirSync(pathToFiles);
	} catch (err) {
		log.warn('Unable to read out path ' + pathToFiles);
		return false;
	}
	
	// If a bootstrap.js file exists inside the directory, load it first
	bootstrapPath = path.resolve(pathToFiles, 'bootstrap.js');
	if (fs.existsSync(bootstrapPath)) require(bootstrapPath);
	
	// Look for a file starting with app_ first
	for (fileCount in files) {
		
		fileName = files[fileCount];
		
		// Require it if we found it
		if (!fileName.startsWith('app_')) continue;
			
		filePath = path.resolve(pathToFiles, fileName);
		fileStat = fs.lstatSync(filePath);
		
		// Skip directories
		if (fileStat.isDirectory()) continue;
		
		require(filePath);
		break; // Stop looking for another app_
	}
	
	for (fileCount in files) {
		
		fileName = files[fileCount];
		
		// Do not load app_ or bootstrap.js files in twice
		if (fileName.startsWith('app_') || fileName == 'bootstrap.js') continue;
		
		filePath = path.resolve(pathToFiles, fileName);
		fileStat = fs.lstatSync(filePath);
		
		// Recursively include directories
		if (fileStat.isDirectory()) {
			
			// Do not use views
			if (fileName == 'view') {
				alchemy._sourceViewDirs.push(filePath);
				continue;
			}
			
			alchemy.usePath(filePath);
			continue;
		}
		
		require(filePath);
	}
	
	return true;
}

/**
 * Require an app-like folder structure
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   pathToDirs      The path containing the dirs to load
 */
alchemy.useTree = function useTree (pathToDirs, options) {
	
	var path = alchemy.use('path');
	var fs = alchemy.use('fs');
	var hawkejs = alchemy.use('hawkejs');
	
	var helperFiles, helperPath, fileCount, filePath;
	
	// The subdirectories to load
	var appTree = ['lib', 'behavior', 'controller', 'component', 'model', 'utility'];
	
	for (var i = 0; i < appTree.length; i++) {
		alchemy.usePath(path.resolve(pathToDirs, appTree[i]));
	}
	
	// Add helpers
	try {
		helperPath = path.resolve(pathToDirs, 'helper');
		helperFiles = fs.readdirSync(helperPath);

		for (fileCount in helperFiles) {
			try {
				filePath = path.resolve(pathToDirs, 'helper', helperFiles[fileCount]);
				hawkejs.addHelpers(filePath);
			} catch (err) {
				// Was unable to add the helper file
				log.warn('Was unable to add helper file ' + helperFiles[fileCount]);
			}
		}
		
	} catch (err) {
		// Was unable to read in the helper directory
		log.warn('Was unable to read in helper directory ' + helperPath);
	}
	
	var viewPath = path.resolve(pathToDirs, 'view');
	
	if (fs.existsSync(viewPath)) {
		// Add the view dir to the sourceViewDirs, which will be used by hawkejs
		var fileStat = fs.lstatSync(viewPath);
		if (fileStat.isDirectory()) alchemy._sourceViewDirs.push(path.resolve(pathToDirs, 'view'));
	}
	
}

/**
 * Load in all the plugins
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   pluginsPath   The path to all the plugin directories
 */
alchemy.usePlugins = function usePlugins (pluginsPath) {
	
	var path = alchemy.use('path');
	var fs = alchemy.use('fs');
	
	var plugins = fs.readdirSync(pluginsPath);
	var dirName, pluginPath;
	
	for (var nr in plugins) {
		
		dirName = plugins[nr];
		
		// Create a new plugin entry
		Plugin[dirName] = {};
		
		pluginPath = path.resolve(pluginsPath, dirName)
		fileStat = fs.lstatSync(pluginPath);
		
		// Only include directories
		if (fileStat.isDirectory()) {
			alchemy.usePath(pluginPath);
		}
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
alchemy.clone = function(superObj, extension) {
	
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
	
	return null;
}

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

