const SettingNs = Function.getNamespace('Alchemy.Setting');
const libfs = require('fs');

// Create the system settings group
const system = new Classes.Alchemy.Setting.Group('system', null);
SettingNs.SYSTEM = system;

system.addSetting('environment', {
	type        : 'string',
	default     : null,
	values      : ['dev', 'live', 'preview'],
	description : 'The current environment',
	locked      : true,
	requires_restart : true,
});

system.addSetting('name', {
	type        : 'string',
	default     : null,
	description : 'The package name',
});

const plugins = system.createGroup('plugins');
SettingNs.PLUGINS = plugins;

const network = system.createGroup('network');

network.addSetting('port', {
	type        : 'primitive',
	default     : 3000,
	description : 'The port or socket to listen to',
	locked      : true,
	requires_restart : true,
});

network.addSetting('socket', {
	type        : 'string',
	default     : null,
	description : 'The optional socket file to listen to (higher priority than port)',
	locked      : true,
	requires_restart : true,
});

network.addSetting('socketfile_chmod', {
	type        : 'string',
	default     : null,
	description : 'The chmod to set on the socket file',
	action      : function applySocketfileChmod(value, value_instance) {

		if (!value) {
			return;
		}

		let socketfile = alchemy.getSetting('network.socket');

		if (!socketfile) {
			return;
		}

		libfs.chmodSync(socketfile, value);
	},
});

network.addSetting('assume_https', {
	type        : 'boolean',
	default     : false,
	description : 'Assume incoming requests are using https',
});

network.addSetting('use_compression', {
	type        : 'boolean',
	default     : true,
	description : 'Compress responses using gzip/deflate',
});

network.addSetting('request_body_size_limit', {
	type        : 'number',
	default     : 20 * 1024 * 1024,
	description : 'Maximum allowed size in bytes for the request body, excluding files',
});

network.addSetting('request_individual_file_size_limit', {
	type        : 'number',
	default     : 200 * 1024 * 1024,
	description : 'Maximum allowed size in bytes for individual uploaded files',
});

network.addSetting('request_total_file_size_limit', {
	type        : 'number',
	default     : 200 * 1024 * 1024,
	description : 'Maximum allowed size in bytes for all uploaded files',
});

network.addSetting('use_json_dry_responses', {
	type        : 'boolean',
	default     : true,
	description : 'Allow use of JSON-dry in non-hawkejs responses',
	locked      : true,
});

network.addSetting('use_websockets', {
	type        : 'string',
	default     : 'optional',
	values      : ['optional', 'always', 'never'],
	description : 'Enable websockets',
});

network.addSetting('main_url', {
	type        : 'string',
	default     : null,
	description : 'The main URL this site is hosted on',
});

const performance = system.createGroup('performance');

performance.addSetting('cache', {
	type        : 'boolean',
	default     : true,
	description : 'Enable caching',
});

performance.addSetting('postpone_requests_on_overload', {
	type        : 'boolean',
	default     : true,
	description : 'Allow requests postponement/queue when the server is overloaded',
});

performance.addSetting('max_event_loop_lag', {
	type        : 'integer',
	default     : 70,
	description : 'Detect when this node server is too busy',
});

performance.addSetting('max_system_load', {
	type        : 'percentage',
	default     : 85,
	description : 'What systemload is considered overloaded, as a total percentage?',
});

performance.addSetting('preload', {
	type        : 'boolean',
	default     : false,
	description : 'Should the home page & client file be preloaded on boot?',
	requires_restart : true,
});

performance.addSetting('janeway_lag_menu', {
	type        : 'boolean',
	default     : true,
	description : 'Show the lag menu entry in Janeway',
	requires    : 'system.debugging.enable_janeway',
	depends_on  : [],
	action      : function applyJanewayLagMenu(value, value_instance) {

		if (!alchemy.Janeway) {
			return;
		}

		if (!value) {

			// Remove existing entry
			if (alchemy.Janeway.lag_menu) {
				alchemy.Janeway.lag_menu.remove();
			}

			return;
		}

		// Do nothing if it already exists
		if (alchemy.Janeway.lag_menu) {
			return;
		}

		let lag_menu = alchemy.Janeway.addIndicator('0 ms');

		if (!lag_menu) {
			return;
		}

		setInterval(() => {
			lag_menu.setIcon(alchemy.lagInMs() + ' ms');
			alchemy.Janeway.redraw();
		}, 900).unref();

		alchemy.Janeway.lag_menu = lag_menu;
	},
});

const debugging = system.createGroup('debugging');

debugging.addSetting('debug', {
	type        : 'boolean',
	default     : false,
});

debugging.addSetting('enable_janeway', {
	type        : 'boolean',
	default     : true,
	description : 'Enable the Janeway TUI',
	locked      : true,
	requires_restart : true,
});

debugging.addSetting('info_page', {
	type        : 'boolean',
	default     : false,
	description : 'Allow access to the info page',
});

debugging.addSetting('silent', {
	type        : 'boolean',
	default     : false,
	description : 'Do not print certain logs when true',
});

debugging.addSetting('create_source_map', {
	type        : 'boolean',
	default     : false,
	description : 'Create sourcemaps for client-side assets?',
});

const debug_logging = debugging.createGroup('logging');

debug_logging.addSetting('level', {
	type    : 'integer',
	default : 4,
});

debug_logging.addSetting('trace', {
	type    : 'boolean',
	default : false,
});

