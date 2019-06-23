/**
 * This file is loaded after the main 'init' & 'core' folder files.
 * Its main purpose is to launch the server in several stages and
 * allow the app-specific logic to hook into them.
 *
 * Alchemy: Node.js MVC Framework
 * Copyright 2013-2018
 *
 * Licensed under The MIT License
 * Redistributions of files must retain the above copyright notice.
 *
 * @copyright   Copyright 2013-2018
 * @since       0.0.1
 * @version     0.2.0
 */
var path       = alchemy.modules.path,
    settings   = alchemy.settings,
    http       = alchemy.modules.http,
    hawkejs    = alchemy.hawkejs,
    fs         = alchemy.use('fs'),
    anyBody    = alchemy.use('body/any'),
    formBody   = alchemy.use('body/form'),
    formidable = alchemy.use('formidable'),
    bodyParser = alchemy.use('body-parser');

if (alchemy.settings.debug) {
	alchemy.sputnik.on('launching', function onLaunch(stage) {
		var line = alchemy.log('Launching', alchemy.colors.fg.getRgb(0, 5, 5) + stage.name + alchemy.colors.reset, 'stage...');

		if (line && line.args) {
			stage.pledge.then(function finished() {
				line.args.push('Done in', stage.ended - stage.started, 'ms');
				line.dissect();
				line.render();
			});
		}
	});
}

/**
 * The "http" stage:
 * Create the server and listen to requests
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       1.1.0
 */
alchemy.sputnik.add(function http() {

	// Create the server
	alchemy.server = alchemy.modules.http.createServer();

	// Listen for requests
	alchemy.server.on('request', function onRequest(request, response) {
		Router.resolve(request, response);
	});
});

/**
 * The "coreApp" stage:
 * Load in Alchemy's main 'app' folder.
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       1.1.0
 */
alchemy.sputnik.add(function core_app() {
	alchemy.usePath(path.resolve(PATH_CORE, 'app'), {weight: 1});
});

/**
 * The "datasources" stage:
 * Make a connection to all the datasources.
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       1.1.0
 */
alchemy.sputnik.add(function datasources() {

	var tasks = [];

	// Force Blast to load
	Blast.doLoaded();

	// Require the environment datasources configuration
	try {
		require(path.resolve(PATH_ROOT, 'app', 'config', settings.environment, 'database'));
	} catch (err) {

		if (err.code == 'MODULE_NOT_FOUND') {
			if (!alchemy.settings.client_mode) {
				// Only output a warning when not in client mode
				log.warn('Could not find ' + settings.environment + ' database settings');
			}
		} else {
			log.warn('Could not load ' + settings.environment + ' database settings:', err);
		}

		return;
	}

	// Get all available datasources
	Object.each(Datasource.get(), function eachDatasource(datasource, key) {
		tasks.push(datasource.setup());
	});

	return Function.parallel(tasks);
});

/**
 * The "plugins" stage:
 * Initialize the defined plugins.
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       1.1.0
 */
alchemy.sputnik.add(function plugins() {
	// Load in the plugins
	alchemy.startPlugins();
});

/**
 * The "baseApp" stage:
 * Load all the files in the user-defined 'app' folder
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       0.0.1
 */
alchemy.sputnik.add(function base_app() {
	// Load in the app
	alchemy.usePath(PATH_APP, {weight: 20});
});

/**
 * The "defineDebug" stage:
 * Setup some debug settings
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       1.1.0
 */
alchemy.sputnik.add(function define_debug() {
	// See if we want to enable debugging
	if (settings.debug) {
		log.info('Hawkejs debugging has been ENABLED');
		alchemy.hawkejs._debug = true;
	}
});

/**
 * The "hawkejsSetup" stage:
 * Initialize Hawkejs
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       1.1.0
 */
alchemy.sputnik.add(function hawkejs_setup() {

	// Set the correct asset paths
	alchemy.hawkejs.style_path = 'stylesheets/';
	alchemy.hawkejs.script_path = 'scripts/';

	// Serve the hawkejs file
	Router.use('/hawkejs/hawkejs-client.js', function getHawkejs(req, res, next) {

		Blast.getClientPath({
			modify_prototypes: true,
			ua: req.conduit.headers.useragent
		}).done(function gotClientFile(err, path) {

			if (err) {
				return req.conduit.error(err);
			}

			let options = {};

			if (req.conduit && req.conduit.supports('async') === false) {
				options.add_async_support = true;
			}

			alchemy.minifyScript(path, options, function gotMinifiedPath(err, mpath) {
				req.conduit.serveFile(mpath || path);
			});
		});
	});

	// Serve multiple template files
	Router.use('/hawkejs/templates', function onGetTemplates(req, res) {

		var names = req.conduit.param('name');

		if (!names) {
			return req.conduit.error(new Error('No template names have been given'));
		}

		alchemy.hawkejs.getFirstAvailableSource(names, function gotResult(err, result) {

			if (err) {
				return req.conduit.error(err);
			}

			if (!result || !result.name) {
				return req.conduit.notFound('Could not find any of the given templates');
			}

			req.conduit.setHeader('cache-control', 'public, max-age=3600, must-revalidate');

			// Don't use json dry, hawkejs expects regular json
			req.conduit.json_dry = false;

			req.conduit.end(result);
		});
	}, {methods: ['get'], weight: 19});

	// Serve single template files
	Router.use('/hawkejs/template', function onGetTemplate(req, res) {

		var name = req.conduit.param('name');

		if (!name) {
			return req.conduit.error(new Error('No template name has been given'));
		}

		alchemy.hawkejs.getTemplatePath(name, function gotTemplate(err, path) {

			if (err) {
				return req.conduit.error(err);
			}

			if (!path) {
				req.conduit.notFound('Could not find ' + name);
			} else {
				req.conduit.serveFile(path);
			}
		});
	}, {methods: ['get'], weight: 19});
});

