'use strict';

var shared_objects = {},
    plugModules    = null,
    usedModules    = {},
    useErrors      = {},
    usePaths       = {},
    ac_entries     = {},
    parseArgs      = require('minimist'),
    libpath        = require('path'),
    colors         = require('ansi-256-colors'),
    fs             = require('fs'),
    os             = require('os');

/**
 * The Alchemy class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.1.0
 */
global.Alchemy = Function.inherits('Informer', 'Alchemy', function Alchemy() {

	var that = this,
	    package_json;

	// Only allow a single instance of the Alchemy class
	if (global.alchemy) {
		return global.alchemy;
	}

	// Timestamp when alchemy started
	this.start_time = Date.now();

	// Current working directory
	this.cwd = process.cwd();

	// Parsed arguments
	this.argv = parseArgs(process.argv.slice(2));

	// The id of this server instance
	this.discovery_id = Crypto.pseudoHex();

	// Link to the colors module
	this.colors = colors;

	// The session count
	this.session_count = 0;

	// Plugins to be loaded will be stored in here, with their options
	this.plugins = {};

	// Certain required modules can be registered under a name
	this.modules = {};

	// Link to all used modules
	this.modules_loaded = usedModules;

	// Link to failed modules
	this.modules_error = useErrors;

	// How many CPUs are available?
	this.cpu_core_count = os.cpus().length;

	// Try getting the app package.json file
	try {
		package_json = require(libpath.resolve(PATH_ROOT, 'package.json'));
	} catch (err) {
		package_json = {};
	}

	// The app package.json as an object
	this.package = package_json;

	// Now get the alchemymvc package.json file
	try {
		package_json = require(libpath.resolve(PATH_CORE, '..', 'package.json'));
	} catch (err) {
		package_json = {};
	}

	// Get the alchemy core version
	this.version = package_json.version;

	// Keep status
	this.status = {};

	// All caches
	this.caches = {};

	// Also store the version in the process versions object
	process.versions.alchemy = this.version;

	// Also store the version of the app
	process.versions.alchemy_app = this.package.version;

	// Distinct problems
	this.distinct_problems = new Map();

	// Load the settings
	this.loadSettings();

	// Listen to messages from parent processes
	process.on('message', function gotMessage(message) {
		if (typeof message == 'string') {
			return that.emit(message);
		}

		if (message && message.type) {
			return that.emit(message.type, message.data);
		}
	});

	// Get Janeway
	this.Janeway = this.use('janeway');

	// Asign the Janeway levels
	Object.assign(this, this.Janeway.LEVELS);

	try {
		if (this.argv['stream-janeway']) {
			this.startJaneway({stream: true});
		} else if (this.allow_janeway) {
			this.startJaneway();
		}
	} catch (err) {
		log.warn('Failed to start Janeway:', err);
	}
});

/**
 * See if running janeway is allowed
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  0.5.0
 *
 * @type    {Boolean}
 */
Alchemy.prepareProperty(function allow_janeway() {

	// Setting the --disable-janeway flag explicitly disabled ALL forms of janeway
	if (this.argv['disable-janeway'] || process.env.DISABLE_JANEWAY) {
		return false;
	}

	// You can also disable janeway in the settings
	if (this.settings.janeway === false) {
		return false;
	}

	if (Blast.isNW || !process.stdout.isTTY) {
		return false;
	}

	return true;
});

/**
 * Expirable object where sessions are stored
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  1.0.4
 *
 * @type    {Develry.Cache}
 */
Alchemy.prepareProperty(function sessions() {

	var cache = this.getCache('sessions', {
		max_idle   : alchemy.settings.session_length,
		max_length : Infinity
	});

	cache.on('removed', function onRemoved(value, key) {
		// @TODO: check if expired?
		value.removed();
	});

	return cache;
});

/**
 * Expirable object where sessions are temporarily stored
 * based on the browser fingerprints
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type    {Develry.Cache}
 */
Alchemy.prepareProperty(function fingerprints() {

	var cache = this.getCache('fingerprints', {
		max_idle   : '3 minutes',
		max_length : 3000
	});

	return cache;
});

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
 * Get the current lag in ms
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {Number}
 */
Alchemy.setMethod(function lagInMs() {
	return this.toobusy.lag();
});

/**
 * Get the system load as percentage points
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {Number}
 */
Alchemy.setMethod(function systemLoad() {

	let load_average = os.loadavg();

	const percentage = ~~((load_average[0] / this.cpu_core_count) * 100);

	return percentage;
});

/**
 * Is the server currently too busy, overloaded in some way?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {Boolean}
 */
Alchemy.setMethod(function isTooBusy() {

	// First check if it's too busy because of lag
	if (this.toobusy()) {
		return true;
	}

	// Then check the load average
	return this.systemLoad() > 90;
});

