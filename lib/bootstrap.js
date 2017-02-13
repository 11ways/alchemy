'use strict';

var libpath = require('path'),
    starting;

/**
 * Extend prototypes
 */
require('protoblast')();

/**
 * Define DEFINE and constants
 */
require('./init/constants');

/**
 * Define alchemy class and instance
 */
require('./init/alchemy');

/**
 * Get all the languages by their locale
 */
require('./init/languages');

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
 * Set up file change watchers for development
 */
require('./init/devwatch');

/**
 * Alchemy's Base class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
require('./core/base');

/**
 * Require the base class on the client side too
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
alchemy.hawkejs.load(libpath.resolve(PATH_CORE, 'core/base.js'), {server: false, is_commonjs: false});

/**
 * Require database stuff
 */
alchemy.useOnce(libpath.resolve(PATH_CORE, 'core/query.js'));

/**
 * Set up routing functions
 */
alchemy.useOnce(libpath.resolve(PATH_CORE, 'core/routing.js'));

/**
 * Set up middleware functions
 */
alchemy.useOnce(libpath.resolve(PATH_CORE, 'core/middleware.js'));

/**
 * Load socket.io code
 */
alchemy.useOnce(libpath.resolve(PATH_CORE, 'core/socket.js'));

/**
 * Load discovery code
 */
alchemy.useOnce(libpath.resolve(PATH_CORE, 'core/discovery.js'));

/**
 * Load in all classes
 */
alchemy.usePath(libpath.resolve(__dirname, 'class'), {modular: false});

// Load the base bootstrap file
try {
	alchemy.useOnce(libpath.resolve(PATH_ROOT, 'app', 'config', 'bootstrap.js'));
} catch (err) {
	if (err.message.indexOf('Cannot find') === -1) {
		alchemy.printLog(alchemy.WARNING, 'Could not load app bootstrap file');
		throw err;
	} else {
		alchemy.printLog(alchemy.SEVERE, 'Could not load config bootstrap file', {err: err});
	}
}

/**
 * Only start the server after this function has been called
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       0.4.0
 *
 * @param   {Function}   callback   The optional callback after alchemy is ready
 */
Alchemy.setMethod(function start(options, callback) {

	if (typeof options == 'function') {
		callback = options;
		options = {};
	}

	if (!options) {
		options = {};
	}

	// If silent is true, don't output anything
	if (options.silent == true) {
		this.settings.silent = true;
	}

	if (starting) {
		return this.ready(callback);
	}

	if (options.client_mode) {
		this.settings.client_mode = true;
	} else {
		if (this.settings.no_default_file) {
			log.warn('Could not find default settings file at "' + this.settings.no_default_file + '.js"');
		}

		if (this.settings.no_local_file) {
			log.warn('Could not find local settings file, defaulting to dev environment');
		}

		if (this.settings.no_env_file) {
			log.warn('Could not find environment settings file at "' + this.settings.no_env_file + '.js"');
		}
	}

	// Indicate the server is starting
	starting = true;

	// Start the stages
	alchemy.useOnce(libpath.resolve(PATH_CORE, 'stages.js'));

	// Schedule the callback
	this.ready(callback);
});