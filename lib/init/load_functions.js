// Get some modules from the cache
var fs               = alchemy.use('fs'),
    path             = alchemy.use('path'),
    prive            = {},
    _duplicateCheck  = {},
    cwd              = process.cwd();

/**
 * Require all files in a certain directory.
 * Does not cache the files.
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
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
alchemy.usePath = function usePath(dirPath, options) {

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

		// Let Hawkejs now about this view directory
		if (options.views !== false) {
			alchemy.addViewDirectory(path.resolve(dirPath, 'view'), options.weight);
		}

		// Asset scripts
		if (options.scripts !== false) {
			alchemy.addScriptDirectory(path.resolve(dirPath, 'assets', 'scripts'));
		}

		// Asset stylesheets
		if (options.less !== false) {
			alchemy.addStylesheetDirectory(path.resolve(dirPath, 'assets', 'stylesheets'), options.weight);

			// Also add the public folder, so less files in there can also be compiled
			alchemy.addStylesheetDirectory(path.resolve(dirPath, 'public'), options.weight);
		}

		// public folders (going to /public/)
		if (options.public !== false) {
			alchemy.addPublicDirectory(path.resolve(dirPath, 'public'), options.weight);
		}

		// Root folders (/)
		if (options.root !== false) {
			alchemy.addRootDirectory(path.resolve(dirPath, 'root'), options.weight);
		}

		modularRegex.push(/^view$|^helper$|^plugins$|^assets$/);

		useOptions.modular = true;
	}

	// Do not load /config subdirectories
	if (/\/config$/.exec(dirPath)) useOptions.recursive = false;

	useOptions.ignore = modularRegex;

	prive.usePath(dirPath, useOptions);
};

/**
 * Add a scripts directory
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Number}  weight     The weighted importance [10]
 */
alchemy.addScriptDirectory = function addScriptDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('script.directories').push(dirPath, weight);
};

/**
 * Add a stylesheets directory
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Number}  weight     The weighted importance [10]
 */
alchemy.addStylesheetDirectory = function addStylesheetDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('stylesheet.directories').push(dirPath, weight);
};

/**
 * Add a public directory
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Number}  weight     The weighted importance [10]
 */
alchemy.addPublicDirectory = function addPublicDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('public.directories').push(dirPath, weight);
};

/**
 * Add a root directory
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Number}  weight     The weighted importance [10]
 */
alchemy.addRootDirectory = function addRootDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.shared('root.directories').push(dirPath, weight);
};

/**
 * Tell hawkejs to use this path to look for views.
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Number}  weight     The weighted importance [10]
 */
alchemy.addViewDirectory = function addViewDirectory(dirPath, weight) {

	if (typeof weight !== 'number') {
		weight = 10;
	}

	alchemy.hawkejs.addViewDirectory(dirPath, weight);
};

/**
 * Load in the bootstrap file.
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}  dirPath    The path to load
 * 
 * @returns {Boolean}  If we were able to load in the file
 */
prive.loadBootstrap = function loadBootstrap (dirPath) {
	
	// If a bootstrap.js file exists inside the directory, load it first
	var bootstrapPath = path.resolve(dirPath, 'bootstrap.js');
	
	if (typeof _duplicateCheck[bootstrapPath] == 'undefined') {
		if (fs.existsSync(bootstrapPath)) require(bootstrapPath);
		_duplicateCheck[bootstrapPath] = true;
	}
	
	return _duplicateCheck[bootstrapPath];
}

/**
 * Load in a file by regex.
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
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
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Object}  options    Hawkejs#load options
 */