/**
 * Is the server too busy for requests?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {Boolean}
 */
Alchemy.setMethod(function isTooBusyForRequests() {

	// If a queue already exists, the server's lag might be quite good
	// BECAUSE requests are being queued.
	if (Classes.Alchemy.Conduit.Postponement.queue_length > 5) {
		return true;
	}

	return this.isTooBusy();
});

/**
 * Is the server too busy for AJAX too?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {Boolean}
 */
Alchemy.setMethod(function isTooBusyForAjax() {

	if (!this.isTooBusyForRequests()) {
		return false;
	}

	let lag = this.lagInMs();

	if (lag > (alchemy.settings.toobusy * 3)) {
		return true;
	}

	return false;
});

/**
 * Start janeway
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  1.3.1
 *
 * @param    {Object}   options
 */
Alchemy.setMethod(function startJaneway(options) {

	if (this.Janeway.started) {
		return;
	}

	if (!options) {
		options = {};
	}

	if (options.stream) {
		let that = this,
		    screen,
		    out;

		out = new require('net').Socket({fd: 4, writable: true});

		out.columns = 80;
		out.rows = 24;

		screen = this.Janeway.createScreen({
			input     : process.stdin,
			terminal  : 'xterm-256color',
			output    : out
		});

		options.screen = screen;

		// Also output to stdout
		options.output_to_stdout = true;

		// Keep regular stdout color
		options.keep_color = true;

		// Don't mess with the indentation
		options.change_indent = false;

		options.extra_output = out;

		this.on('janeway_propose_geometry', function onProposeGeometry(data) {
			out.columns = data.cols || data.width;
			out.rows = data.rows || data.height;
			out.emit('resize');
		});

		screen.on('resize', function onResize(a, b) {
			that.Janeway.redraw();
		});

		this.on('janeway_redraw', function onRedrawRequest() {
			that.Janeway.reloadScreen();
		});
	}

	this.Janeway.started = true;
	this.Janeway.start(options);

	if (this.settings.title) {
		let title = this.settings.title;

		if (this.settings.titleized) {
			title = 'Alchemy: ' + title;
		}

		this.Janeway.setTitle(title);
	}

	if (this.settings.session_menu) {

		let session_menu = this.Janeway.addIndicator('⌨ ');

		if (!session_menu.addItem) {
			return session_menu.remove();
		}

		this.Janeway.session_menu = session_menu;
	}

	if (this.settings.lag_menu) {
		let lag_menu = this.Janeway.addIndicator('0 ms');

		setInterval(() => {
			lag_menu.setIcon(this.lagInMs() + ' ms');
			this.Janeway.redraw();
		}, 900).unref();

		this.Janeway.lag_menu = lag_menu;
	}

});

/**
 * Log messages of level 5 (info)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 */
Alchemy.setMethod(function log(...args) {
	return alchemy.printLog(5, args, {level: 3});
});

/**
 * Actually print a log message
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.0
 * @version  1.1.0
 *
 * @param    {Number}   level
 * @param    {Array}    args
 * @param    {Object}   options
 */
Alchemy.setMethod(function printLog(level, args, options) {

	var type,
	    line;

	if (this.settings.silent) {
		return;
	}

	if (!Array.isArray(args)) {
		args = [args];
	}

	if (typeof level == 'string') {
		type = level;
	} else {
		if (level < 3) {
			type = 'error';
		} else if (level < 5) {
			type = 'warn';
		} else {
			type = 'info';
		}
	}

	if (this.Janeway != null) {
		line = this.Janeway.print(type, args, options);

		if (options && options.gutter && line) {
			line.setGutter(options.gutter)
		}

		return line;
	} else {
		console[type](...args);
	}
});

/**
 * Load the settings
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.0
 * @version  1.1.6
 */
