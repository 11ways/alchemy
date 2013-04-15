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
 * Start the timer before requiring
 * 
 * @type {Integer}
 */
alchemy._TimerLaunch = (new Date).getTime();

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
alchemy.classes = {};

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

/**
 * Create an event emitter for alchemy,
 * and alias some functions
 */
var Events = new (require('events').EventEmitter)();
alchemy.on = function(){Events.on.apply(this, arguments);}
alchemy.emit = function(){Events.emit.apply(this, arguments);}
alchemy.once = function(){Events.once.apply(this, arguments);}
alchemy.removeListener = function(){Events.removeListener.apply(this, arguments);}

var path = require('path');

// Get the root directory
var root = path.dirname(require.main.filename);

// Set the root global
global.ROOT = root;