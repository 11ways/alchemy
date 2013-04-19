// Get some modules from the cache
var fs               = alchemy.use('fs'),
    path             = alchemy.use('path'),
    hawkejs          = alchemy.use('hawkejs'),
		prive            = {},
		_duplicateCheck  = {};

/**
 * Require all files in a certain directory.
 * Does not cache the files.
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Object}  options
 *                    .modular   Treat certain kinds of subdirectories different
 *                    .bootstrap Load the bootstrap.js file first
 *                    .app       Load an app_ file second
 *
 * @returns {Boolean}  If we were able to load in the directory
 */
alchemy.usePath = function usePath (dirPath, options) {
	
	var modularRegex = [], useOptions = {};
	
	if (typeof options == 'undefined') options = {};
	
	// Use different functions for different directories by default
	if (typeof options.modular == 'undefined') options.modular = true;
	
	if (typeof options._level == 'undefined') options._level = -1;
	
	options._level++;
	useOptions.level = options._level;
	
	// Ignore bootstrap file if it's a plugin, because it's already loaded
	if (options.plugin) {
		useOptions.bootstrap = false;
		modularRegex.push({regex: /bootstrap.js/, level: 0});
	}

	if (options.modular && options._level == 0) {
		
		prive.loadHelpers(dirPath, 'helper');
		prive.loadViews(dirPath, 'view');
		
		modularRegex.push(/^view$|^helper$|^plugins$/);
		
		useOptions.modular = true;
	}
	
	// Do not load /config subdirectories
	if (/\/config$/.exec(dirPath)) useOptions.recursive = false;
	

	pr('LEVEL ' + options._level + ' - Going to load path: '.bold.yellow + dirPath.bold.blue);

	
	useOptions.ignore = modularRegex;
	
	prive.usePath(dirPath, useOptions);
}

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
 * These helpers will be added to Hawkejs.
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}  dirPath    The path to load
 * 
 * @returns {Boolean}  If we were able to load in the directory
 */
prive.loadHelpers = function loadHelpers (dirPath) {
	
	var helperPath, helperFiles, filePath, fileCount;
	
	// Make a path out of all the arguments
	dirPath = alchemy.pathResolve.apply(null, arguments);
	
	if (typeof _duplicateCheck[dirPath] != 'undefined') return false;
	if(!fs.existsSync(dirPath)) {
		_duplicateCheck[dirPath] = false;
		return false;
	}
	
	try {
		
		helperFiles = fs.readdirSync(helperPath);

		for (fileCount in helperFiles) {
			try {
				filePath = path.resolve(dirPath, 'helper', helperFiles[fileCount]);
				hawkejs.addHelpers(filePath);
			} catch (err) {
				// Was unable to add the helper file
				log.warn('Was unable to add helper file ' + helperFiles[fileCount]);
			}
		}
		
		_duplicateCheck[dirPath] = true;
		
		return true;
		
	} catch (err) {
		
		_duplicateCheck[dirPath] = false;
		
		// Was unable to read in the helper directory
		log.warn('Was unable to read in helper directory ' + helperPath);
		
		return false;
	}
}

/**
 * Load in the view directory inside the given parent directory.
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}  dirPath    The path to load
 * 
 * @returns {Boolean}  If we were able to load in the directory
 */
prive.loadViews = function loadViews (dirPath) {
	log.error('Loading: ' + dirPath.red, {level: 2});
	// Make a path out of all the arguments
	dirPath = alchemy.pathResolve.apply(null, arguments);
	
	if (typeof _duplicateCheck[dirPath] != 'undefined') return false;
	if(!fs.existsSync(dirPath)) {
		_duplicateCheck[dirPath] = false;
		return false;
	}
	
	// Add the view dir to the sourceViewDirs, which will be used by hawkejs
	var fileStat = fs.lstatSync(dirPath);
	if (fileStat.isDirectory()) {
		alchemy._sourceViewDirs.push(dirPath);
		_duplicateCheck[dirPath] = true;
		return true;
	}
	
	_duplicateCheck[dirPath] = false;
	return false;
}

