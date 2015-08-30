var libpath = require('path'),
    starting;

/**
 * Extend prototypes
 */
require('protoblast')();

/**
 * Define variables, like the global alchemy object
 */
require('./init/variables');

/**
 * Get all the languages by their locale
 */
require('./init/languages');

/**
 * Create the alchemy.use function
 */
require('./init/use');

/**
 * Define logging functions
 */
require('./init/logging');

/**
 * Require basic functions
 */
require('./init/functions');

/**
 * Require load functions
 */
require('./init/load_functions');

/**
 * Pre-load basic requirements
 */
require('./init/requirements');

/**
 * Set up configuration
 */
require('./init/settings');

/**
 * Set up file change watchers for development
 */
require('./init/devwatch');

/**
 * Resource
 */
require('./core/resource');

/**
 * Require database stuff
 */
require('./core/query');

/**
 * Set up routing functions
 */
require('./core/routing');

/**
 * Set up middleware functions
 */
require('./core/middleware');

/**
 * Load socket.io code
 */
require('./core/socket');

/**
 * Load discovery code
 */
require('./core/discovery');

/**
 * Load in all classes
 */
alchemy.usePath(libpath.resolve(__dirname, 'class'), {modular: false});

// Load the base bootstrap file
alchemy.useOnce(libpath.resolve(PATH_ROOT, 'app', 'config', 'bootstrap.js'), {throwError: false});

/**
 * Only start the server after this function has been called
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       1.0.0
 *
 * @param   {Function}   callback   The optional callback after alchemy is ready
 */
alchemy.start = function start(callback) {

	if (starting) {
		return alchemy.ready(callback);
	}

	if (alchemy.settings.no_default_file) {
		log.warn('Could not find default settings file at "' + alchemy.settings.no_default_file + '.js"');
	}

	if (alchemy.settings.no_local_file) {
		log.warn('Could not find local settings file, defaulting to dev environment');
	}

	if (alchemy.settings.no_env_file) {
		log.warn('Could not find environment settings file at "' + alchemy.settings.no_env_file + '.js"');
	}

	// Indicate the server is starting
	starting = true;

	// Start the stages
	require('./stages');

	// Schedule the callback
	alchemy.ready(callback);
};