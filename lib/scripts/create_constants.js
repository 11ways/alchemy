const libpath = require('path'),
      libfs = require('fs');

/**
 * Path to the directory of the server.js file
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.0.4
 *
 * @type     {string}
 */
DEFINE('PATH_ROOT', process.env.PATH_ROOT || libpath.dirname(require.main.janeway_required || require.main.filename));

/**
 * Path to the directory of the base app folder
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @type     {string}
 */
DEFINE('PATH_APP', libpath.resolve(PATH_ROOT, 'app'));

/**
 * Path to the temporary directory
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @type     {string}
 */
DEFINE('PATH_TEMP', libpath.resolve(PATH_ROOT, 'temp'));

/**
 * Path to the core lib path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @type     {string}
 */
DEFINE('PATH_CORE', libpath.resolve(__dirname, '..'));

/**
 * Resolve a core path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
DEFINE(function resolveCorePath(...args) {
	return libpath.resolve(PATH_CORE, ...args);
});

/**
 * Require a core path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
DEFINE(function requireCorePath(...args) {
	return Blast.require(resolveCorePath(...args), {client: false});
});

/**
 * Require all files in a directory
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
DEFINE(function requireCorePathAll(...args) {

	let path = resolveCorePath(...args),
	    result = {};

	for (let filename of libfs.readdirSync(path)) {
		let name = filename.beforeLast('.');
		result[name] = Blast.require(libpath.resolve(path, filename), {client: false});
	}

	return result;
});

/**
 * Debug value
 * Actually not a constant, will be changed later
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @type     {boolean}
 */
global.DEBUG = false;

/**
 * Exit the application with an error message
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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