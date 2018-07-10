'use strict';

// Get some modules from the cache
var fs               = alchemy.use('fs'),
    path             = alchemy.use('path'),
    module           = require('module'),
    original_wrap    = module.wrap,
    original_wrapper = module.wrapper.slice(0),
    original_resolve = module._resolveFilename,
    strict_wrapper   = original_wrapper[0] + '"use strict";',
    prive            = {},
    _duplicateCheck  = {},
    cwd              = process.cwd();

/**
 * Require all files in a certain directory.
 * Does not cache the files.
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Object}  options
 *                    .modular   Treat certain kinds of subdirectories different
 *                    .bootstrap Load the bootstrap.js file first
 *                    .app       Load an app_ file second
 *                    .weight    The weight, including views & less
 *
 * @returns {Boolean}  If we were able to load in the directory
 */
Alchemy.setMethod(function usePath(dirPath, options) {

	var modularRegex = [],
	    useOptions   = {};

	if (typeof options === 'undefined') options = {};

	// Use different functions for different directories by default
	if (typeof options.modular === 'undefined') options.modular = true;
	if (typeof options._level === 'undefined') options._level = -1;
	if (typeof options.weight !== 'number') options.weight = 10;

	options._level++;
	useOptions._level = options._level;

	// Always ignore .git directories
	modularRegex.push(/^.git$/);

	// Ignore bootstrap file if it's a plugin, because it's already loaded
	if (options.plugin) {
		useOptions.bootstrap = false;
		modularRegex.push({regex: /bootstrap.js/, level: 0});

		// Plugins have a higher weight
		// They're more important than the core, but less than the root
		if (typeof options.weight !== 'number') {
			options.weight = 15;
		}
	}

	if (options.modular && options._level == 0) {

		// Load Hawkejs view helper classes
		if (options.helpers !== false) {
			prive.loadHelpers(dirPath, 'helper');
		}

		// Load the custom element folder as helpers, too
		if (options.elements !== false) {
			prive.loadHelpers(dirPath, 'element');
		}

		// Let Hawkejs now about this view directory
		if (options.views !== false) {
			alchemy.addViewDirectory(path.resolve(dirPath, 'view'), options.weight);
		}

		// Main asset directory
		alchemy.addAssetDirectory(path.resolve(dirPath, 'assets'), options.weight);

		// Asset scripts
		if (options.scripts !== false) {
			alchemy.addScriptDirectory(path.resolve(dirPath, 'assets', 'scripts'), options.weight);
		}

		// Asset stylesheets
		if (options.less !== false) {
			alchemy.addStylesheetDirectory(path.resolve(dirPath, 'assets', 'stylesheets'), options.weight);

			// Also add the public folder, so less files in there can also be compiled
			alchemy.addStylesheetDirectory(path.resolve(dirPath, 'public'), options.weight);
		}

		// Images
		if (options.images !== false) {
			alchemy.addImageDirectory(path.resolve(dirPath, 'assets', 'images'), options.weight);
		}

		// public folders (going to /public/)
		if (options.public !== false) {
			alchemy.addPublicDirectory(path.resolve(dirPath, 'public'), options.weight);
		}

		// Root folders (/)
		if (options.root !== false) {
			alchemy.addRootDirectory(path.resolve(dirPath, 'root'), options.weight);
		}

		modularRegex.push(/^view$|^helper$|^helper_document$|^helper_model$|^helper_controller$|^helper_component$|^element$|^plugins$|^assets$/);

		useOptions.modular = true;
	}

	// Do not load /config subdirectories
	if (/\/config$/.exec(dirPath)) useOptions.recursive = false;

	useOptions.ignore = modularRegex;

	this._usePath(dirPath, useOptions);

	// Load record-related helpers, but only after loading the models
	if (options.modular && options._level == 0) {
		if (options.helpers !== false) {
			prive.loadHelpers(dirPath, 'helper_model');
			prive.loadHelpers(dirPath, 'helper_document');
			prive.loadHelpers(dirPath, 'helper_controller');
			prive.loadHelpers(dirPath, 'helper_component');
		}
	}
});

/**
 * Default _usePath options
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  0.5.0
 *
 * @type     {Object}
 */
Alchemy.setProperty('default_use_path_options', {
	ignore    : false,
	recursive : -1,
	_level    : -1,

	// Load the bootstrap.js file first
	bootstrap : true,

	// Load the app_ file afterwards
	app       : true
});

/**
 * Require all files in a certain directory.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.5.0
 *
 * @param   {String}   dir_path
 * @param   {Object}   options
 *
 * @returns {Boolean}  If we were able to load in the directory
 */