Alchemy.setMethod(function loadSettings() {

	var default_path,
	    port_error,
	    local_path,
	    env_config,
	    env_path,
	    settings,
	    local,
	    env;

	if (this.settings) {
		return;
	}

	// Create the settings object
	this.settings = settings = {};

	// Generate the path to the default settings file
	default_path = libpath.resolve(PATH_ROOT, 'app', 'config', 'default');

	// Get default settings
	try {
		Object.assign(settings, require(default_path));
	} catch (err) {
		settings.no_default_file = default_path;
	}

	// Generate the path to the local settings file
	local_path = libpath.resolve(PATH_ROOT, 'app', 'config', 'local');

	// Get the local settings
	try {
		local = require(local_path);
	} catch(err) {
		local = {};
		settings.no_local_file = local_path;
	}

	// Default to the 'dev' environment
	if (!local.environment) {

		if (process.env.ENV) {
			local.environment = process.env.ENV;
		} else {
			local.environment = 'dev';
		}
	}

	env = this.argv.env || this.argv.environment;

	if (env) {
		local.environment = env;
		this.printLog(this.INFO, ['Switching to environment', env]);
	}

	// Generate the path to the environment settings file
	env_path = libpath.resolve(PATH_APP, 'config', local.environment, 'config');

	// Get the config
	try {
		env_config = require(env_path);
	} catch(err) {
		env_config = {};
		settings.no_env_file = env_path;
	}

	// Merge all the settings in order: default - environment - local
	Object.merge(settings, env_config, local);

	if (!settings.name) {
		settings.name = this.package.name;
	}

	if (settings.title == null) {
		if (this.package.title) {
			// Allow users to set the title in their package file
			settings.title = this.package.title;
		} else if (settings.name) {
			settings.title = settings.name.replace(/-/g, ' ').titleize();
			settings.titleized = true;
		}
	}

	if (this.argv.port) {
		let port = parseInt(this.argv.port);

		if (port) {
			this.printLog(this.INFO, ['Using port setting from argument:', port]);
			settings.port = port;
		} else {
			this.argv.socket = this.argv.port;
			this.argv.port = null;
		}
	}

	if (this.argv.socket) {
		settings.port = false;
		settings.socket = this.argv.socket;

		let stat;

		try {
			stat = fs.statSync(settings.socket);
		} catch (err) {
			// Ignore if it doesn't exist yet
		}

		if (stat && stat.isDirectory()) {
			settings.socket = libpath.resolve(settings.socket, settings.name + '.alchemy.sock');
		}

		this.printLog(this.INFO, ['Using socket setting from argument:', settings.socket]);
	}

	if (!settings.port && settings.port !== false) {
		settings.port = 3000;
	}

	if (settings.port > 49151) {
		port_error = 'Could not use port number ' + String(port).bold.red + ' because ';

		// Make sure the port is valid
		if (settings.port > 65535) {
			this.printLog(this.FATAL, [port_error + 'there is no port higher than 65535. Please use ports below 49151.']);
		} else {
			this.printLog(this.FATAL, [port_error + 'it\'s an ephemeral port. Please use ports below 49151.']);
		}

		process.exit();
	}

	if (this.argv.url) {
		settings.url = this.argv.url;
	}

	if (settings.url && settings.url.indexOf('{') > -1) {
		settings.url = settings.url.assign(settings);
	}

	if (this.argv.preload) {
		settings.preload = this.argv.preload;

		if (Array.isArray(settings.preload)) {
			settings.preload = settings.preload.last();
		}
	}

	if (settings.preload == 'false') {
		settings.preload = false;
	}

	let key,
	    val;

	for (key in this.argv) {

		if (!key.startsWith('override-')) {
			continue;
		}

		val = this.argv[key];
		key = key.after('override-');

		if (!settings[key] || typeof settings[key] != 'object') {
			settings[key] = val;
		} else {
			Object.merge(settings[key], val);
		}
	}

	if (settings.preload) {
		this.doPreload();
	}

	// Set the debug value
	global.DEBUG = settings.debug;
});

/**
 * Set status
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.1
 * @version  0.4.1
 */
Alchemy.setMethod(function setStatus(name, value) {
	this.status[name] = value;
});

/**
 * Execute the function when alchemy is ready
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.1.2
 *
 * @param    {Function}   callback   The function to execute
 *
 * @return   {Pledge}
 */
Alchemy.setMethod(function ready(callback) {

	var that = this,
	    pledge = new Pledge();

	pledge.done(callback);

	if (!this.sputnik) {
		Blast.loaded(function hasLoaded() {
			pledge.resolve(that.ready());
		});
	} else {
		this.sputnik.after(['start_server', 'datasources', 'listening'], function afterReady() {
			pledge.resolve();
		});
	}

	return pledge;
});

/**
 * Preload the client-side stuff
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.2
 * @version  1.1.2
 */
Alchemy.setMethod(async function doPreload() {

	await this.ready();

	let url;

	if (this.settings.url) {
		url = this.settings.url;
	} else if (this.settings.port) {
		url = 'http://localhost:' + this.settings.port;
	}

	if (url) {
		log.info('Preloading url', url);
		Blast.fetch(url);

		url += '/hawkejs/hawkejs-client.js';

		log.info('Preloading client file via HTTP', url);
		Blast.fetch(url);
	} else {
		log.info('Preloading client file');

		Blast.getClientPath({
			modify_prototypes : true,
			create_source_map : alchemy.settings.debug,
			enable_coverage   : !!global.__coverage__
		});
	}
});