/**
 * Load in public directories.
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}  dirPath    The path to load
 * 
 * @returns {Boolean}  If we were able to load in the directory
 */
prive.loadPublic = function loadPublic (dirPath) {
	
	var publicPath = path.resolve(dirPath, 'public');
	
	if (typeof _duplicateCheck[dirPath] != 'undefined') return false;
	
	if (fs.existsSync(publicPath)) {
		alchemy.static('/', publicPath, 0);
		_duplicateCheck[dirPath] = true;
		return true;
	}
	
	_duplicateCheck[dirPath] = false;
	return false;
}


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
	
	if (typeof options == 'undefined') options = {};
	if (typeof options.ignore == 'undefined') options.ignore = false;
	if (typeof options.recursive == 'undefined') options.recursive = -1;
	if (typeof options._level == 'undefined') options._level = -1;
	
	// Load the bootstrap.js file first
	if (typeof options.bootstrap == 'undefined') options.bootstrap = true;
	
	// Load the app_ file afterwards
	if (typeof options.app == 'undefined') options.app = true;
	
	// Load the bootstrap file if wanted
	if (options.bootstrap) prive.loadBootstrap(dirPath);
	
	// Load the app_ file if wanted
	if (options.app) prive.loadRegexFile(dirPath, /^app_/);
	
	if (typeof options.modularParent == 'undefined') options.modularParent = options.modular;
	
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
		if (options.bootstrap && fileName == 'bootstrap.js') continue;
		if (options.app && /^app_/.exec(fileName)) continue;
		
		// Always ignore public paths
		if (fileName == 'public') continue;

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
 * Require an app-like folder structure.
 * Used for the core app folder, the regular app folder and plugins.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   pathToDirs      The path containing the dirs to load
 */
alchemy.useApp = function useApp (pathToDirs) {
	
	var pathArguments, bootstrapPath, path = alchemy.use('path');
	
	pathToDirs = alchemy.pathResolve.apply(null, arguments);
	
	var helperFiles, helperPath, fileCount, filePath;
	
	// If a bootstrap.js file exists inside the directory, load it first
	bootstrapPath = path.resolve(pathToDirs, 'config', 'bootstrap.js');

	if (typeof _duplicateCheck[bootstrapPath] == 'undefined') {
		if (fs.existsSync(bootstrapPath)) require(bootstrapPath);
		_duplicateCheck[bootstrapPath] = true;
	}
	
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
alchemy.usePlugin = function usePlugin (name, options) {
	
	if (typeof options == 'undefined') options = {};
	
	var pathToPlugin, pluginStat, isDir = false, fs = alchemy.use('fs');

	try {
		pathToPlugin = alchemy.pathResolve(PATH_ROOT, 'app', 'plugins', name);
		pluginStat = fs.lstatSync(pathToPlugin);
		isDir = pluginStat.isDirectory();
	} catch (err) {
		
	}
	
	if (isDir) {
	
		try {
			// Require the bootstrap.js file now, if it exists
			alchemy.useOnce(alchemy.pathResolve(pathToPlugin, 'bootstrap.js'));
		} catch (err) {
			// Do nothing: bootstrap files are not mandatory
		}
		
		alchemy._plugins[name] = options;
	} else {
		log.error('Plugin ' + name + ' directory does not exist!');
	}
}

/**
 * Load in a file only once
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   name      The name of the plugin (which is its path)
 * @param   {Object}   options   Options to pass to the plugin
 */
alchemy.useOnce = function useOne (dirPath) {
	
	dirPath = alchemy.pathResolve.apply(null, arguments);
	
	if (typeof _duplicateCheck[dirPath] == 'undefined') {
		
		try {
			require(dirPath);
			_duplicateCheck[dirPath] = true;
			log.verbose('Used file once: ' + dirPath, {level: 1});
		} catch (err) {
			_duplicateCheck[dirPath] = false;
			log.verbose('Failed to use file once: ' + dirPath, {level: 1});
		}
		
	} else {
		log.verbose('File not loaded, already used once: ' + dirPath, {level: 1});
	}
	
}