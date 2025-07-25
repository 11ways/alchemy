let shared_objects = {},
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.4.0
 */
global.Alchemy = Function.inherits('Alchemy.Base', function Alchemy() {

	// Only allow a single instance of the Alchemy class
	if (global.alchemy) {
		return global.alchemy;
	}

	let that = this,
	    package_json;

	// Timestamp when alchemy started
	this.start_time = Date.now();

	// Current working directory
	this.cwd = process.cwd();

	// Parsed arguments
	this.argv = parseArgs(process.argv.slice(2));

	// The id of this server instance
	this.discovery_id = Crypto.pseudoHex();

	// Weighted error handlers
	this.error_handlers = new Deck();

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

	// Extra toobusy checks
	this.extra_toobusy_checks = [];

	// Also store the version in the process versions object
	process.versions.alchemy = this.version;

	// Also store the version of the app
	process.versions.alchemy_app = this.package.version;

	// Distinct problems
	this.distinct_problems = new Map();

	// Custom handlers
	this.custom_handlers = new Map();

	// Load the settings
	this.loadSettings();

	// Initialize the error handler
	initializeErrorHandler.call(this);

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
		if (typeof log != 'undefined') {
			log.warn('Failed to start Janeway:', err);
		} else {
			console.warn('Failed to start Janeway:', err);
		}
	}

	this.any_body = this.use('body/any');
	this.text_body = this.use('body');
	this.formidable = this.use('formidable');
	this.body_parser = this.use('body-parser');
});

/**
 * See if running janeway is allowed
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.5.0
 * @version  0.5.0
 *
 * @type     {boolean}
 */