/**
 * Resolve the provided arguments to a useable path string.
 * Only used strings, discards objects.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param   {String}   path_to_dirs   The path containing the dirs to load
 */
Alchemy.setMethod(function pathResolve(...path_to_dirs) {

	var path_arguments,
	    i;

	if (path_to_dirs.length == 1) {
		return path_to_dirs[0];
	}

	path_arguments = [];

	for (i = 0; i < path_to_dirs.length; i++) {
		if (typeof path_to_dirs[i] == 'string') {
			path_arguments.push(path_to_dirs[i]);
		}
	}

	if (path_arguments.length > 1) {
		return libpath.resolve(...path_arguments);
	} else {
		return path_arguments[0];
	}
});

/**
 * A wrapper function for requiring modules
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param   {String}   module_name    The name/path of the module to load
 * @param   {String}   register_as    Cache the module under this name
 * @param   {Object}   options        Extra options
 * @param   {Boolean}  options.force  Force a new requirement and do not cache
 *
 * @return  {Object}   The required module
 */
Alchemy.setMethod(function use(module_name, register_as, options) {

	var module,
	    result;

	if (typeof register_as == 'object') {
		options = register_as;
		register_as = false;
	}

	// Certain modules can be disabled by registering them as null
	if (module_name == null && register_as) {
		this.modules[register_as] = null;
		return null;
	}

	// If the module has explicitly been set to null, return that
	if (this.modules[module_name] === null) {
		return null;
	}

	if (typeof options == 'undefined') options = {};
	if (typeof options.force == 'undefined') options.force = false;

	// If a module has already been registered under this name, return that
	if (this.modules[module_name] && !options.force) {
		return this.modules[module_name];
	}

	if (this.argv['debug-requirements']) {
		this.printLog(this.DEBUG, ['Going to load module', module_name], {level: 2});
	}

	try {
		result = this.findModule(module_name, options);
		module = result.module;
	} catch (err) {

		if (!useErrors[module_name]) {
			useErrors[module_name] = 0;
		}

		useErrors[module_name]++;

		if (!options.silent || this.argv['debug-requirements']) {
			this.printLog(this.SEVERE, ['Failed to load module "' + module_name + '":', err.message], {level: 6, err: err});
		}
		return;
	}

	if (!usedModules[module_name]) {

		let entry = {
			internal : result.internal,
			loaded   : 0
		};

		if (result.package) {
			entry.version = result.package.version;
		}

		usedModules[module_name] = result;
	}

	usedModules[module_name].loaded++;

	if (register_as) {
		this.modules[register_as] = module;
	}

	// If a new requirement needs to be forced, clear the cache
	if (options.force) {
		delete require.cache[result.module_path];
		return require(result.module_path);
	}

	return module;
});

/**
 * Look for a module by traversing the filesystem
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param    {String}   startPath    The path to originate the search from
 * @param    {String}   moduleName
 * @param    {Number}   recurse
 *
 * @return   {String}
 */
Alchemy.setMethod(function searchModule(startPath, moduleName, recurse) {

	var moduledirs,
	    module_path,
	    entries,
	    nmPath,
	    temp,
	    path,
	    key,
	    i;

	// Don't do this search if it hasn't been enabled
	// The new npm flat structure makes this an expensive thing to do
	if (!this.settings.search_for_modules) {

		// Set recurse to 3, so this is the first and last call
		recurse = 3;

		// Only add 2 folder to look through,
		// the alchemymvc node_modules folder
		// and the base node_modules folder
		moduledirs = ['..', libpath.resolve(startPath, 'node_modules', 'alchemymvc')];

		// Add plugin folders
		if (!plugModules) {
			path = libpath.resolve(PATH_ROOT, 'node_modules');

			if (fs.existsSync(path)) {

				// Get all the entries in the main modules folder
				entries = fs.readdirSync(libpath.resolve(PATH_ROOT, 'node_modules'));

				// Initiate the plugin modules variables
				plugModules = [];


				for (i = 0; i < entries.length; i++) {
					temp = entries[i];

					if (temp.startsWith('alchemy-')) {
						plugModules.push(libpath.resolve(PATH_ROOT, 'node_modules', temp));
					}
				}
			} else {
				plugModules = [];
			}
		}

		for (i = 0; i < plugModules.length; i++) {
			moduledirs.push(plugModules[i]);
		}

	} else if (!searchModule.have_warned) {
		searchModule.have_warned = true;
		log.warn('The "search_for_modules" config has been enabled!');
	}

	if (!recurse) {
		recurse = 1;
	}

	nmPath = libpath.resolve(startPath, 'node_modules');

	if (!moduledirs) {
		// Get all the entries inside the given path
		try {
			moduledirs = fs.readdirSync(nmPath);
		} catch(err) {
			return;
		}
	}

	// Look in the base node_modules directory first
	if (recurse == 1) {
		moduledirs.unshift('..');
	}

	// Go over every directory in the main node_modules folder
	for (i = 0; i < moduledirs.length; i++) {

		key = moduledirs[i];

		try {
			// Let require find the specific file to get
			module_path = require.resolve(libpath.resolve(nmPath, key, 'node_modules', moduleName));

			// If no errors have popped up now, we can break the for loop
			break;

		} catch(e) {
			// Do nothing
		}
	}

	if (!module_path && recurse < 3) {
		for (i = 0; i < moduledirs.length; i++) {

			module_path = this.searchModule(libpath.resolve(nmPath, moduledirs[i]), moduleName, recurse+1);

			if (module_path) {
				break;
			}
		}
	}

	return module_path;
});

