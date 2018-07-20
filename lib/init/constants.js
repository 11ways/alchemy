'use strict';

var libpath = require('path');

/**
 * Function to define global constants
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.0
 * @version  0.4.0
 *
 * @type   {Function}
 */
function DEFINE(name, value) {
	Object.defineProperty(global, name, {value: value});
};

/**
 * Use DEFINE for itself
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.0
 * @version  0.4.0
 *
 * @type     {Function}
 */
DEFINE('DEFINE', DEFINE);

/**
 * Create a global to __Protoblast
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @type     {Informer}
 */
DEFINE('Blast', __Protoblast);

/**
 * All classes will be collected here
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @type     {Object}
 */
DEFINE('Classes', Blast.Classes);

/**
 * Path to the directory of the server.js file
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.4
 *
 * @type     {String}
 */
DEFINE('PATH_ROOT', process.env.PATH_ROOT || libpath.dirname(require.main.janeway_required || require.main.filename));

/**
 * Path to the directory of the base app folder
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @type     {String}
 */
DEFINE('PATH_APP', libpath.resolve(PATH_ROOT, 'app'));

/**
 * Path to the temporary directory
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @type     {String}
 */
DEFINE('PATH_TEMP', libpath.resolve(PATH_ROOT, 'temp'));

/**
 * Path to the core lib path
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @type     {String}
 */
DEFINE('PATH_CORE', libpath.resolve(__dirname, '..'));

/**
 * Debug value
 * Actually not a constant, will be changed later
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @type     {Boolean}
 */
global.DEBUG = false;

/**
 * Exit the application with an error message
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @type     {Function}
 */
DEFINE('die', function die(...args) {

	// Print the log
	// @TODO: destroy Janeway first
	// (but blessed can't revert to original state without segfaulting)
	alchemy.Janeway.print(alchemy.SEVERE, args, {level: 2});

	process.exit();
});