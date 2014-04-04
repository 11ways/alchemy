var fs         = require('fs'),
    path       = require('path'),
    usePaths   = {};

/**
 * A wrapper function for requiring modules
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   moduleName     The name/path of the module to load
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

	try {
		result = alchemy.findModule(moduleName);
		module = result.module;
	} catch(err) {
		log.error('Failed to load module "' + moduleName.bold + '"', {level: 6, err: err});
		return;
	}

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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   startPath    The path to originate the search from
 * @param    {String}   moduleName
 * @param    {Number}   recurse
 */
function searchModule(startPath, moduleName, recurse) {

	var moduledirs,
	    modulePath,
	    nmPath,
	    key,
	    i;

	if (!recurse) {
		recurse = 1;
	}

	nmPath = path.resolve(startPath, 'node_modules');

	// Get all the entries inside the given path
	try {
		moduledirs = fs.readdirSync(nmPath);
	} catch(err) {
		return;
	}

	// Go over every directory in the main node_modules folder
	for (i = 0; i < moduledirs.length; i++) {
		
		key = moduledirs[i];

		try {
			// Let require find the specific file to get
			modulePath = require.resolve(path.resolve(nmPath, key, 'node_modules', moduleName));

			// If no errors have popped up now, we can break the for loop
			break;

		} catch(e) {
			// Do nothing
		}
	}

	if (!modulePath && recurse < 3) {
		for (i = 0; i < moduledirs.length; i++) {

			modulePath = searchModule(path.resolve(nmPath, moduledirs[i]), moduleName, recurse+1);

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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   moduleName
 */
alchemy.findModule = function findModule(moduleName) {

	var modulePath,
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
	}

	// If it was found, set the err to false
	if (module) {
		result.err = false;
		result.module = module;
		result.modulePath = modulePath;
	}

	// Save the result
	usePaths[moduleName] = result;

	// If there was an error, throw it now
	if (result.err) {
		throw result.err;
	}

	result.searchTime = Date.now() - time;

	pr('Found ' + moduleName.bold + ' in ' + result.searchTime + ' ms');

	// Else return the result
	return result;
};