/**
 * Find a module in our customized file structure
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.2.7
 *
 * @param    {String}   moduleName
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Alchemy.setMethod(function findModule(moduleName, options) {

	var package_json,
	    module_path,
	    internal,
	    module,
	    result,
	    time,
	    key,
	    i;

	if (!options) {
		options = {};
	}

	if (options.require == null) {
		options.require = true;
	}

	// If we've required this once before, return it
	if (result = usePaths[moduleName]) {
		if (result.err) {
			throw result.err;
		}

		// Only return the cached module if it was required then,
		// or if require is now false
		if (result.module || !options.require) {
			return result;
		}
	}

	result = {
		err         : null,
		module      : null,
		module_dir  : null,
		module_path : null,
		package     : null,
		internal    : null,
		search_time : null,
	};

	time = Date.now();

	// Simply try to resolve the module by name
	try {
		module_path = require.resolve(moduleName);
	} catch (err) {
		result.err = err;
	}

	// If that path wasn't found, look through the root node_modules
	if (result.err) {
		try {
			module_path = this.searchModule(PATH_ROOT, moduleName);
		} catch (err) {
			console.log(err);
			return;
		}
	}

	// If the module_path was found, actually require the module
	if (module_path) {

		// Get the package.json file
		if (~module_path.indexOf(libpath.sep)) {
			internal = false;

			let last_piece = moduleName.split(libpath.sep).last(),
			    package_path,
				package_base;
			
			let module_dir = libpath.dirname(module_path);
			result.module_dir = module_dir;

			// If the path doesn't end with the module name, look for it
			if (!module_path.endsWith(last_piece)) {
				package_base = (module_path.beforeLast(last_piece) + last_piece).split(libpath.sep);
			} else {
				package_base = module_dir.split(libpath.sep);
			}

			//package_path = libpath.resolve(package_path, 'package.json');

			while (package_base.length) {

				package_path = libpath.resolve(package_base.join(libpath.sep), 'package.json');

				try {
					package_json = require(package_path);
				} catch (err) {
					package_json = false;
				}

				if (package_json) {
					if (package_json.name != moduleName) {
						package_json = false;
					}

					break;
				}

				package_base.pop();
			}

			if (package_json) {
				module_dir = package_base.join(libpath.sep);
				result.module_dir = module_dir;
			}

		} else {
			internal = true;
			package_json = {
				version: process.versions.node
			};
		}

		// Modules are required by default
		if (options.require) {
			if (package_json && package_json.type == 'module' && !(package_json.main && package_json.module)) {
				module = doImport(module_path)
			} else {
				module = require(module_path);
			}
		}
	}

	if (!options.require || module) {
		result.err = null;
	}

	if (module) {
		result.module = module;
	}

	result.module_path = module_path;
	result.package = package_json;
	result.internal = internal;

	// Save the result
	usePaths[moduleName] = result;

	// If there was an error, throw it now
	if (result.err) {
		throw result.err;
	}

	result.search_time = Date.now() - time;

	// Else return the result
	return result;
});

/**
 * Create a shared object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param   {String}   name   The name of the object to get
 * @param   {String}   type   The type to create (array or object)
 *
 * @return  {Object|Array}
 */
Alchemy.setMethod(function shared(name, type, value) {

	if (typeof type !== 'string') {
		value = type;
		type = 'object';
	}

	// Create it if it doesn't exist
	if (!shared_objects[name]) {
		if (type === 'array' || type === 'Array') {
			shared_objects[name] = value || [];
		} else {
			shared_objects[name] = value || {};
		}
	}

	return shared_objects[name];
});

/**
 * Get an object id,
 * return undefined if no valid data was given (instead of throwing an error)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param    {String|ObjectID}   obj
 *
 * @return   {ObjectID|undefined}
 */