/**
 * The "middleware" stage:
 * Setup middleware
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       0.4.2
 */
alchemy.sputnik.add(function middleware() {

	var urlFormBody = bodyParser.urlencoded({extended: true});

	// Serve public files
	Router.use('/public/', alchemy.publicMiddleware, 50);

	// Serve stylesheets
	Router.use('/stylesheets/', alchemy.styleMiddleware, 50);

	// Serve scripts
	Router.use('/scripts/', alchemy.scriptMiddleware, 50);

	// Serve root files
	Router.use('/', alchemy.rootMiddleware, 49);

	// Parse body (form-data & json, no multipart)
	// @todo: not all routes require body parsing
	Router.use(function parseBody(req, res, next) {

		var form;

		// Don't re-check internal redirects, they always should have a body set
		if (req.original.body != null) {
			return next();
		}

		// Multipart data is handled by "formidable"
		if (req.headers['content-type'] && req.headers['content-type'].startsWith('multipart/form-data')) {

			form = new formidable.IncomingForm();

			// md5 hash by default
			form.hash = 'md5';

			form.parse(req, function parsedMultipart(err, form_fields, form_files) {

				var fields = {},
				    files = {},
				    key;

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
					req.original.body = {};
					req.original.files = {};
				} else {
					req.original.body = fields;
					req.original.files = files;
				}

				next();
			});

			return;
		}

		// Regular form-encoded data
		if (req.headers['content-type'] && req.headers['content-type'].indexOf('form-urlencoded') > -1) {

			urlFormBody(req, res, function parsedBody(err) {

				// You can't send files using a regular post
				req.original.files = {};

				if (err) {
					log.error('Error parsing x-www-form-urlencoded body data', {err: err});
					req.original.body = {};
				} else {
					req.original.body = req.body;
				}

				next();
			});

			return;
		}

		// Any other encoded data (like JSON)
		anyBody(req, function parsedBody(err, body) {

			// You can't send files using a regular post
			req.original.files = {};

			if (err) {
				log.error('Error parsing body data', {err: err});
				req.original.body = {};
			} else {
				req.original.body = body;
			}

			next();
		});
	}, {methods: ['post'], weight: 9999});
});

/**
 * The "routes" stage:
 * Initialize all the routes
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       0.4.0
 */
alchemy.sputnik.add(function routes() {
	try {
		alchemy.useOnce(path.resolve(PATH_APP, 'config', 'routes'));
	} catch (err) {
		// Only output warning when not in client mode
		if (!alchemy.settings.client_mode) {
			log.warn('No route config was found');
		}
	}
});

/**
 * The "startServer" stage:
 * Actually start the server
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       1.1.0
 */
alchemy.sputnik.add(function start_server() {

	if (alchemy.settings.client_mode) {
		return alchemy.sputnik.launch('listening');
	}

	alchemy.exposeDefaultStaticVariables();

	// If a falsy (non-null) port is given, do nothing
	if (!settings.port && settings.port !== null) {
		return;
	}

	// Are we using a socket file?
	if (typeof settings.port == 'string' && !parseInt(settings.port)) {
		let stat;

		try {
			stat = fs.statSync(settings.port);
		} catch (err) {
			// File not found, so it's safe to use
		}

		if (stat) {
			log.info('Found existing socketfile at', settings.port, ', need to remove it');
			fs.unlinkSync(settings.port);
		}
	}

	// Start listening on the given port
	// The actual `requests` listener is defined in the 'http' stage
	alchemy.server.listen(settings.port, function areListening(){

		var address = alchemy.server.address();

		if (typeof address == 'string') {
			settings.port = address;
			settings.socketfile = address;
			log.info('HTTP server listening on socket file', address);

			// Make readable by everyone
			if (settings.socketfile_chmod) {
				fs.chmodSync(address, settings.socketfile_chmod);
			}

		} else {
			// Get the actual server port
			settings.port = address.port;
			log.info('HTTP server listening on port', settings.port);
		}

		// If this process is a child, tell the parent we're ready
		if (process.send) {
			log.info('Letting the parent know we\'re ready!');
			process.send({alchemy: {ready: true}});

			process.on('disconnect', function onParentExit() {
				log.info('Parent exited, closing down');
				process.exit();
			});
		}

		alchemy.sputnik.launch('listening');
	});

	// Listen for errors (like EADDRINUSE)
	alchemy.server.on('error', function onError(err) {

		if (process.send) {
			process.send({alchemy: {error: err}});
			return process.exit();
		}

		throw err;
	});
});

/**
 * Launch the "startServer" stage after datasources & socket
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       0.5.0
 */
alchemy.sputnik.after(['datasources', 'socket'], function scheduleServerStart() {

	// Need to wait for all classes to load
	Blast.loaded(function hasLoaded() {

		alchemy.sputnik.launch('start_server');

		// Indicate the server has started
		alchemy.started = true;
	});
});

alchemy.sputnik.launch([
	'http',
	'core_app',
	'plugins',
	'base_app',
	'middleware',
	'datasources',
	'define_debug',
	'socket',
	'hawkejs_setup',
	'routes']);