prive.loadHelpers = function loadHelpers(dirPath, options) {

	var helperFiles,
	    fileCount,
	    filePath;

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
			try {
				filePath = path.resolve(dirPath, helperFiles[fileCount]);
				alchemy.hawkejs.load(filePath, options);
			} catch (err) {
				log.warn('Was unable to add helper file ' + helperFiles[fileCount] + '\n'+err);
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
 * Require all files in a certain directory.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   pathToFiles      The path to load
 *
 * @returns {boolean}  If we were able to load in the directory
 */
prive.usePath = function usePath (dirPath, options) {
	
	// Declarations
	var files = false, fileCount, fileName, fileStat,
	    filePath, bootstrapPath, doFile, rexCount, rex;
	
	if (typeof options === 'undefined') options = {};
	if (typeof options.ignore === 'undefined') options.ignore = false;
	if (typeof options.recursive === 'undefined') options.recursive = -1;
	if (typeof options._level === 'undefined') options._level = -1;
	
	// Load the bootstrap.js file first
	if (typeof options.bootstrap === 'undefined') options.bootstrap = true;
	
	// Load the app_ file afterwards
	if (typeof options.app === 'undefined') options.app = true;
	
	// Load the bootstrap file if wanted
	if (options.bootstrap) prive.loadBootstrap(dirPath);
	
	// Load the app_ file if wanted
	if (options.app) prive.loadRegexFile(dirPath, /^app_/);
	
	if (typeof options.modularParent === 'undefined') options.modularParent = options.modular;
	
	// Up the recursive level by 1. Starting points are 0.
	options._level++;
	
	// Read in the directory file listing
	try {
		files = fs.readdirSync(dirPath);
	} catch (err) {
		//log.warn('Unable to read out path ' + pathToFiles);
		return false;
	}
	
	for (fileCount in files) {
		
		doFile = true;
		
		fileName = files[fileCount];
		
		// Skip bootstrap & app files if already loaded
		if (options.bootstrap && fileName === 'bootstrap.js') continue;
		if (options.app && /^app_/.exec(fileName)) continue;
		
		// Always ignore public paths
		if (fileName === 'public') continue;

		// Always ignore node_modules
		if (fileName === 'node_modules') continue;

		if (prive.checkRegex(fileName, options.ignore, options._level)) continue;
		
		filePath = path.resolve(dirPath, fileName);
		fileStat = fs.lstatSync(filePath);

		// Recursively include directories if wanted
		if (fileStat.isDirectory()) {
			
			// Do not include config subfolders if modular
			if (options.modularParent && /\/config$/.exec(dirPath)) continue;

			if (options.recursive) {
				prive.usePath(filePath, {ignore: options.ignore,
				                         recursive: options.recursive-1,
				                         _level: options._level,
																 modularParent: options.modularParent});
				continue;
			}
			
			// If we do not want to use this path, do not require it later
			doFile = false;
		}

		if (doFile) alchemy.useOnce(filePath);
	}
	
	return true;
}

/**
 * Check haystack for a regex
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   haystack      The string to compare to
 * @param   {Array}    needles       An array of regexes
 * @param   {Number}   currentLevel  The current level we're on
 *
 * @returns {boolean}  False if no match was found, true if any matched
 */
prive.checkRegex = function checkRegex (haystack, needles, currentLevel) {
	
	var rexCount;
	
	if (typeof currentLevel == 'undefined') currentLevel = -1;
	
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
}

/**
 * Prepare a plugin for use.
 * This immediately executes the plugin's bootstrap.js file,
 * but the loading of the app tree happens later.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   name      The name of the plugin (which is its path)
 * @param   {Object}   options   Options to pass to the plugin
 */
alchemy.usePlugin = function usePlugin(name, options) {

	var possiblePaths,
	    pathToPlugin,
	    pluginStat,
	    isDir = false,
	    fs = alchemy.use('fs'),
	    foundPath = false;

	if (typeof alchemy.plugins[name] != 'undefined') {
		log.warn('Tried to load plugin "' + name.bold + '" twice!');
		return;
	}
	
	if (typeof options === 'undefined') options = {};

	// Create the possible paths to this plugin
	possiblePaths = [];

	// Alwyas look inside app/plugins/ first
	possiblePaths.push(alchemy.pathResolve(APP_ROOT, 'plugins', name));

	// Inside node_modules/
	possiblePaths.push(alchemy.pathResolve(PATH_ROOT, 'node_modules', name));

	if (name.startsWith('alchemy')) {
		possiblePaths.push(alchemy.pathResolve(PATH_ROOT, 'node_modules', name.replace(/^alchemy-/, '')));
	} else {
		possiblePaths.push(alchemy.pathResolve(PATH_ROOT, 'node_modules', 'alchemy-'+name));
	}

	// Look for the plugin in every possible path
	possiblePaths.filter(function(value) {

		if (foundPath) {
			return;
		}

		try {
			pathToPlugin = value;
			pluginStat = fs.lstatSync(pathToPlugin);
			isDir = pluginStat.isDirectory();
		} catch(err) {
			// This was not what we were looking for!
			return;
		}

		foundPath = true;
	});
	
	if (isDir) {

		// Pass along the path the plugin is in
		options.__path = pathToPlugin;

		// Set the given options
		alchemy.plugins[name] = options;

		try {
			// Require the bootstrap.js file now, if it exists
			alchemy.useOnce(alchemy.pathResolve(pathToPlugin, 'bootstrap.js'), {throwError: true});
		} catch (err) {
			// Only throw an error when it has not been found
			// because bootstrap files are not required
			if (err.message.indexOf('Cannot find') === -1) {
				throw err;
			}
		}
		
	} else {
		log.error('Plugin ' + name + ' directory does not exist!');
	}
};

/**
 * Start all the loaded plugins
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
 */
alchemy.startPlugins = function startPlugins() {

	var pluginPath,
	    name;

	for (name in alchemy.plugins) {

		pluginPath = alchemy.plugins[name].__path;

		// Create a new plugin entry
		Plugin[name] = {};

		if (pluginPath) {
			alchemy.usePath(pluginPath, {plugin: true});
		} else {
			log.error('Plugin path was undefined: ' + name);
		}
	}
};

/**
 * If a plugin hasn't been loaded yet, but it is required, die
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.requirePlugin = function requirePlugin(names) {

	var message, missing = '', name, i;

	if (!Array.isArray(names)) {
		names = [names];
	}

	for (i = 0; i < names.length; i++) {

		name = names[i];

		if (typeof alchemy.plugins[name] === 'undefined') {
			if (missing) missing += ', ';
			missing += name.bold;
		}
	}

	if (missing) {
		message = 'These required plugin(s) are missing: ' + missing;
		die(message, {level: 2});
	}
};

/**
 * Load in a file only once
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
 */
alchemy.useOnce = function useOnce(dirPath, options) {

	if (typeof options == 'undefined') {
		options = {};
	}
	
	dirPath = alchemy.pathResolve.apply(null, arguments);
	
	if (dirPath.indexOf('.js') === -1) {
		//log.verbose('Skipped non JS file: ' + dirPath.split('/').pop());
		return false;
	}

	if (typeof _duplicateCheck[dirPath] === 'undefined') {
		
		try {
			require(dirPath);
			_duplicateCheck[dirPath] = true;
			//log.verbose('Used file once: ' + dirPath, {level: 1});
		} catch (err) {
			_duplicateCheck[dirPath] = false;

			if (options.throwError !== false) {
				throw err;
			}

			if (!options.silent) {
				log.error('Failed to use file once: ' + dirPath, {level: 5, err: err, extra: true});
			}
		}
	} else {
		//log.verbose('File not loaded, already used once: ' + dirPath, {level: 1});
	}
};