Alchemy.setMethod(function _usePath(dir_path, options) {

	var files;

	options = Object.assign({}, this.default_use_path_options, options);

	// Load the bootstrap file
	if (options.bootstrap) {
		prive.loadBootstrap(dir_path);
	}

	// Load the app_ file
	if (options.app) {
		prive.loadRegexFile(dir_path, /^app_/);
	}

	if (options.modularParent == null) {
		options.modularParent = options.modular;
	}

	// Up the recursive level by 1. Starting points are 0.
	options._level++;

	// Read in the directory file listing
	try {
		files = fs.readdirSync(dir_path);
	} catch (err) {
		return false;
	}

	let directories = [],
	    file_name,
	    file_path,
	    file_stat,
	    entry,
	    i;

	// Iterate over the directorie entries
	for (i = 0; i < files.length; i++) {
		file_name = files[i];

		// Skip hidden files or the "empty" file
		if (file_name[0] == '.' || file_name == 'empty') {
			continue;
		}

		// Skip bootstrap & app files if already loaded
		if (options.bootstrap && file_name === 'bootstrap.js') {
			continue;
		}

		if (options.app && file_name.startsWith('app_')) {
			continue;
		}

		// Always ignore public or node_modules paths
		if (file_name == 'node_modules' || file_name == 'public') {
			continue;
		}

		// See if this is in the options.ignore property
		if (prive.checkRegex(file_name, options.ignore, options._level)) {
			continue;
		}

		// Resolve the entire path
		file_path = path.resolve(dir_path, file_name);

		// Get information on this entry
		file_stat = fs.lstatSync(file_path);

		// Save directories for later, files come first
		if (file_stat.isDirectory()) {
			directories.push({
				parent_path : dir_path,
				name        : file_name,
				path        : file_path,
				stat        : file_stat
			});

			continue;
		}

		alchemy.useOnce(file_path);
	}

	// Exit early if we don't have to recursively add directories
	if (!options.recursive) {
		return true;
	}

	// Now do the directories
	for (i = 0; i < directories.length; i++) {
		entry = directories[i];

		// Do not include subfolders of the "config" directory
		// if it's a modular load
		if (options.modularParent && /\/config$/.exec(entry.parent_path)) {
			continue;
		}

		this._usePath(entry.path, {
			ignore        : options.ignore,
			recursive     : options.recursive - 1,
			_level        : options._level,
			modularParent : options.modularParent
		});
	}

	return true;
});

/**
 * Add an asset directory
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Number}  weight     The weighted importance [10]
 */
Alchemy.setMethod(function addAssetDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('asset.directories').push(dirPath, weight);
});

/**
 * Add a scripts directory
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Number}  weight     The weighted importance [10]
 */
Alchemy.setMethod(function addScriptDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('script.directories').push(dirPath, weight);
});

/**
 * Add a stylesheets directory
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Number}  weight     The weighted importance [10]
 */
Alchemy.setMethod(function addStylesheetDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('stylesheet.directories').push(dirPath, weight);
});

/**
 * Add an image directory
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Number}  weight     The weighted importance [10]
 */
Alchemy.setMethod(function addImageDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('images.directories').push(dirPath, weight);
});

/**
 * Add a public directory
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Number}  weight     The weighted importance [10]
 */
Alchemy.setMethod(function addPublicDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('public.directories').push(dirPath, weight);
});

/**
 * Add a root directory
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Number}  weight     The weighted importance [10]
 */
Alchemy.setMethod(function addRootDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('root.directories').push(dirPath, weight);
});

/**
 * Tell hawkejs to use this path to look for views.
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Number}  weight     The weighted importance [10]
 */
Alchemy.setMethod(function addViewDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.hawkejs.addViewDirectory(dirPath, weight);
});

/**
 * Load in the bootstrap file.
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param   {String}  dirPath    The path to load
 * 
 * @returns {Boolean}  If we were able to load in the file
 */
prive.loadBootstrap = function loadBootstrap(dirPath) {

	// If a bootstrap.js file exists inside the directory, load it first
	var bootstrapPath = path.resolve(dirPath, 'bootstrap.js');

	if (typeof _duplicateCheck[bootstrapPath] == 'undefined') {

		if (fs.existsSync(bootstrapPath)) {
			alchemy.makeNextRequireStrict();
			require(bootstrapPath);
		}

		_duplicateCheck[bootstrapPath] = true;
	}

	return _duplicateCheck[bootstrapPath];
};

