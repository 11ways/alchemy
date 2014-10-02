/**
 * Define variables, like the global alchemy object
 */
require('./init/variables');

/**
 * Get all the languages by their locale
 */
require('./init/languages');

/**
 * Define logging functions
 */
require('./init/logging');

/**
 * Extend prototypes
 */
alchemy.Protoblast = require('protoblast')();

/**
 * All classes will be collected here
 */
alchemy.classes = alchemy.Protoblast.Classes;

/**
 * Create the alchemy.use function
 */
require('./init/use');

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
require('./core/database');
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
 * Load Sputnik, the stage-based launcher
 */
var Sputnik = require('sputnik');
alchemy.sputnik = new Sputnik();

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
alchemy.usePath(__dirname + '/class', {modular: false});

/**
 * Load the base app
 */
alchemy.usePath('./app', {less: false});

/**
 * Create a new expirable cache
 */
alchemy.cache = new alchemy.modules.expirable('5 minutes');

var started = false;

/**
 * Only start the server after this function has been called
 *
 * @author        Jelle De Loecker   <jelle@codedor.be>
 * @since         0.0.1
 * @version       0.2.0
 *
 * @param   {Function}   callback   The optional callback after alchemy is ready
 */
alchemy.start = function start(callback) {

	if (started) {
		throw alchemy.createError('Alchemy has already started');
	}

	if (alchemy.settings.no_local_file) {
		log.warn('Could not find local settings file, defaulting to dev env');
	}

	if (alchemy.settings.no_default_file) {
		log.warn('Could not find default settings file at "' + alchemy.settings.no_default_file + '.js"');
	}

	if (alchemy.settings.no_env_file) {
		log.warn('Could not find environment settings file at "' + alchemy.settings.no_env_file + '.js"');
	}

	started = true;

	// Say we're not connected to a database yet
	alchemy._datasourcesConnected = false;
	alchemy._associationsCreated = false;

	alchemy.on('datasourcesConnected', function() {
		// @deprecated
		alchemy._datasourcesConnected = true;

		
	});

	alchemy.on('associationsCreated', function() {
		alchemy._associationsCreated = true;
	});

	/**
	 * Load in the states
	 */
	require('./stages');

	if (callback) {
		alchemy.ready(callback);
	}
};