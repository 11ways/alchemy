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
alchemy.use = function use (moduleName, options) {
	
	if (typeof options == 'undefined') options = {};
	if (typeof options.force == 'undefined') options.force = false;
	
	if (typeof alchemy.requirements[moduleName] == 'undefined' && !options.force) {
		alchemy.requirements[moduleName] = require(moduleName);
	}
	
	// If we want to force a new requirement
	if (options.force) {
		return require(moduleName);
	} else {
		return alchemy.requirements[moduleName];
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
alchemy.usePath = function usePath (pathToFiles, options) {
	
	// Get some modules from the cache
	var fs = alchemy.use('fs');
	var path = alchemy.use('path');
	
	// Declarations
	var files = false, fileCount, fileName, fileStat, filePath;
	
	// Read in the directory file listing
	try {
		files = fs.readdirSync(pathToFiles);
	} catch (err) {
		// We were not able to read out the folder
		return false;
	}
	
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
		
		// We already loaded the app_ file
		if (fileName.startsWith('app_')) continue;
		
		filePath = path.resolve(pathToFiles, fileName);
		fileStat = fs.lstatSync(filePath);
		
		// Skip directories
		if (fileStat.isDirectory()) continue;
		
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
	
	// The subdirectories to load
	var appTree = ['behavior', 'controller', 'component', 'model', 'utility'];
	
	for (var i = 0; i < appTree.length; i++) {
		alchemy.usePath(path.resolve(pathToDirs, appTree[i]));
	}
}

/**
 * Pretty print debug option
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
global.pr = function pr (message) {
	console.log(message);
}