'use strict';

const libpath = require('path');
let starting;

/**
 * Calling dynamic `import()` from certain places in the codebase actually
 * causes segfaults. This is a workaround for that.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.2.2
 *
 * @param    {String}   path
 *
 * @return   {Promise}
 */
global.doImport = function doImport(path) {
	return import(path);
};

/**
 * Extend prototypes
 */
require('protoblast')();

/**
 * Define DEFINE and constants
 */
require('./init/constants');

/**
 * Alchemy's Base class (from which all other classes inherit)
 */
require('./core/base');

/**
 * Alchemy's Client Base class
 */
require('./core/client_base');

/**
 * Load the setting class
 */
require(libpath.resolve(PATH_CORE, 'core', 'setting.js'));

/**
 * Load the actual settings
 */
require(libpath.resolve(PATH_CORE, 'init', 'settings.js'));

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
 * The migration class
 */
require('./class/migration');

var hawkejs_options = {
	server : false,
	make_commonjs: true,

	// The arguments to add to the wrapper function
	arguments : 'hawkejs'
};

/**
 * Require the base class on the client side too
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(libpath.resolve(PATH_CORE, 'core', 'base.js'), hawkejs_options);

/**
 * Require the client_base class on the client side too
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(libpath.resolve(PATH_CORE, 'core', 'client_base.js'), hawkejs_options);

hawkejs_options.server = true;

/**
 * Require the error class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(libpath.resolve(PATH_CORE, 'class', 'error.js'), hawkejs_options);

/**
 * Require the client_alchemy class on the client side
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.5
 * @version  1.1.0
 */
alchemy.hawkejs.load(libpath.resolve(PATH_CORE, 'core', 'client_alchemy.js'), hawkejs_options);

/**
 * Require the path_evaluator class
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(libpath.resolve(PATH_CORE, 'class', 'path_evaluator.js'), hawkejs_options);

/**
 * Require the field_value class
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(libpath.resolve(PATH_CORE, 'class', 'field_value.js'), hawkejs_options);

hawkejs_options.server = false;

/**
 * Require the path_definition class on the client side too
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(libpath.resolve(PATH_CORE, 'class', 'path_definition.js'), hawkejs_options);
alchemy.hawkejs.load(libpath.resolve(PATH_CORE, 'class', 'path_param_definition.js'), hawkejs_options);

/**
 * Require the element class on the client side too
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(libpath.resolve(PATH_CORE, 'class', 'element.js'), hawkejs_options);

/**
 * Require the helper class on the client side too
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(libpath.resolve(PATH_CORE, 'class', 'helper.js'), hawkejs_options);

/**
 * Require the datasource class on the client side too
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(libpath.resolve(PATH_CORE, 'class', 'datasource.js'), hawkejs_options);

/**
 * Require the field class on the client side too
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(libpath.resolve(PATH_CORE, 'class', 'field.js'), hawkejs_options);

/**
 * Require the schema_client class on the client side too
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(libpath.resolve(PATH_CORE, 'class', 'schema_client.js'), hawkejs_options);

/**
 * Set up routing functions
 */
alchemy.useOnce(libpath.resolve(PATH_CORE, 'core', 'routing.js'));

/**
 * Set up middleware functions
 */
alchemy.useOnce(libpath.resolve(PATH_CORE, 'core', 'middleware.js'));

/**
 * Load socket.io code
 */
alchemy.useOnce(libpath.resolve(PATH_CORE, 'core', 'socket.js'));

/**
 * Load discovery code
 */
alchemy.useOnce(libpath.resolve(PATH_CORE, 'core', 'discovery.js'));

/**
 * Load inode classes
 */
alchemy.useOnce(libpath.resolve(PATH_CORE, 'class', 'inode.js'));
alchemy.useOnce(libpath.resolve(PATH_CORE, 'class', 'inode_file.js'));
alchemy.useOnce(libpath.resolve(PATH_CORE, 'class', 'inode_dir.js'));
alchemy.useOnce(libpath.resolve(PATH_CORE, 'class', 'inode_list.js'));

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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.1.5
 *
 * @param    {Function}   callback   The optional callback after alchemy is ready
 *
 * @return   {Pledge}
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
		this.setSetting('debugging.silent', true);
	}

	if (starting) {
		return this.ready(callback);
	}

	if (Object.size(Blast.loaded_versions) > 1) {
		log.warn(Object.size(Blast.loaded_versions), 'versions of Protoblast have been loaded, this can cause problems!');
	}

	if (options.client_mode) {
		this.setSetting('client_mode', true);
	} else {
		if (alchemy.settings.no_default_file) {
			log.warn('Could not find default settings file at "' + alchemy.settings.no_default_file + '.js"');
		}

		if (alchemy.settings.no_local_file) {
			log.warn('Could not find local settings file');
		}

		if (alchemy.settings.no_env_file) {
			log.warn('Could not find environment settings file at "' + alchemy.settings.no_env_file + '.js"');
		}
	}

	// Indicate the server is starting
	starting = true;

	// Start the stages
	alchemy.useOnce(libpath.resolve(PATH_CORE, 'stages.js'));

	// Make sure Blast has executed everything that's still waiting
	Blast.doLoaded();

	// Call the `afterStart` method
	this.ready(() => this.afterStart());

	// Schedule the callback
	return this.ready(callback);
});

/**
 * Stop the server
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         1.0.3
 * @version       1.0.3
 *
 * @param   {Function}   callback   The optional callback after alchemy has stopped
 */
Alchemy.setMethod(function stop(callback) {

	this.server.close(function closed() {

		if (callback) {
			callback();
		}

	});

});