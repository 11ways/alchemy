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
	
	if (typeof options == 'undefined') options = {};
	
	// Use different functions for different directories by default
	if (typeof options.modular == 'undefined') options.modular = true;
	
	// Load the bootstrap.js file first
	if (typeof options.bootstrap == 'undefined') options.bootstrap = true;
	
	// Load the app_ file afterwards
	if (typeof options.app == 'undefined') options.app = true;
	
	// Load the bootstrap file if wanted
	if (options.bootstrap) prive.loadBootstrap(dirPath);
	
	// Load the app_ file if wanted
	if (options.app) prive.loadRegexFile(dirPath, /^app_/);
	
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
		
		require(filePath);
		
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
	
	try {
		
		helperPath = alchemy.pathResolve.apply(null, arguments);
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
		
		return true;
		
	} catch (err) {
		// Was unable to read in the helper directory
		log.warn('Was unable to read in helper directory ' + helperPath);
		
		return false;
	}
	
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
alchemy._usePath = function usePath (pathToFiles, options) {
	
	// Declarations
	var files = false, fileCount, fileName, fileStat, filePath, bootstrapPath;
	
	// Read in the directory file listing
	try {
		files = fs.readdirSync(pathToFiles);
	} catch (err) {
		//log.warn('Unable to read out path ' + pathToFiles);
		return false;
	}
	
	
	for (fileCount in files) {
		
		fileName = files[fileCount];
		///^app_|bootstrap.js/
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
			require(alchemy.pathResolve(pathToPlugin, 'bootstrap'));
		} catch (err) {
			// Do nothing: bootstrap files are not mandatory
		}
		
		alchemy._plugins[name] = options;
	} else {
		log.error('Plugin ' + name + ' directory does not exist!');
	}
	
}