var libpath = require('path');

/**
 * Create a global to __Protoblast
 *
 * @type   {Object}
 */
global.Blast = __Protoblast;

/**
 * The alchemy global, where everything will be stored
 *
 * @type   object
 */
global.alchemy = global.Alchemy = new Blast.Classes.Informer();

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
 * Certain required modules can be registered under a name
 *
 * @type   {Object}
 */
alchemy.modules = {};

// The PATH_ROOT global is the path where the server.js file is in
global.PATH_ROOT = libpath.dirname(require.main.filename);

// The APP_ROOT global is the path of the base app folder
global.APP_ROOT = libpath.resolve(PATH_ROOT, 'app');
global.PATH_APP = global.APP_ROOT;

// The TEMP_ROOT global is the path of the copied assets folder
global.PATH_TEMP = libpath.resolve(PATH_ROOT, 'temp');

// The PATH_CORE global is the path of Alchemy MVC's core lib folder
global.PATH_CORE = libpath.resolve(__dirname, '..');