Alchemy.setMethod(function castObjectId(obj) {

	var type = typeof obj;

	if (obj && type === 'object' && obj.constructor && obj.constructor.name === 'ObjectID') {
		return obj;
	} else if (type === 'string' && obj.isObjectId()) {
		return alchemy.ObjectId(obj);
	}

	return undefined;
});

/**
 * See if the given object is a stream
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.5
 *
 * @return   {Boolean}
 */
Alchemy.setMethod(function isStream(obj) {
	return obj && (typeof obj._read == 'function' || typeof obj._write == 'function') && typeof obj.on === 'function';
});

/**
 * Get or create a new cache instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.3.0
 *
 * @param    {String}          name
 * @param    {Number|Object}   options
 *
 * @return   {Develry.Cache}
 */
Alchemy.setMethod(function getCache(name, options) {

	var instance,
	    duration,
	    config,
	    type;

	if (this.caches[name]) {
		return this.caches[name];
	}

	if (!options) {
		options = {};
	}

	type = typeof options;

	if (type == 'number' || type == 'string') {
		options = {
			max_age : options,
		};
	}

	config = Object.assign({
		name,
		max_length : 5000,
	}, options);

	instance = new Blast.Classes.Develry.Cache(config);

	this.caches[name] = instance;

	return instance;
});

/**
 * Get a route
 *
 * @author    Jelle De Loecker   <jelle@elevenways.be>
 * @since     1.1.3
 * @version   1.3.0
 *
 * @param     {String}   href         The href or route name
 * @param     {Object}   parameters   Route parameters
 * @param     {Object}   options
 *
 * @return    {String}
 */
Alchemy.setMethod(function routeUrl(href, parameters, options) {

	let temp = Router.getUrl(href, parameters, options);

	if (temp && temp.href) {
		temp = String(temp);

		if (temp) {
			return temp;
		}
	}

	return href;
});

/**
 * Get paths that should be cached by the client
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @return   {Pledge}
 */
Alchemy.decorateMethod(Blast.Decorators.memoize(), function getAppcachePaths() {

	var paths = [];

	return Function.parallel(function getHawkejsTemplates(next) {

		var templates = [],
		    directories = alchemy.hawkejs.directories.getSorted(),
		    tasks = [],
		    i;

		function checkDirectory(dir_path, mount_path, next) {
			fs.readdir(dir_path, function gotDir(err, files) {

				if (err) {

					if (err.code == 'ENOENT') {
						return next();
					}

					return next(err);
				}

				let tasks = [],
				    i;

				for (i = 0; i < files.length; i++) {
					let file = files[i],
					    full_path = libpath.resolve(dir_path, file),
					    full_mount_path = mount_path + '/' + file;

					tasks.push(function checkPath(next) {
						fs.stat(full_path, function gotStat(err, stat) {

							if (err) {

								if (err.code == 'ENOENT') {
									return next();
								}

								return next(err);
							}

							if (stat.isDirectory()) {
								return checkDirectory(full_path, full_mount_path, next);
							}

							if (stat.isFile()) {
								if (file.endsWith('.ejs') || file.endsWith('.hwk')) {

									if (full_mount_path[0] == '/') {
										full_mount_path = full_mount_path.slice(1);
									}

									templates.push(full_mount_path);
								}
							}

							next();
						});
					});
				}

				Function.parallel(tasks, next);
			});
		}

		for (i = 0; i < directories.length; i++) {
			let directory = directories[i];

			tasks.push(function readDir(next) {
				checkDirectory(directory, '', next);
			});
		}

		return Function.parallel(tasks, function done(err) {

			if (err) {
				return next(err);
			}

			let path,
			    url,
			    i;

			for (i = 0; i < templates.length; i++) {
				path = templates[i];
				url = '/hawkejs/templates?name[0]=' + encodeURIComponent(path.beforeLast('.ejs')) + '&v=' + alchemy.package.version;
				paths.push(url);
			}

			next();
		});
	}, function done(err) {

		if (err) {
			return;
		}

		return paths;
	});
});

/**
 * Get the appcache manifest text
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @return   {Pledge}
 */
Alchemy.decorateMethod(Blast.Decorators.memoize(), function getAppcacheManifest() {

	return Function.series(function gotPaths(next) {
		alchemy.getAppcachePaths().done(next);
	}, function createText(err, result) {

		if (err) {
			return;
		}

		let manifest = 'CACHE MANIFEST\n\n',
		    entry,
		    url,
		    key,
		    i;

		manifest += 'CACHE:\n';

		// Allways add the client script
		manifest += '/hawkejs/hawkejs-client.js?v=' + alchemy.package.version + '\n';

		if (ac_entries.cache && ac_entries.cache.length) {
			for (key in ac_entries.cache) {
				manifest += ac_entries.cache[key].url + '\n';
			}
		}

		for (i = 0; i < result[0].length; i++) {
			url = result[0][i];

			manifest += url + '\n';
		}

		manifest += '\n';
		manifest += 'NETWORK:\n*\n\n';

		// This will cause a cache update each time the server is reset
		manifest += '#' + alchemy.package.version + '-' + alchemy.discovery_id;

		return manifest;
	});
});

