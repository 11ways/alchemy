var have_warned = false,
    plugModules = null,
    usedModules = {},
    useErrors   = {},
    usePaths    = {},
    libpath     = require('path'),
    fs          = require('fs');

alchemy.modules_error = useErrors;
alchemy.modules_loaded = usedModules;

/**
 * A wrapper function for requiring modules
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
 *
 * @param   {String}   moduleName     The name/path of the module to load
 * @param   {String}   registerAs     Cache the module under this name
 * @param   {Object}   options        Extra options
 *                     options.force  Force a new requirement and do not cache
 *
 * @returns {Object}   The required module
 */
alchemy.use = function use(moduleName, registerAs, options) {

	var module, result;

	if (typeof registerAs == 'object') {
		options = registerAs;
		registerAs = false;
	}

	if (typeof options == 'undefined') options = {};
	if (typeof options.force == 'undefined') options.force = false;

	// If a module has already been registered under this name, return that
	if (alchemy.modules[moduleName] && !options.force) {
		return alchemy.modules[moduleName];
	}

	try {
		result = alchemy.findModule(moduleName, options);
		module = result.module;
	} catch (err) {

		if (!useErrors[moduleName]) {
			useErrors[moduleName] = 0;
		}

		useErrors[moduleName]++;

		if (!options.silent) {
			log.error('Failed to load module "' + moduleName.bold + '"', {level: 6, err: err});
		}
		return;
	}

	if (!usedModules[moduleName]) {
		usedModules[moduleName] = {
			internal: result.internal,
			version: result.package.version,
			loaded: 0
		};
	}

	usedModules[moduleName].loaded++;

	if (registerAs) alchemy.modules[registerAs] = module;

	// If a new requirement needs to be forced, clear the cache
	if (options.force) {
		delete require.cache[result.modulePath];
		return require(result.modulePath);
	}

	return module;
};

/**
 * Look for a module by traversing the filesystem
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
 *
 * @param    {String}   startPath    The path to originate the search from
 * @param    {String}   moduleName
 * @param    {Number}   recurse
 */
function searchModule(startPath, moduleName, recurse) {

	var moduledirs,
	    modulePath,
	    entries,
	    nmPath,
	    temp,
	    key,
	    i;

	// Don't do this search if it hasn't been enabled
	// The new npm flat structure makes this an expensive thing to do
	if (!alchemy.settings.search_for_modules) {

		// Set recurse to 3, so this is the first and last call
		recurse = 3;

		// Only add 2 folder to look through,
		// the alchemymvc node_modules folder
		// and the base node_modules folder
		moduledirs = ['..', libpath.resolve(startPath, 'node_modules', 'alchemymvc')];

		// Add plugin folders
		if (!plugModules) {
			// Get all the entries in the main modules folder
			entries = fs.readdirSync(libpath.resolve(PATH_ROOT, 'node_modules'));

			// Initiate the plugin modules variables
			plugModules = [];


			for (i = 0; i < entries.length; i++) {
				temp = entries[i];

				if (temp.startsWith('alchemy-')) {
					plugModules.push(libpath.resolve(PATH_ROOT, 'node_modules', temp));
				}
			}
		}

		for (i = 0; i < plugModules.length; i++) {
			moduledirs.push(plugModules[i]);
		}

	} else if (!have_warned) {
		have_warned = true;
		log.warn('The "search_for_modules" config has been enabled!');
	}

	if (!recurse) {
		recurse = 1;
	}

	nmPath = libpath.resolve(startPath, 'node_modules');

	if (!moduledirs) {
		// Get all the entries inside the given path
		try {
			moduledirs = fs.readdirSync(nmPath);
		} catch(err) {
			return;
		}
	}

	// Look in the base node_modules directory first
	if (recurse == 1) {
		moduledirs.unshift('..');
	}

	// Go over every directory in the main node_modules folder
	for (i = 0; i < moduledirs.length; i++) {

		key = moduledirs[i];

		try {
			// Let require find the specific file to get
			modulePath = require.resolve(libpath.resolve(nmPath, key, 'node_modules', moduleName));

			// If no errors have popped up now, we can break the for loop
			break;

		} catch(e) {
			// Do nothing
		}
	}

	if (!modulePath && recurse < 3) {
		for (i = 0; i < moduledirs.length; i++) {

			modulePath = searchModule(libpath.resolve(nmPath, moduledirs[i]), moduleName, recurse+1);

			if (modulePath) {
				break;
			}
		}
	}

	return modulePath;
};

/**
 * Find a module in our customized file structure
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
 *
 * @param    {String}   moduleName
 * @param    {Object}   options
 */
alchemy.findModule = function findModule(moduleName, options) {

	var modulePath,
	    internal,
	    package,
	    module,
	    result,
	    module,
	    time,
	    key,
	    i;

	// If we've required this once before, return it
	if (result = usePaths[moduleName]) {
		if (result.err) {
			throw result.err;
		}

		return result;
	}

	result = {};

	time = Date.now();

	// Simply try to resolve the module by name
	try {
		modulePath = require.resolve(moduleName);
	} catch (err) {
		result.err = err;
	}

	// If that path wasn't found, look through the root node_modules
	if (result.err) {
		modulePath = searchModule(PATH_ROOT, moduleName);
	}

	// If the modulePath was found, actually require the module
	if (modulePath) {
		module = require(modulePath);

		// Get the package.json file
		if (~modulePath.indexOf(libpath.sep)) {
			internal = false;
			try {
				package = require(libpath.resolve(libpath.dirname(modulePath), 'package.json'));
			} catch (err) {
				package = false;
			}
		} else {
			internal = true;
			package = {
				version: process.versions.node
			};
		}
	}

	// If it was found, set the err to false
	if (module) {
		result.err = false;
		result.module = module;
		result.modulePath = modulePath;
		result.package = package;
		result.internal = internal;
	}

	// Save the result
	usePaths[moduleName] = result;

	// If there was an error, throw it now
	if (result.err) {
		throw result.err;
	}

	result.searchTime = Date.now() - time;

	// Else return the result
	return result;
};