debugging.addSetting('kill_on_file_change', {
	type        : 'boolean',
	default     : false,
	description : 'Kill the process when a JavaScript file changes',
});

const frontend = system.createGroup('frontend');

frontend.addSetting('title', {
	type        : 'string',
	default     : null,
	description : 'The title of the site',
	action      : function applyTitle(value, value_instance) {

		if (!value || !alchemy.Janeway) {
			return;
		}

		alchemy.Janeway.setTitle(value);
	},
});

frontend.addSetting('title_suffix', {
	type        : 'string',
	default     : null,
	description : 'Optional suffix to add to route titles',
});

frontend.addSetting('appcache', {
	type        : 'boolean',
	default     : false,
	description : 'Enable the use of the appcache manifest',
});

const stylesheet = frontend.createGroup('stylesheet');

stylesheet.addSetting('minify', {
	type        : 'boolean',
	default     : true,
});

stylesheet.addSetting('enable_less', {
	type        : 'boolean',
	default     : true,
	description : 'Allow the usage of LESS',
});

stylesheet.addSetting('enable_scss', {
	type        : 'boolean',
	default     : true,
	description : 'Allow the usage of SCSS',
});

stylesheet.addSetting('allow_warnings', {
	type        : 'boolean',
	default     : true,
	description : 'Allow stylesheet warnings in the console (during debugging)',
});

stylesheet.addSetting('enable_post', {
	type        : 'boolean',
	default     : true,
	description : 'Allow the usage of PostCSS',
});

const javascript = frontend.createGroup('javascript');

javascript.addSetting('minify', {
	type        : 'boolean',
	default     : true,
});

javascript.addSetting('enable_babel', {
	type        : 'boolean',
	default     : false,
	description : 'Allow the usage of Babel for compiling client-side scripts',
});

const ui = frontend.createGroup('ui');

ui.addSetting('main_logo', {
	type        : 'path',
	default     : '/alchemy-logo.png',
	description : 'The main logo to use',
});

ui.addSetting('layout', {
	type        : 'object',
	default     : {

		// Root layout
		root : {

			// The root layout file to use
			view  : 'layouts/body',

			// The main block to use in this root layout file
			block : 'main',
		},
	},
	description : 'Public layout settings, exposed as `alchemy_layout`',
});

const cookies = frontend.createGroup('cookies');

cookies.addSetting('enabled', {
	type        : 'boolean',
	default     : true,
	description : 'Allow cookies',
});

cookies.addSetting('domain', {
	type        : 'string',
	default     : null,
	description : 'The domain for which the cookies should be set',
});

const sessions = system.createGroup('sessions');

sessions.addSetting('enabled', {
	type        : 'boolean',
	default     : true,
	description : 'Enable sessions',
});

sessions.addSetting('cookie_name', {
	type        : 'string',
	default     : 'alchemy_sid',
	description : 'The name of the session cookie',
});

sessions.addSetting('duration', {
	type        : 'duration',
	default     : '20 minutes',
	description : 'The duration of a session',
});

sessions.addSetting('janeway_menu', {
	type        : 'boolean',
	default     : false,
	description : 'Show a list of all sessions in the Janeway TUI',
	requires    : 'system.debugging.enable_janeway',
	depends_on  : [],
	action      : function createJanewaySessionMenu(value, value_instance) {

		if (!value) {

			// Remove existing entry
			if (alchemy.Janeway.session_menu) {
				alchemy.Janeway.session_menu.remove();
			}

			return;
		}

		// Do nothing if it already exists
		if (alchemy.Janeway.session_menu) {
			return;
		}

		let session_menu = alchemy.Janeway.addIndicator('⌨ ');

		if (!session_menu) {
			return;
		}

		session_menu.addItem({
			title  : 'Current active browser sessions:',
			weight : Infinity,
		}, () => {
			console.log('All sessions:', this.sessions);
		});

		alchemy.Janeway.session_menu = session_menu;
	},
});

const data_management = system.createGroup('data_management');

data_management.addSetting('process_body', {
	type        : 'boolean',
	default     : true,
	description : 'Process the body of incoming requests',
});

data_management.addSetting('file_hash_algorithm', {
	type        : 'string',
	default     : 'sha1',
	description : 'The default file hash method',
});

data_management.addSetting('model_query_cache_duration', {
	type        : 'duration',
	default     : '60 minutes',
	description : 'How long query results are cached',
});

data_management.addSetting('model_assoc_parallel_limit', {
	type        : 'integer',
	default     : 8,
	description : 'How many assoc data queries are allowed to run at the same time',
});

data_management.addSetting('allow_fallback_translations', {
	type        : 'boolean',
	default     : false,
	description : 'Should fallback translations be allowed?',
});

const task = system.createGroup('task');

task.addSetting('janeway_menu', {
	type        : 'boolean',
	default     : true,
	description : 'Show the task menu in Janeway',
	requires    : 'system.debugging.enable_janeway',
	depends_on  : [],
	action      : function createJanewayTaskMenu(value, value_instance) {
		if (value) {
			return alchemy.task_service.createJanewayTaskMenu();
		}
	},
});

const errors = system.createGroup('errors');

errors.addSetting('handle_uncaught', {
	type        : 'boolean',
	default     : true,
	description : 'Handle uncaught errors',
});

// Here are some old settings that might have to be removed:
// multicast?
// offline_clients
// log_trace settings?
// less import paths?
// 
// hawkejs_client?
// search_for_modules?