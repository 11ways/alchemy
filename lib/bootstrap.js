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
 * Add inflections to the string prototype
 */
require('./init/inflections');

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
 * @version       0.0.1
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

	// Always include the hawkejs script on render
	alchemy.on('alchemy.render', function(settings, callback) {

		// Only send this data on the initial pageload
		if (!settings.ajax) {

			var path = '/hawkejs/hawkejs-client-side.js',
			    history = '/hawkejs/vendor/history.js',
			    jsonify = '/hawkejs/vendor/jsonify.js',
			    alcpath = '/public/scripts/alchemy.js';

			if (!settings.payload.request) {
				settings.payload.request = {};
			}

			if (!settings.payload.request.tags) {
				settings.payload.request.tags ={};
			}

			settings.payload.request.tags[path] = {
				type: 'script',
				path: path,
				block: 'head',
				order: 999,
				suborder: 100
			};

			settings.payload.request.tags[history] = {
				type: 'script',
				path: history,
				block: 'head',
				order: 999,
				suborder: 99
			};

			settings.payload.request.tags[jsonify] = {
				type: 'script',
				path: jsonify,
				block: 'head',
				order: 999,
				suborder: 98
			};

			settings.payload.request.tags[alcpath] = {
				type: 'script',
				path: alcpath,
				block: 'head',
				order: 999,
				suborder: 97
			};

			// Don't let hawkejs add it again
			settings.payload.request.skipHawkejsFile = true;
		}

		callback();
	});

	if (callback) {
		alchemy.ready(callback);
	}
};