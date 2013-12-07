// Get some modules from the cache
var fs               = alchemy.use('fs'),
    path             = alchemy.use('path'),
    async            = alchemy.use('async'),
    mkdirp           = alchemy.use('mkdirp'),
    hawkejs          = alchemy.use('hawkejs'),
    prive            = {},
    _duplicateCheck  = {};

/**
 * Require all files in a certain directory.
 * Does not cache the files.
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
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
alchemy.usePath = function usePath(dirPath, options) {
	
	var modularRegex = [], useOptions = {};
	
	if (typeof options === 'undefined') options = {};
	
	// Use different functions for different directories by default
	if (typeof options.modular === 'undefined') options.modular = true;
	if (typeof options._level === 'undefined') options._level = -1;
	if (typeof options.order === 'undefined') options.order = 10;
	
	options._level++;
	useOptions._level = options._level;

	// Always ignore .git directories
	modularRegex.push(/^.git$/);
	
	// Ignore bootstrap file if it's a plugin, because it's already loaded
	if (options.plugin) {
		useOptions.bootstrap = false;
		modularRegex.push({regex: /bootstrap.js/, level: 0});
		options.order = 8;
	}

	if (options.modular && options._level == 0) {
		
		// Hawkejs view helpers
		if (options.helpers !== false) prive.loadHelpers(dirPath, 'helper');
		
		// Hawkejs views
		// @todo: when the loadViews function becomes async, we can use sputnik here
		if (options.views !== false) prive.loadViews(path.resolve(dirPath, 'view')/*, alchemy.sputnik.wait('views')*/);
		
		// Asset stylesheets
		if (options.less !== false) prive.loadLess(path.resolve(dirPath, 'assets', 'stylesheets'), alchemy.sputnik.wait('stylesheets'));

		// Asset scripts
		if (options.scripts !== false) prive.loadScript(path.resolve(dirPath, 'assets', 'scripts'), alchemy.sputnik.wait('stylesheets'));

		// public folders (going to /public/)
		if (options.public !== false) prive.loadPublic(path.resolve(dirPath, 'public'), alchemy.sputnik.wait('static'), options.order);
		
		modularRegex.push(/^view$|^helper$|^plugins$|^assets$/);
		
		useOptions.modular = true;
	}
	
	// Do not load /config subdirectories
	if (/\/config$/.exec(dirPath)) useOptions.recursive = false;
	

	pr('LEVEL ' + options._level + ' - Going to load path: '.bold.yellow + dirPath.bold.blue);
	
	useOptions.ignore = modularRegex;
	
	prive.usePath(dirPath, useOptions);
}

/**
 * Load in less files.
 * Happens asynchronously, but serially.
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}    filepath    The path to load
 * @param   {Function}  callback
 * @param   {String}    subdir
 */
prive.loadLess = function loadLess(filepath, callback, subdir) {

	alchemy.queueFunction('less', function(nextQueue) {
		prive.loadLessDirectory(filepath, nextQueue, subdir);
	}, callback);
};

/**
 * Load in script files.
 * Happens asynchronously, but serially.
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}    filepath    The path to load
 * @param   {Function}  callback
 * @param   {String}    subdir
 */
prive.loadScript = function loadScript(filepath, callback, subdir) {

	alchemy.queueFunction('less', function(nextQueue) {
		prive.loadScriptDirectory(filepath, nextQueue, subdir);
	}, callback);
};

/**
 * Load in less files.
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}    filepath    The path to load
 * @param   {Function}  callback
 * @param   {String}    subdir
 */
prive.loadLessDirectory = function loadLessDirectory(filepath, callback, subdir) {
	prive.loadAssetDirectory('stylesheets', filepath, callback, subdir);
};

/**
 * Load in script files.
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}    filepath    The path to load
 * @param   {Function}  callback
 * @param   {String}    subdir
 */
prive.loadScriptDirectory = function loadScriptDirectory(filepath, callback, subdir) {
	prive.loadAssetDirectory('scripts', filepath, callback, subdir);
};

/**
 * Load in asset files.
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}    type        The type/subdir to load
 * @param   {String}    filepath    The path to load
 * @param   {Function}  callback
 * @param   {String}    subdir
 */