/**
 * Add an appcache entry
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {String|Object}
 */
Alchemy.setMethod(function addAppcacheEntry(entry) {

	if (typeof entry == 'string') {
		entry = {
			url : entry
		};
	}

	if (!entry.type) {
		entry.type = 'cache';
	} else {
		entry.type = entry.type.toLowerCase();
	}

	if (!ac_entries[entry.type]) {
		ac_entries[entry.type] = [];
	}

	ac_entries[entry.type].push(entry);
});

/**
 * Get the body of an IncomingMessage
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.3.0
 *
 * @param    {IncomingMessage}   req
 * @param    {OutgoingMessage}   res       Optional
 * @param    {Function}          callback
 */
Alchemy.setMethod(function parseRequestBody(req, res, callback) {

	const conduit = req.conduit;

	if (typeof res == 'function') {
		callback = res;
		res = null;
	}

	if (req.original) {
		req = req.original;
	}

	if (req.body != null) {
		return callback(null, req.body);
	}

	// Multipart data is handled by "formidable"
	if (req.headers['content-type'] && req.headers['content-type'].startsWith('multipart/form-data')) {

		let form = new formidable.IncomingForm({
			multiples     : true,
			hashAlgorithm : alchemy.settings.file_hash_algorithm || 'sha1',
		});

		form.parse(req, function parsedMultipart(err, form_fields, form_files) {

			var fields = {},
			    files = {},
			    key;

			if (err && req.conduit && req.conduit.aborted) {
				return callback(null);
			}

			// Fix the field names
			for (key in form_fields) {
				Object.setFormPath(fields, key, form_fields[key]);
			}

			// Fix the file names
			for (key in form_files) {
				Object.setFormPath(files, key, form_files[key]);
			}

			if (err) {
				log.error('Error parsing multipart POST', {err: err});
				req.body = {};
				req.files = {};
			} else {
				req.body = fields;
				req.files = files;

				if (conduit) {
					conduit.setRequestBody(fields);
					conduit.setRequestFiles(files);
				}
			}

			callback(null, fields);
		});

		return;
	}

	// Regular form-encoded data
	if (req.headers['content-type'] && req.headers['content-type'].indexOf('form-urlencoded') > -1) {

		urlFormBody(req, res, function parsedBody(err) {

			if (err && req.conduit && req.conduit.aborted) {
				return callback(null);
			}

			// You can't send files using a regular post
			req.files = {};

			if (err) {
				log.error('Error parsing x-www-form-urlencoded body data', {err: err});
				req.body = {};
			} else {
				req.body = req.body;

				if (conduit) {
					conduit.setRequestBody(req.body);
				}
			}

			callback(null, req.body);
		});

		return;
	}

	// Any other encoded data (like JSON)
	anyBody(req, function parsedBody(err, body) {

		if (err && req.conduit && req.conduit.aborted) {
			return callback(null);
		}

		// You can't send files using a regular post
		req.files = {};

		if (err) {
			log.error('Error parsing body data', {err: err});
			req.body = {};
		} else {
			req.body = body;

			if (conduit) {
				conduit.setRequestBody(body);
			}
		}

		callback(null, req.body);
	});
});

/**
 * Export all data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @return   {Stream}
 */
Alchemy.setMethod(function createExportStream(options) {

	var stream = new require('stream').PassThrough();

	this.exportToStream(stream, options);

	return stream;
});

/**
 * Export all data to stream
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {Stream}   output
 * @param    {Object}   options
 *
 * @return   {Pledge}
 */
Alchemy.setMethod(function exportToStream(output, options) {

	if (!alchemy.isStream(output)) {
		if (!options) {
			options = output;
			output = null;
		}

		output = options.output;
	}

	if (!output) {
		return Pledge.reject(new Error('No target output stream has been given'));
	}

	if (!options) {
		options = {};
	}

	let tasks = [],
	    i;

	for (i = 0; i < Model.children.length; i++) {
		let model = Model.children[i];

		tasks.push(async function exportModel(next) {
			await (new model).exportToStream(output);
			next();
		});
	}

	return Function.series(tasks, function done(err) {

		if (err) {
			return output.emit('error', err);
		}

		output.end();
	});
});

/**
 * Import from a stream
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {Stream}   input
 * @param    {Object}   options
 *
 * @return   {Pledge}
 */
