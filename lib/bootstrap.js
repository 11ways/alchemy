/**
 * Define variables, like the global alchemy object
 */
require('./init/variables');

/**
 * Define logging functions
 */
require('./init/logging');

/**
 * Add inflections to the string prototype
 */
require('./init/inflections');

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
 * Set up the Base Class,
 * from which every other class inherits
 */
//require('./core/base_class');

/**
 * Resource
 */
require('./core/resource');

/**
 * Require database stuff
 */
require('./core/database');

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
 * Load in all classes
 */
alchemy.usePath(__dirname + '/class', {modular: false});

/**
 * From this point on, asynchronous calls can be made
 */

/**
 * Load the base app
 */
alchemy.usePath('./app', {less: false});

/**
 * Create a new expirable cache
 */
alchemy.cache = new alchemy.modules.expirable('5 minutes');

// Say we're not connected to a database yet
alchemy._datasourcesConnected = false;
alchemy._associationsCreated = false;

alchemy.on('datasourcesConnected', function() {
	alchemy._datasourcesConnected = true;

	// Register all the models in the database, every time a connection is made
	alchemy.registerModels();
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
		    jsonify = '/hawkejs/vendor/jsonify.js';

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

		// Don't let hawkejs add it again
		settings.payload.request.skipHawkejsFile = true;
	}

	callback();
});