prive.loadAssetDirectory = function loadAssetDirectory(type, filepath, callback, subdir) {

	var tempPath = path.resolve(PATH_TEMP, type);

	if (!subdir) subdir = '';

	fs.readdir(filepath, function (err, files){

		if (err) {
			log.warn('Asset ' + type + ' directory does not exists: ' + filepath);
			callback();
			return;
		}
		
		var srun = [];
		
		for (var i in files) {
			
			var filename = files[i];
			
			(function(filename, filepath, subdir) {
				srun.push(function(asynccallback) {
					// Check the file
					fs.stat(path.resolve(filepath, filename), function(err, stats){

						if (stats.isDirectory()) {
							
							// Get the directory name
							var dirname = filename;
							
							// Store the original path
							var dirpath = path.resolve(filepath, filename);
							
							// Add this to the subdir
							subdir += '/' + dirname;
							
							prive.loadAssetDirectory(type, dirpath, function(){asynccallback(null)}, subdir)
							
						} else {

							mkdirp(tempPath + '/' + subdir + '/', function (error) {
							
								// Open the original file
								var origin = fs.createReadStream(filepath + '/' + filename);
								
								// Open the destination file
								var destination = fs.createWriteStream(tempPath + '/' + subdir + '/' + filename);     
								
								origin.on('end', function(err) {
									
									if (err) {
										log.warn('Asset ' + type + ' file could not be loaded: ' + filename);
									}
									
									asynccallback(null);
								});
								
								// Pipe the original file into the destination
								origin.pipe(destination);
								
							});
							
						}
						
					});
				});
			
			})(filename, filepath, subdir);

		}
		
		// Execute the functions in serie
		async.series(srun, function(err, results) {
			callback();
		});
		
	});
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
	
	var helperFiles, filePath, fileCount;
	
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
		log.warn('Was unable to read in helper directory ' + dirPath);
		
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
 * Prepare in public directories.
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}  dirPath    The path to load
 * @param   {Function}  callback
 * @param   {Number}    order       The order of the files. Lower is higher.
 */
prive.loadPublic = function loadPublic (dirPath, callback, order) {
	
	var publicPath = path.resolve(dirPath, 'public');
	
	if (typeof _duplicateCheck[dirPath] != 'undefined') {
		if (callback) callback();
	}
	
	fs.exists(dirPath, function(exists) {
		
		if (exists) alchemy.static('/', dirPath, order);
		
		_duplicateCheck[dirPath] = exists;
		
		if (callback) callback();
	});
	
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
alchemy.olduseApp = function useApp (pathToDirs) {
	
	var pathArguments, bootstrapPath, path = alchemy.use('path');
	
	pathToDirs = alchemy.pathResolve.apply(null, arguments);
	
	alchemy.usePath(pathToDirs);
	
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
		alchemy.usePath(path.resolve(pathToDirs, appTree[i]), {_level: 0});
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
alchemy.usePlugin = function usePlugin(name, options) {
	
	if (typeof options === 'undefined') options = {};
	
	var pathToPlugin, pluginStat, isDir = false, fs = alchemy.use('fs');

	try {
		pathToPlugin = alchemy.pathResolve(APP_ROOT, 'plugins', name);
		pluginStat = fs.lstatSync(pathToPlugin);
		isDir = pluginStat.isDirectory();
	} catch (err) {
		log.err('Error loading plugin ' + name, {err: err});
	}
	
	if (isDir) {

		// Set the given options
		alchemy.plugins[name] = options;
	
		try {
			// Require the bootstrap.js file now, if it exists
			alchemy.useOnce(alchemy.pathResolve(pathToPlugin, 'bootstrap.js'));
		} catch (err) {
			// Do nothing: bootstrap files are not mandatory
		}
		
	} else {
		log.error('Plugin ' + name + ' directory does not exist!');
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
 * @param    {Integer}  order        The order will only matter if called before
 *                                   ready. Lower orders have higher priority.
 */
alchemy.static = function _static (publicPath, localPath, order) {
	
	if (publicPath === '/') publicPath = '/public/';

	if (staticSet) {
		alchemy.app.use(publicPath, alchemy.express.static(localPath));
	} else {
		if (typeof order === 'undefined') order = 10;
		if (typeof staticQueue[order] === 'undefined') staticQueue[order] = [];
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

			if (p.publicPath === '/') {
				pr('Using ... /public + ' + p.localPath);
				alchemy.app.use('/public', alchemy.express.static(p.localPath));
			} else {
				pr('Using "' + p.publicPath + '" + ' + p.localPath);
				alchemy.app.use(p.publicPath, alchemy.express.static(p.localPath));
			}
		}
	}
	
	staticSet = true;
}

/**
 * Load in a file only once
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.useOnce = function useOne(dirPath) {
	
	dirPath = alchemy.pathResolve.apply(null, arguments);
	
	if (dirPath.indexOf('.js') === -1) {
		log.verbose('Skipped non JS file: ' + dirPath.split('/').pop());
		return false;
	}
	
	if (typeof _duplicateCheck[dirPath] === 'undefined') {
		
		try {
			require(dirPath);
			_duplicateCheck[dirPath] = true;
			log.verbose('Used file once: ' + dirPath, {level: 1});
		} catch (err) {
			_duplicateCheck[dirPath] = false;
			log.error('Failed to use file once: ' + dirPath, {err: err, extra: true});
		}
		
	} else {
		log.verbose('File not loaded, already used once: ' + dirPath, {level: 1});
	}
};