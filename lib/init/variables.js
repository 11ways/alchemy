/**
 * Require the base class Nuclei
 */
var Nuclei = require('nuclei');

/**
 * The alchemy global, where everything will be stored
 *
 * @type   object
 */
var alchemy = global.alchemy = global.Alchemy = {};

/**
 * Empty plugin objects will be stored here
 */
global.Plugin = alchemy.Plugin = {};

/**
 * Plugins to be loaded will be stored in here, with their options
 *
 * @type   {Object}
 */
alchemy.plugins = {};

/**
 * Start the timer before requiring
 * 
 * @type {Integer}
 */
alchemy._TimerLaunch = Date.now();

/**
 * All requirements will also be cached in here
 *
 * @type   object
 */
alchemy.requirements = {};

/**
 * Certain required modules can be registered under a name
 *
 * @type   {Object}
 */
alchemy.modules = {};

/**
 * All classes will be stored here
 *
 * @type   object
 */
alchemy.classes = Nuclei.Classes;
alchemy.classes.BaseClass = Nuclei.Nuclei;
global.BaseClass = Nuclei.Nuclei;

var EventEmitter = require('events').EventEmitter;

// Add all the EventEmitter properties to the BaseClass
for (var i in EventEmitter.prototype) {
	BaseClass.prototype[i] = EventEmitter.prototype[i];
}

alchemy.Nuclei = Nuclei;

/**
 * All model classes will be stored here
 *
 * @type   object
 */
alchemy.models = {};

/**
 * All controller classes will be stored here
 *
 * @type   object
 */
alchemy.controllers = {};

/**
 * All source view dirs
 * Hawkejs will use these to copy them to the temporary folder
 *
 * @type    array
 */
alchemy._sourceViewDirs = [];

/**
 * Alchemy class instances will be stored here
 */
alchemy.instances = {
	controllers: {},
	models: {}
};

/**
 * The current runlevel
 */
alchemy.runlevels = {};

// Create the event emitter
require('./events.js');

var path = require('path');

// The PATH_ROOT global is the path where the server.js file is in
global.PATH_ROOT = path.dirname(require.main.filename);

// The APP_ROOT global is the path of the base app folder
global.APP_ROOT = path.resolve(PATH_ROOT, 'app');

// The TEMP_ROOT global is the path of the copied assets folder
global.PATH_TEMP = path.resolve(PATH_ROOT, 'temp');

// The PATH_CORE global is the path of Alchemy MVC's core lib folder
global.PATH_CORE = path.resolve(__dirname, '..');
