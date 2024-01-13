'use strict';

const libpath = require('path');
let starting;

/**
 * Load Protoblast in the prototype-modifying mode.
 * This is the backbone of Alchemy.
 */
require('protoblast')(true);

/**
 * Resolve a core path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
function resolveCorePath(...args) {
	return libpath.resolve(PATH_CORE, ...args);
}

/**
 * Require a core path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
function requireCorePath(...args) {
	return require(resolveCorePath(...args));
}

/**
 * Define DEFINE and constants
 */
require('./init/constants');

/**
 * Alchemy's Base class (from which all other classes inherit)
 */
requireCorePath('core', 'base');

/**
 * Alchemy's Client Base class
 */
requireCorePath('core', 'client_base');

/**
 * Load the setting class
 */
requireCorePath('core', 'setting.js');

/**
 * Load the actual settings
 */
requireCorePath('init', 'settings.js');

/**
 * Define alchemy class and instance
 */
requireCorePath('core', 'alchemy');

/**
 * Get all the languages by their locale
 */
requireCorePath('init', 'languages');

/**
 * Require basic functions
 */
requireCorePath('init', 'functions');

/**
 * Require load functions
 */
requireCorePath('init', 'load_functions');

/**
 * Pre-load basic requirements
 */
requireCorePath('init', 'preload_modules');

/**
 * Set up file change watchers for development
 */
requireCorePath('init', 'devwatch');

/**
 * The migration class
 */
requireCorePath('class', 'migration');

const CLIENT_HAWKEJS_OPTIONS = {

	// Do not load on the server
	server : false,

	// Turn it into a commonjs load
	make_commonjs: true,

	// The arguments to add to the wrapper function
	arguments : 'hawkejs'
};

const SERVER_HAWKEJS_OPTIONS = {

	// Also load on the server
	server : true,

	// Turn it into a commonjs load
	make_commonjs: true,

	// The arguments to add to the wrapper function
	arguments : 'hawkejs'
};

/**
 * Require the base class on the client side too
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(resolveCorePath('core', 'base.js'), CLIENT_HAWKEJS_OPTIONS);

/**
 * Require the client_base class on the client side too
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(resolveCorePath('core', 'client_base.js'), CLIENT_HAWKEJS_OPTIONS);

/**
 * Require the error class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(resolveCorePath('class', 'error.js'), SERVER_HAWKEJS_OPTIONS);

/**
 * Require the client_alchemy class on the client side
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.5
 * @version  1.1.0
 */
alchemy.hawkejs.load(resolveCorePath('core', 'client_alchemy.js'), SERVER_HAWKEJS_OPTIONS);

/**
 * Require the path_evaluator class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(resolveCorePath('class', 'path_evaluator.js'), SERVER_HAWKEJS_OPTIONS);

/**
 * Require the field_value class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(resolveCorePath('class', 'field_value.js'), SERVER_HAWKEJS_OPTIONS);

/**
 * Require the path_definition class on the client side too
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(resolveCorePath('class', 'path_definition.js'), CLIENT_HAWKEJS_OPTIONS);
alchemy.hawkejs.load(resolveCorePath('class', 'path_param_definition.js'), CLIENT_HAWKEJS_OPTIONS);

/**
 * Require the element class on the client side too
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(resolveCorePath('class', 'element.js'), CLIENT_HAWKEJS_OPTIONS);

/**
 * Require the helper class on the client side too
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(resolveCorePath('class', 'helper.js'), CLIENT_HAWKEJS_OPTIONS);

/**
 * Require the datasource class on the client side too
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(resolveCorePath('class', 'datasource.js'), CLIENT_HAWKEJS_OPTIONS);

/**
 * Require the field class on the client side too
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(resolveCorePath('class', 'field.js'), CLIENT_HAWKEJS_OPTIONS);

/**
 * Require the schema_client class on the client side too
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
alchemy.hawkejs.load(resolveCorePath('class', 'schema_client.js'), CLIENT_HAWKEJS_OPTIONS);

/**
 * Set up routing functions
 */
alchemy.useOnce(resolveCorePath('core', 'routing.js'));

/**
 * Set up middleware functions
 */
alchemy.useOnce(resolveCorePath('core', 'middleware.js'));

/**
 * Load socket.io code
 */
alchemy.useOnce(resolveCorePath('core', 'socket.js'));

/**
 * Load discovery code
 */
alchemy.useOnce(resolveCorePath('core', 'discovery.js'));

/**
 * Load inode classes
 */
alchemy.useOnce(resolveCorePath('class', 'inode.js'));
alchemy.useOnce(resolveCorePath('class', 'inode_file.js'));
alchemy.useOnce(resolveCorePath('class', 'inode_dir.js'));
alchemy.useOnce(resolveCorePath('class', 'inode_list.js'));

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