/**
 * Load in a file by regex.
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}  dirPath    The path to load
 * @param   {RegExp}  pattern    The pattern to match
 * @param   {Boolean} multiple   Keep looking after finding one? (false)
 * 
 * @returns {Boolean}  If we were able to load in the file
 */
prive.loadRegexFile = function loadRegexFile (dirPath, pattern, multiple) {
	
	var files, fileCount, fileName, filePath, fileStat, result = false;
	
	if (!(pattern instanceof RegExp)) {
		log.error('Tried to load a file by passing invalid regex', {level: 1});
		return false;
	}
	
	try {
		files = fs.readdirSync(dirPath);
	} catch (err) {
		return false;
	}
	
	for (fileCount in files) {
		
		fileName = files[fileCount];
		
		// Continue to the next file if the patternd ooesn't match
		if (!pattern.exec(fileName)) continue;
		
		filePath = path.resolve(dirPath, fileName);
		fileStat = fs.lstatSync(filePath);
		
		// Skip directories
		if (fileStat.isDirectory()) continue;
		
		alchemy.useOnce(filePath);
		
		result = true;
		
		// Stop looking for more matches if multiple is false/undefined
		if (!multiple) break;
	}
	
	return result;
}

/**
 * Load in a directory containing helpers.
 * These helpers will be added to the main Hawkejs instance.
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Object}  options    Hawkejs#load options
 */
prive.loadHelpers = function loadHelpers(dirPath, options) {

	var helperFiles,
	    fileCount,
	    filePath,
	    name;

	// Make a path out of all the arguments
	dirPath = alchemy.pathResolve.apply(null, arguments);

	if (typeof _duplicateCheck[dirPath] != 'undefined') return false;

	if(!fs.existsSync(dirPath)) {
		_duplicateCheck[dirPath] = false;
		return false;
	}

	try {
		helperFiles = fs.readdirSync(dirPath);

		for (fileCount in helperFiles) {
			name = helperFiles[fileCount];

			// Don't require the "empty" file or any hidden files
			if (name == 'empty' || name[0] == '.') {
				continue;
			}

			try {
				filePath = path.resolve(dirPath, name);
				alchemy.hawkejs.load(filePath, options);
			} catch (err) {
				alchemy.printLog('warning', ['Unable to add helper file ' + name + '\n' + String(err), err], {err: err, level: -2});
				alchemy.printLog('warning', ['File was at', filePath], {err: err, level: -2});
			}
		}

		_duplicateCheck[dirPath] = true;

		return true;
	} catch (err) {

		_duplicateCheck[dirPath] = false;
		log.warn('Was unable to read in helper directory ' + dirPath);

		return false;
	}
};

/**
 * Check haystack for a regex
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param   {String}   haystack      The string to compare to
 * @param   {Array}    needles       An array of regexes
 * @param   {Number}   currentLevel  The current level we're on
 *
 * @returns {boolean}  False if no match was found, true if any matched
 */
prive.checkRegex = function checkRegex(haystack, needles, currentLevel) {

	var rexCount,
	    rex;

	if (typeof currentLevel == 'undefined') {
		currentLevel = -1;
	}

	// See if we need to ignore this file according to the given regex
	if (needles instanceof RegExp && needles.exec(haystack)) {
		return true;
	} else if (needles instanceof Array) {

		for (rexCount = 0; rexCount < needles.length; rexCount++) {

			rex = needles[rexCount];

			if (rex instanceof RegExp) {
				if (rex.exec(haystack)) return true;
			} else {
				if (rex.constructor.name == 'Object' && rex.regex instanceof RegExp) {
					if (rex.level < 0 || rex.level == currentLevel) {
						if (rex.regex.exec(haystack)) {
							return true;
						}
					}
				}
			}
		}
	}

	return false;
};

/**
 * Prepare a plugin for use.
 * This immediately executes the plugin's bootstrap.js file,
 * but the loading of the app tree happens later.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.3
 *
 * @param   {String}   name      The name of the plugin (which is its path)
 * @param   {Object}   options   Options to pass to the plugin
 */