Alchemy.setMethod(function importFromStream(input, options) {

	if (!alchemy.isStream(input)) {
		if (!options) {
			options = input;
			input = null;
		}

		input = options.input;
	}

	if (!input) {
		return Pledge.reject(new Error('No source input stream has been given'));
	}

	if (!options) {
		options = {};
	}

	let that = this,
	    current_type = null,
	    extra_stream,
	    pledge = new Pledge(),
	    stopped,
	    paused,
	    buffer,
	    model,
	    value,
	    seen = 0,
	    left,
	    size,
	    doc;

	input.on('data', function onData(data) {

		if (stopped) {
			return;
		}

		if (buffer) {
			buffer = Buffer.concat([buffer, data]);
		} else {
			buffer = data;
		}

		handleBuffer();
	});

	function handleBuffer() {

		if (paused) {
			return;
		}

		if (!current_type && buffer.length < 2) {
			return;
		}

		if (!current_type) {
			current_type = buffer.readUInt8(0);

			if (current_type == 0x01) {
				size = buffer.readUInt8(1);
				buffer = buffer.slice(2);
			} else if (current_type == 0x02 && buffer.length >= 5) {
				size = buffer.readUInt32BE(1);
				buffer = buffer.slice(5);
			} else if (current_type == 0xFF) {
				size = buffer.readUInt32BE(1);
				buffer = buffer.slice(5);
				seen = 0;

				if (!doc) {
					stopped = true;
					pledge.reject(new Error('Found extra import data, but no active document'));
				} else {
					extra_stream = new require('stream').PassThrough();
					doc.extraImportFromStream(extra_stream);
				}
			} else {
				// Not enough data? Wait
				current_type = null;
				return;
			}
		}

		handleRest();
	}

	function handleRest() {

		if (current_type == 0xFF) {
			left = size - seen;
			value = buffer.slice(0, left);

			seen += value.length;

			if (value.length == buffer.length) {
				buffer = null;
			} else if (value.length < buffer.length) {
				buffer = buffer.slice(left);
			}

			extra_stream.write(value);

			if (value.length == left) {
				extra_stream.end();
				current_type = null;

				if (buffer) {
					handleBuffer();
				}
			}

			return;
		}

		if (buffer.length >= size) {
			value = buffer.slice(0, size);
			buffer = buffer.slice(size);
		} else {
			// Wait for next call
			return;
		}

		if (current_type == 0x01) {
			value = value.toString();

			if (!model || model.model_name != value) {
				model = Model.get(value);
				doc = null;
			}

			if (!model) {
				stopped = true;
				return pledge.reject(new Error('Could not find Model "' + value + '"'));
			}

			current_type = null;
			size = 0;
		} else if (current_type == 0x02) {
			doc = model.createDocument();
			input.pause();
			paused = true;

			doc.importFromBuffer(value).done(function done(err, result) {

				if (err) {
					stopped = true;
					return pledge.reject(err);
				}

				current_type = null;
				paused = false;
				input.resume();

				handleBuffer();
			});

			return;
		}

		if (buffer && buffer.length) {
			handleBuffer();
		}
	}

	return pledge;
});

/**
 * Create a new schema
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.2.1
 *
 * @param    {*}   parent
 */
Alchemy.setMethod(function createSchema(parent) {
	let schema = new Classes.Alchemy.Schema(parent);
	return schema;
});

/**
 * Get a client-side model
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.4
 * @version  1.2.4
 *
 * @param   {String}   name
 * @param   {Object}   options
 *
 * @return  {Model}
 */
Alchemy.setMethod(function getClientModel(name, init, options) {
	return Classes.Alchemy.Client.Base.prototype.getModel.call(this, name, init, options);
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
DEFINE('alchemy', new Alchemy());

/**
 * Define the log function
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @type     {Function}
 */
DEFINE('log', alchemy.log);

for (let key in alchemy.Janeway.LEVELS) {
	let name = key.toLowerCase();
	let val = alchemy.Janeway.LEVELS[key];

	log[name] = function(...args) {
		return alchemy.printLog(val, args, {level: 2});
	};
}

log.warn = log.warning;

/**
 * Define the todo log function
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @type     {Function}
 */
log.todo = function todo(...args) {

	var options = {
		gutter: alchemy.Janeway.esc(91) + '\u2620 Todo:' + alchemy.Janeway.esc(39),
		level: 2
	};

	return alchemy.printLog(alchemy.TODO, args, options);
};

const anyBody        = alchemy.use('body/any'),
      formBody       = alchemy.use('body/form'),
      formidable     = alchemy.use('formidable'),
      bodyParser     = alchemy.use('body-parser'),
      urlFormBody    = bodyParser.urlencoded({extended: true});