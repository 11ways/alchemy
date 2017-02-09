var libpath = require('path'),
    package,
    start = Date.now();

/**
 * Create a global to __Protoblast
 *
 * @type   {Object}
 */
global.Blast = __Protoblast;

/**
 * The Alchemy class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 */
global.Alchemy = Function.inherits('Informer', function Alchemy() {});

/**
 * Get or set the environment
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.0
 * @version  0.4.0
 *
 * @type    {String}
 */
Alchemy.setProperty(function environment() {
	return alchemy.settings.environment;
}, function set_environment(value) {
	alchemy.settings.environment = String(value);
	return alchemy.settings.environment;
});

/**
 * The alchemy global, where everything will be stored
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @type     {Alchemy}
 */
global.alchemy = new Alchemy();

/**
 * Timestamp when alchemy started up
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @type   {Number}
 */
alchemy.start_time = start;

/**
 * Plugins to be loaded will be stored in here, with their options
 *
 * @type   {Object}
 */
alchemy.plugins = {};

/**
 * Certain required modules can be registered under a name
 *
 * @type   {Object}
 */
alchemy.modules = {};

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
 * @version  0.4.0
 *
 * @type     {String}
 */
DEFINE('PATH_ROOT', libpath.dirname(require.main.filename));

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
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @type     {Boolean}
 */
global.DEBUG = false;

// Try getting the main package.json file
try {
	package = require(libpath.resolve(PATH_ROOT, 'package.json'));
} catch (err) {
	package = {};
}

/**
 * The package.json as an object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.0
 * @version  0.4.0
 *
 * @type     {Object}
 */
alchemy.package = package;

// Now get the alchemymvc package.json file
try {
	package = require(libpath.resolve(PATH_CORE, '..', 'package.json'));
} catch (err) {
	package = {};
}

/**
 * Get the alchemy core version
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.0
 * @version  0.4.0
 *
 * @type     {String}
 */
alchemy.version = package.version;

/**
 * Also store the version in the process versions object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.0
 * @version  0.4.0
 *
 * @type     {String}
 */
process.versions.alchemy = alchemy.version;

/**
 * Also store the version of the app
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.0
 * @version  0.4.0
 *
 * @type     {String}
 */
process.versions.alchemy_app = alchemy.package.version;