Alchemy.setMethod(function usePlugin(name, options) {

	var possible_paths,
	    path_to_plugin,
	    plugin_stat,
	    is_dir = false;

	if (typeof alchemy.plugins[name] != 'undefined') {
		log.warn('Tried to load plugin "' + name + '" twice!');
		return;
	}

	if (options == null) {
		options = {};
	}

	// Create the possible paths to this plugin
	possible_paths = [];

	if (options.path_to_plugin) {
		possible_paths.push(options.path_to_plugin);
	} else {

		// Look for 'alchemy-' folders first, place where it'll be most likely
		if (name.startsWith('alchemy')) {
			possible_paths.push(alchemy.pathResolve(PATH_ROOT, 'node_modules', name.replace(/^alchemy-/, '')));
		} else {
			possible_paths.push(alchemy.pathResolve(PATH_ROOT, 'node_modules', 'alchemy-'+name));
		}

		// Then look for the name inside node_modules/
		possible_paths.push(alchemy.pathResolve(PATH_ROOT, 'node_modules', name));

		// It's also allowed to be inside the app/plugins folder
		possible_paths.push(alchemy.pathResolve(PATH_APP, 'plugins', name));
	}

	// Look for the plugin in every possible path
	possible_paths.some(function eachPath(value) {

		try {
			path_to_plugin = value;
			plugin_stat = fs.lstatSync(path_to_plugin);
			is_dir = plugin_stat.isDirectory() || plugin_stat.isSymbolicLink();

			// Stop the loop, path has been found
			return true;
		} catch (err) {
			// Try the next value
			return false;
		}
	});

	if (is_dir) {

		// Pass along the path the plugin is in
		options.__path = path_to_plugin;

		// Set the given options
		alchemy.plugins[name] = options;

		try {
			// Require the bootstrap.js file now, if it exists
			alchemy.useOnce(alchemy.pathResolve(path_to_plugin, 'bootstrap.js'), {throwError: true});
		} catch (err) {
			// Only throw an error when loading failed
			// because bootstrap files are not required
			if (err.message.indexOf('Cannot find') === -1) {
				throw err;
			}
		}
	} else {
		log.error('Could not find ' + JSON.stringify(name) + ' plugin directory');
	}
});

/**
 * Start all the loaded plugins
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 */
Alchemy.setMethod(function startPlugins() {

	var pluginPath,
	    name;

	for (name in alchemy.plugins) {

		pluginPath = alchemy.plugins[name].__path;

		if (pluginPath) {
			alchemy.usePath(pluginPath, {plugin: true});
		} else {
			log.error('Plugin path was undefined: ' + name);
		}
	}
});

/**
 * If a plugin hasn't been loaded yet, but it is required, die
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 */
Alchemy.setMethod(function requirePlugin(names) {

	var message, missing = '', name, i;

	if (!Array.isArray(names)) {
		names = [names];
	}

	for (i = 0; i < names.length; i++) {

		name = names[i];

		if (typeof alchemy.plugins[name] === 'undefined') {
			if (missing) missing += ', ';
			missing += name;
		}
	}

	if (missing) {
		message = 'These required plugin(s) are missing: ' + missing;
		die(message, {level: 2});
	}
});

/**
 * Load in a file only once
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 */
Alchemy.setMethod(function useOnce(dirPath, options) {

	if (typeof options == 'undefined') {
		options = {};
	}

	dirPath = alchemy.pathResolve.apply(null, arguments);

	if (dirPath.indexOf('.js') === -1) {
		//log.verbose('Skipped non JS file: ' + dirPath.split('/').pop());
		return false;
	}

	if (typeof _duplicateCheck[dirPath] === 'undefined') {

		// Make sure the next requirement uses strict
		alchemy.makeNextRequireStrict();

		try {
			require(dirPath);
			_duplicateCheck[dirPath] = true;
			//log.verbose('Used file once: ' + dirPath, {level: 1});
		} catch (err) {

			// Add the path to the file that failed to load,
			// this can be used when it's a syntax error
			// (It's hard to find the cause otherwise)
			err.file_path = dirPath;

			_duplicateCheck[dirPath] = false;

			if (options.throwError !== false) {
				throw err;
			}

			if (!options.silent) {
				// @todo: "Failed to use file once..." message doesn't get displayed
				log.error('Failed to use file once: ' + dirPath, {level: 5, err: err, extra: true});
			}
		}
	} else {
		//log.verbose('File not loaded, already used once: ' + dirPath, {level: 1});
	}
});

/**
 * Make the next `require` call strict
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.0
 * @version  0.4.0
 */
Alchemy.setMethod(function makeNextRequireStrict() {
	// Overwrite the original wrap method
	module.wrap = function wrap(script) {

		// Restore the original functions
		module.wrap = original_wrap;
		module._resolveFilename = original_resolve;

		// Add the strict wrapper for this requirement
		return strict_wrapper + script + module.wrapper[1];
	};

	// Overwrite the original _resolveFilename method
	module._resolveFilename = function _resolveFilename(request, parent, isMain) {
		try {
			return original_resolve(request, parent, isMain);
		} catch (err) {
			module.wrap = original_wrap;
			module._resolveFilename = original_resolve;
			throw err;
		}
	};

});