Alchemy.prepareProperty(function allow_janeway() {

	// Setting the --disable-janeway flag explicitly disabled ALL forms of janeway
	if (this.argv['disable-janeway'] || process.env.DISABLE_JANEWAY) {
		return false;
	}

	// You can also disable janeway in the settings
	if (this.settings.debugging.enable_janeway === false) {
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.5.0
 * @version  1.0.4
 *
 * @type     {Develry.Cache}
 */
Alchemy.prepareProperty(function sessions() {

	var cache = this.getCache('sessions', {
		max_idle   : this.settings.sessions.duration,
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Develry.Cache}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.4.0
 * @version  0.4.0
 *
 * @type     {string}
 */
Alchemy.setProperty(function environment() {
	return this.settings.environment;
}, function set_environment(value) {
	this.setSetting('environment', String(value));
	return this.settings.environment;
});

/**
 * Add a getter for the total amount of http requests
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @type     {number}
 */
Alchemy.setProperty(function http_request_counter() {
	return 0;
});

/**
 * Get the current lag in ms
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {number}
 */
Alchemy.setMethod(function lagInMs() {
	return this.toobusy.lag();
});

/**
 * Get the system load as percentage points
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {number}
 */
Alchemy.setMethod(function systemLoad() {

	let load_average = os.loadavg();

	const percentage = ~~((load_average[0] / this.cpu_core_count) * 100);

	return percentage;
});

/**
 * Register an extra toobusy check method.
 * These will be checked after event loop lag & system load are deemed OK.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.2
 * @version  1.3.2
 */
Alchemy.setMethod(function addToobusyCheck(fnc) {
	this.extra_toobusy_checks.push(fnc);
});

/**
 * Is the server currently too busy, overloaded in some way?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.2
 *
 * @return   {boolean}
 */
Alchemy.setMethod(function isTooBusy() {

	// First check if it's too busy because of event loop lag
	if (this.toobusy()) {
		return true;
	}

	const max_system_load = this.settings.performance.max_system_load;

	if (max_system_load > 0) {
		// Then check the load average
		if (this.systemLoad() > max_system_load) {
			return true;
		}
	}

	if (this.extra_toobusy_checks.length > 0) {

		for (let fnc of this.extra_toobusy_checks) {
			try {
				if (fnc()) {
					return true;
				}
			} catch (err) {
				this.distinctProblem('error-extra-toobusy-check', 'Extra toobusy check failed', {error: err});
			}
		}
	}

	return false;
});

/**
 * Is the server too busy for requests?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {boolean}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.18
 *
 * @return   {boolean}
 */
Alchemy.setMethod(function isTooBusyForAjax() {

	if (!this.isTooBusyForRequests()) {
		return false;
	}

	let max_event_loop_lag = this.settings.performance.max_event_loop_lag ?? this.settings.performance.toobusy;

	if (max_event_loop_lag) {
		let lag = this.lagInMs();

		if (lag > (max_event_loop_lag * 3)) {
			return true;
		}
	}

	return false;
});

/**
 * Set the maximum event loop lag before the server is considered overloaded
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.18
 * @version  1.3.18
 *
 * @param    {number}   max_lag
 */
Alchemy.setMethod(function setMaxEventLoopLag(max_lag) {

	if (typeof max_lag != 'number' || !isFinite(max_lag)) {
		max_lag = null;
	}

	if (max_lag == null) {
		max_lag = 70;
	}

	this.setSetting('performance.max_event_loop_lag', max_lag);
});

/**
 * Called after the server has started
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.4.0
 */
Alchemy.setMethod(function afterStart() {
	
});

/**
 * Is the given PID running?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {number}   pid
 *
 * @return   {boolean}
 */
Alchemy.setMethod(function isProcessRunning(pid) {

	if (!pid) {
		return false;
	}

	try {
		return process.kill(pid, 0);
	} catch (e) {
		return e.code === 'EPERM'
	}
});

/**
 * Start janeway
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.5.0
 * @version  1.4.0
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
});

/**
 * Log messages of level 5 (info)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 */
Alchemy.setMethod(function log(...args) {
	return this.printLog(5, args, {level: 3});
});

/**
 * Actually print a log message
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.4.0
 * @version  1.1.0
 *
 * @param    {number}   level
 * @param    {Array}    args
 * @param    {Object}   options
 */
Alchemy.setMethod(function printLog(level, args, options) {

	var type,
	    line;

	if (this.settings.debugging.silent) {
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
 * Set a setting value (without triggering actions)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}     path       The path of the setting (without system prefix)
 * @param    {Mixed}      value
 */
Alchemy.setMethod(function setSetting(path, value) {
	this.system_settings.setPathSilently(path, value);

	if (this.started) {
		this.refreshSettingsObject();
	}
});

/**
 * Refresh the settings object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Alchemy.setMethod(function refreshSettingsObject() {
	this.settings = this.system_settings.toObject();
});

/**
 * Get a setting value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}     path       The path of the setting (without system prefix)
 */
Alchemy.setMethod(function getSetting(path) {
	
	let value = this.getSettingValueInstance(path);

	if (value) {
		return value.get();
	}
});

/**
 * Get a setting value instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}     path       The path of the setting (without system prefix)
 */
Alchemy.setMethod(function getSettingValueInstance(path) {
	return this.system_settings.getPath(path);
});

/**
 * Execute the action linked to a setting
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}     path   The path of the setting (without system prefix)
 */
Alchemy.setMethod(function executeSetting(path) {

	let value = this.getSettingValueInstance(path);

	if (value) {
		return value.executeAction();
	}
});

/**
 * Load the initial hard-coded settings
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.4.0
 * @version  1.4.0
 */
Alchemy.setMethod(function loadSettings() {

	if (this.settings) {
		return;
	}

	// Create the settings scope
	const system = Classes.Alchemy.Setting.SYSTEM.generateValue();

	this.system_settings = system;
	let settings = this.settings = system.toProxyObject();

	// Generate the path to the default settings file
	let default_path = libpath.resolve(PATH_ROOT, 'app', 'config', 'default');

	// Get default settings
	try {
		let value = require(default_path);
		system.setDefaultValue(value);
	} catch (err) {
		this.setSetting('no_default_file', default_path);
	}

	// Generate the path to the local settings file
	let local_path = libpath.resolve(PATH_ROOT, 'app', 'config', 'local'),
	    local;

	// Get the local settings
	try {
		local = require(local_path);
	} catch(err) {
		local = {};
		this.setSetting('no_local_file', local_path);
	}

	// Default to the environment Protoblast has found
	if (!local.environment) {

		if (process.env.ENV) {
			local.environment = Blast.environment;
		} else {
			local.environment = 'dev';
		}
	}

	let env = this.argv.env || this.argv.environment;

	if (env) {
		local.environment = env;
		this.printLog(this.INFO, ['Switching to environment', env]);
	}

	if (local.environment === 'development') {
		local.environment = 'dev';
	}

	Blast.environment = local.environment;

	// Generate the path to the environment settings file
	let env_path = libpath.resolve(PATH_APP, 'config', local.environment, 'config');

	// Get the config
	try {
		let value = require(env_path);
		system.setValueSilently(value);
	} catch(err) {
		this.setSetting('no_env_file', env_path);
	}

	// And now overlay the final local settings
	system.setValueSilently(local);

	if (!settings.name) {
		this.setSetting('name', this.package.name);
	}

	if (this.getSetting('frontend.title') == null) {
		if (this.package.title) {
			// Allow users to set the title in their package file
			this.setSetting('frontend.title', this.package.title);
		} else if (settings.name) {
			let title = settings.name.replace(/-/g, ' ').titleize();
			this.setSetting('frontend.title', title);
		}
	}

	if (this.argv.port) {
		let port = parseInt(this.argv.port);

		if (port) {
			this.printLog(this.INFO, ['Using port setting from argument:', port]);
			this.setSetting('network.port', port);
		} else {
			this.setSetting('network.socket', this.argv.port);
			this.setSetting('network.port', null);
		}
	}

	if (this.argv.socket) {
		this.setSetting('network.port', false);
		this.setSetting('network.socket', this.argv.socket);
	}

	let socket = settings.network.socket;

	if (socket) {

		let stat;

		try {
			stat = fs.statSync(socket);
		} catch (err) {
			// Ignore if it doesn't exist yet
		}

		if (stat && stat.isDirectory()) {
			socket = libpath.resolve(socket, settings.name + '.alchemy.sock');
			this.setSetting('network.socket', socket);
		}

		this.printLog(this.INFO, ['Using socket setting:', socket]);
	}

	if (!settings.network.port && settings.network.port !== false) {
		this.setSetting('network.port', 3000);
	}

	let port = this.getSetting('network.port');

	if (port > 49151) {
		port_error = 'Could not use port number ' + String(port).bold.red + ' because ';

		// Make sure the port is valid
		if (port > 65535) {
			this.printLog(this.FATAL, [port_error + 'there is no port higher than 65535. Please use ports below 49151.']);
		} else {
			this.printLog(this.FATAL, [port_error + 'it\'s an ephemeral port. Please use ports below 49151.']);
		}

		process.exit();
	}

	if (this.argv.url) {
		this.setUrl(this.argv.url);
	} else {
		this.setUrl(settings.network.main_url);
	}

	if (settings.frontend.cookies.domain) {
		this.setCookieDomain(settings.frontend.cookies.domain);
	}

	if (this.argv.preload) {
		settings.preload = this.argv.preload;

		if (Array.isArray(settings.performance.preload)) {
			settings.preload = settings.preload.last();
		}
	}

	let key,
	    val;

	for (key in this.argv) {

		if (!key.startsWith('override-')) {
			continue;
		}

		val = this.argv[key];
		key = key.after('override-');

		this.setSetting(key, val);

		// if (!settings[key] || typeof settings[key] != 'object') {
		// 	settings[key] = val;
		// } else {
		// 	Object.merge(settings[key], val);
		// }
	}

	if (settings.debugging.debug) {
		if (settings.debugging.create_source_map == null) {
			this.setSetting('debugging.create_source_map', true);
		}
	}

	if (settings.performance.preload) {
		this.doPreload();
	}

	this.setMaxEventLoopLag(settings.performance.max_event_loop_lag);

	// Set the debug value
	global.DEBUG = settings.debugging.debug;
});

/**
 * Set the main url
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.18
 * @version  1.3.18
 *
 * @param    {RURL|string}   value
 */
Alchemy.setMethod(function setUrl(value) {

	if (value) {
		value = ''+value;

		if (value.indexOf('{') > -1) {
			value = value.assign(this.settings);
		}
	}

	this.setSetting('network.main_url', value);

	if (this.settings.frontend.cookies.domain === true || this.settings.frontend.cookies.domain == null) {
		this.setCookieDomain(value);
	}
});

/**
 * Get the main url (as a string)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Alchemy.setMethod(function getUrl() {
	return this.getSetting('network.main_url');
});

/**
 * Set the cookie domain
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.18
 * @version  1.3.18
 *
 * @param    {RURL|string}   value
 */
Alchemy.setMethod(function setCookieDomain(value) {

	if (value === false) {
		this.setSetting('frontend.cookies.domain', false);
		return;
	}

	if (!value) {
		value = this.settings.network.main_url;
	}

	if (!value) {
		return;
	}

	value = ''+value;

	if (value.indexOf('{') > -1) {
		value = value.assign(this.settings);
	}

	if (value.indexOf('/') > -1) {
		let url = RURL.parse(value);
		value = url.hostname;
	}

	this.setSetting('frontend.cookies.domain', value);
});

/**
 * Set status
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.4.1
 * @version  0.4.1
 */
Alchemy.setMethod(function setStatus(name, value) {
	this.status[name] = value;
});

/**
 * Execute the function when alchemy is ready
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.4.0
 *
 * @param    {Function}   callback   The function to execute
 *
 * @return   {Pledge}
 */
Alchemy.setMethod(function ready(callback) {

	let pledge = new Pledge();

	pledge.done(callback);

	STAGES.afterStages([
		'server.start',
		'datasource',
		'server.listening',
	], function hasLoaded() {
		pledge.resolve();
	});

	return pledge;
});

/**
 * Preload the client-side stuff
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.2
 * @version  1.4.0
 */
Alchemy.setMethod(async function doPreload() {

	await this.ready();

	let url;

	if (this.settings.network.main_url) {
		url = this.settings.network.main_url;
	} else if (this.settings.network.port) {
		url = 'http://localhost:' + this.settings.network.port;
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
			create_source_map : this.settings.debugging.create_source_map,
			enable_coverage   : !!global.__coverage__,
			debug             : this.settings.debugging.debug,
			environment       : this.environment,
		});
	}
});

/**
 * Resolve the provided arguments to a useable path string.
 * Only used strings, discards objects.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param    {string}   path_to_dirs   The path containing the dirs to load
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {string}   module_name    The name/path of the module to load
 * @param    {string}   register_as    Cache the module under this name
 * @param    {Object}   options        Extra options
 * @param    {boolean}  options.force  Force a new requirement and do not cache
 *
 * @return   {Object}   The required module
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.4.0
 *
 * @param    {string}   startPath    The path to originate the search from
 * @param    {string}   moduleName
 * @param    {number}   recurse
 *
 * @return   {string}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.3.17
 *
 * @param    {string}   moduleName
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

			let supports_cjs = package_json?.type != 'module';

			// Make sure this does not support CJS.
			// Some packages have the `module` type, but do have CJS exports too
			if (!supports_cjs) {

				if (package_json.module && package_json.main) {
					supports_cjs = true;
				} else {

					let exports = package_json.exports?.['.'];

					if (Array.isArray(exports)) {
						for (let entry of exports) {
							if (entry && typeof entry == 'object' && entry.require) {
								supports_cjs = true;
							}
						}
					} else if (exports?.require) {
						supports_cjs = true;
					}
				}
			}

			if (!supports_cjs) {
				module = import(module_path)
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param    {string}   name   The name of the object to get
 * @param    {string}   type   The type to create (array or object)
 *
 * @return   {Object|Array}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.3.16
 *
 * @param    {string|ObjectId}   obj
 *
 * @return   {ObjectId|undefined}
 */
Alchemy.setMethod(function castObjectId(obj) {

	let type = typeof obj;

	if (type === 'string' && obj.isObjectId()) {
		return this.ObjectId(obj);
	}

	if (obj && type === 'object') {
		let class_name = obj.constructor?.name;

		if (class_name == 'ObjectID' || class_name == 'ObjectId') {
			return obj;
		}
	}

	return undefined;
});

/**
 * See if the given object is a stream
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.0.5
 *
 * @return   {boolean}
 */
Alchemy.setMethod(function isStream(obj) {
	return obj && (typeof obj._read == 'function' || typeof obj._write == 'function') && typeof obj.on === 'function';
});

/**
 * Get or create a new cache instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.3.0
 *
 * @param    {string}          name
 * @param    {number|Object}   options
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
 * Prune all the caches
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Alchemy.setMethod(function pruneCaches(force_log = true) {

	let checked = 0,
	    pruned = 0;

	let do_log;

	if (force_log === 'auto') {
		do_log = alchemy.settings.debugging.debug;
	} else {
		do_log = force_log;
	}

	for (let key in this.caches) {
		let cache = this.caches[key];

		if (!cache) {
			continue;
		}

		checked++;
		let old_length = cache.length;

		for (let entry of cache) {
			// This triggers a check of all the entries
			// @TODO: Use cache.prune() instead, which will be fixed in next Protoblast version
		}

		let new_length = cache.length;

		if (new_length != old_length) {
			pruned++;
			if (do_log) {
				console.log('Pruned cache', cache, 'from', old_length, 'to', new_length);
			}
		}
	}

	if (do_log) {
		console.log('Checked', checked, 'caches and pruned', pruned, 'of them');
	}
});

/**
 * Get a route
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.3.0
 *
 * @param    {string}   href         The href or route name
 * @param    {Object}   parameters   Route parameters
 * @param    {Object}   options
 *
 * @return   {string}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {string|Object}
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
 * Get a size limit for the given route
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Route?}   route
 * @param    {string}   name
 */
function getRouteSizeLimit(route, name) {

	let global_size = alchemy.settings.network[name];

	if (!route) {
		return global_size;
	}

	let route_value = route.options[name];

	if (route_value == null || typeof route_value != 'number') {
		return global_size;
	}

	if (route_value <= 0) {
		return Infinity;
	}

	return route_value;
}

/**
 * Get the body of an IncomingMessage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
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

	const that = this;

	let content_type = req.headers['content-type'];

	let request_body_size_limit = getRouteSizeLimit(conduit?.route, 'request_body_size_limit');

	// Multipart data is handled by "formidable"
	if (content_type && content_type.startsWith('multipart/form-data')) {

		let request_individual_file_size_limit = getRouteSizeLimit(conduit?.route, 'request_individual_file_size_limit'),
		    request_total_file_size_limit = getRouteSizeLimit(conduit?.route, 'request_total_file_size_limit');

		let form = new this.formidable.IncomingForm({
			multiples     : true,
			hashAlgorithm : this.settings.data_management.file_hash_algorithm || 'sha1',
			minFileSize      : 0,
			allowEmptyFiles  : true,
			maxFileSize      : request_individual_file_size_limit,
			maxFieldsSize    : request_body_size_limit,
			maxTotalFileSize : request_total_file_size_limit,
		});

		form.parse(req, function parsedMultipart(err, form_fields, form_files) {

			if (err) {

				// Ignore the error if the request was already aborted
				if (conduit?.aborted) {
					return callback(null);
				}

				if (conduit) {
					return conduit.error(err);
				}

				return callback(err);
			}

			let fields = {},
			    files = {},
			    key;

			// Since formidable v3, all the fields are now arrays.
			// We already had a lot of logic to deal with this,
			// so we just have to un-array everything
			form_fields = undoFormidableArray(form_fields);
			form_files = undoFormidableArray(form_files);

			// Fix the field names
			for (key in form_fields) {
				Object.setFormPath(fields, key, form_fields[key]);
			}

			// Fix the file names
			for (key in form_files) {
				Object.setFormPath(files, key, form_files[key]);
			}

			req.body = fields;
			req.files = files;

			if (conduit) {
				conduit.setRequestBody(fields);
				conduit.setRequestFiles(files);
			}

			callback(null, fields);
		});

		return;
	}

	// Regular form-encoded data
	if (content_type && content_type.indexOf('form-urlencoded') > -1) {

		let url_form_body = this.body_parser.urlencoded({
			limit: request_body_size_limit,
			extended: true,
		});

		url_form_body(req, res, function parsedBody(err) {

			if (err) {

				// Ignore the error if the request was already aborted
				if (conduit?.aborted) {
					return callback(null);
				}

				if (conduit) {
					return conduit.error(err);
				}

				return callback(err);
			}

			// You can't send files using a regular post
			req.files = {};

			req.body = req.body;

			if (conduit) {
				conduit.setRequestBody(req.body);
			}

			callback(null, req.body);
		});

		return;
	}

	// Any other encoded data (like JSON)
	this.any_body(req, res, {limit: request_body_size_limit}, function parsedBody(err, body) {

		function handleResponse(err, body) {

			if (err) {

				// Ignore the error if the request was already aborted
				if (conduit?.aborted) {
					return callback(null);
				}

				if (conduit) {
					return conduit.error(err);
				}

				return callback(err);
			}

			// You can't send files using a regular post
			req.files = {};
			req.body = body;
	
			if (conduit) {
				conduit.setRequestBody(body);
			}
	
			callback(null, req.body);
		}

		if (err?.type == 'invalid.content.type') {
			if (!content_type || content_type.startsWith('text/')) {
				that.text_body(req, handleResponse);
				return;
			}
		}

		handleResponse(err, body);
	});
});

/**
 * Undo formidable's new array handling
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.16
 * @version  1.3.16
 *
 * @param    {Object}
 *
 * @return   {Object}
 */
function undoFormidableArray(data) {

	if (!data) {
		return {};
	}

	let result = {},
	    value,
	    key;

	for (key in data) {
		value = data[key];

		if (key.endsWith('[]')) {
			key = key.slice(0, -2);
		} else {
			value = value[0];
		}

		result[key] = value;
	}

	return result;
}

/**
 * Export all data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {Stream}   output
 * @param    {Object}   options
 *
 * @return   {Pledge}
 */
Alchemy.setMethod(function exportToStream(output, options) {

	if (!this.isStream(output)) {
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {Stream}   input
 * @param    {Object}   options
 *
 * @return   {Pledge}
 */
Alchemy.setMethod(function importFromStream(input, options) {

	if (!this.isStream(input)) {
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.4
 * @version  1.2.4
 *
 * @param    {string}   name
 * @param    {Object}   options
 *
 * @return   {Model}
 */
Alchemy.setMethod(function getClientModel(name, init, options) {
	return Classes.Alchemy.Client.Base.prototype.getModel.call(this, name, init, options);
});

let error_handler_count = 0;

/**
 * Register an error handler
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.11
 * @version  1.3.11
 *
 * @param    {Function}   callback
 * @param    {number}     weight
 */
Alchemy.setMethod(function registerErrorHandler(callback, weight) {

	const that = this;

	if (error_handler_count == 0) {
		process.on('uncaughtException', function onException(error) {
			that.registerError(error, {handled: false});
		});

		process.on('unhandledRejection', function onRejection(error, promise) {
			that.registerError(error, {promise, handled: false});
		});
	}

	error_handler_count++;

	if (weight == null) {
		weight = 10;
	}

	this.error_handlers.push(callback, weight);
});

/**
 * Process the given error
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.11
 * @version  1.3.11
 *
 * @param    {Error}     error
 * @param    {Object}    info
 */
Alchemy.setMethod(async function registerError(error, info = {}) {

	let handle_count = 0;

	if (!this.error_handlers.insertCount) {
		return handle_count;
	}

	let callback;

	for (callback of this.error_handlers) {
		let result = callback(error, info);

		handle_count++;

		if (result == null) {
			continue;
		}

		if (Pledge.isThenable(result)) {
			result = await result;
		}

		if (result === false) {
			break;
		}
	}

	return handle_count;
});

let starting;

/**
 * Only start the server after this function has been called
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
	STAGES.launch([
		'load_app',
		'datasource',
		'tasks',
		'settings',
		'routes',
		'server',
	]);

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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.3
 * @version  1.0.3
 *
 * @param    {Function}   callback   The optional callback after alchemy has stopped
 */
Alchemy.setMethod(function stop(callback) {

	this.server.close(function closed() {

		if (callback) {
			callback();
		}

	});

});

/**
 * Initialize the error handler (if it's enabled)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.11
 * @version  1.4.0
 */
function initializeErrorHandler() {

	if (!this.settings.errors.handle_uncaught) {
		return;
	}

	this.registerErrorHandler((error, info) => {

		let message;

		if (info?.promise) {
			message = 'Unhandled promise rejection';
		} else {
			message = 'Uncaught exception';
		}

		this.printLog('error', [message, String(error), error], {err: error, level: -2});
	}, 1);
}