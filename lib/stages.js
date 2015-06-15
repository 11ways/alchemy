/**
 * This file is loaded after the main 'init' & 'core' folder files.
 * Its main purpose is to launch the server in several stages and
 * allow the app-specific logic to hook into them.
 *
 * Alchemy: Node.js MVC Framework
 * Copyright 2013-2014
 *
 * Licensed under The MIT License
 * Redistributions of files must retain the above copyright notice.
 *
 * @copyright   Copyright 2013-2014
 * @since       0.0.1
 * @version     1.0.0
 */
var path       = alchemy.modules.path,
    settings   = alchemy.settings,
    http       = alchemy.modules.http,
    hawkejs    = alchemy.hawkejs,
    fs         = alchemy.use('fs'),
    anyBody    = require('body/any'),
    formBody   = require('body/form'),
    formidable = require('formidable'),
    bodyParser = require('body-parser'),
    Qs         = require('qs');

/**
 * The "http" stage:
 * 
 * Create the server and listen to requests
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       1.0.0
 */
alchemy.sputnik.defineStage('http', function expressStage () {

	// Create the server
	alchemy.server = alchemy.modules.http.createServer(alchemy.app);

	alchemy.server.on('request', function onRequest(request, response) {
		Router.resolve(request, response);
	});
});

/**
 * The "coreApp" stage:
 * 
 * Load in Alchemy's main 'app' folder.
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
alchemy.sputnik.defineStage('coreApp', function coreAppStage () {
	alchemy.usePath(path.resolve(PATH_CORE, 'app'), {weight: 1});
});

/**
 * The "datasources" stage:
 * 
 * Make a connection to all the datasources.
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       1.0.0
 */
alchemy.sputnik.defineStage('datasources', function datasourcesStage() {
	require(path.resolve(PATH_ROOT, 'app', 'config', settings.environment, 'database'));
});

/**
 * The "plugins" stage:
 * 
 * Initialize the defined plugins.
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
alchemy.sputnik.defineStage('plugins', function() {

	// Prevent the baseApp from loading
	this.prevent('baseApp');
	this.prevent('datasources');

	// Load in the plugins
	alchemy.startPlugins();
});

// Define the base app state
alchemy.sputnik.defineStage('baseApp', function() {
	// Load in the app
	alchemy.usePath(APP_ROOT, {weight: 20});
});

// Begin defining debug state
alchemy.sputnik.defineStage('defineDebug', function() {
	
	// See if we want to enable debugging
	if (settings.config.debug) {
		alchemy.hawkejs._debug = true;
		log.todo('http logging');
	}
});

// Define hawkejs setup
alchemy.sputnik.defineStage('hawkejsSetup', function() {

	// Set the correct asset paths
	alchemy.hawkejs.stylePath = 'stylesheets/';
	alchemy.hawkejs.scriptPath = 'scripts/';

	// Expose the translations to the client
	alchemy.hawkejs.on({type: 'viewrender', status: 'begin', client: false}, function onBegin(viewRender) {
		viewRender.script('alchemy');
	});

	// Serve the hawkejs file
	Router.use('/hawkejs/hawkejs-client.js', function getHawkejs(req, res, next) {
		alchemy.hawkejs.createClientFile(function gotClientFile(err, path) {
			req.conduit.serveFile(path);
		});
	});

	Router.use('/hawkejs/template', function onGetTemplate(req, res) {

		var name = req.conduit.param('name');

		alchemy.hawkejs.getTemplatePath(name, function gotTemplate(err, path) {

			if (!name) {
				name  ='template: ' + err;
			}

			if (!path) {
				req.conduit.notFound('Could not find ' + name);
			} else {
				req.conduit.serveFile(path);
			}
		});
	}, {methods: ['get'], weight: 19});

	alchemy.hawkejs.constructor.log = function log(level, message) {
		pr(message, {level: 1});
	};

});

// Define middleware
alchemy.sputnik.defineStage('middleware', function() {

	var urlFormBody = bodyParser.urlencoded();

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
		if (req.headers['content-type'].startsWith('multipart/form-data')) {

			form = new formidable.IncomingForm();

			// md5 hash by default
			form.hash = 'md5';

			form.parse(req, function parsedMultipart(err, fields, files) {

				var str = '',
				    key;

				// This is ridiculous, but no body parser does it all so ...
				for (key in fields) {
					str += key + '=' + encodeURIComponent(fields[key]) + '&';
				}

				fields = Qs.parse(str);

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

// Load the routes
alchemy.sputnik.defineStage('routes', function() {
	require(path.resolve(APP_ROOT, 'config', 'routes'));
});

alchemy.sputnik.defineStage('startServer', function doStartServer() {
	// Need to use setImmediate because all classes have not yet loaded
	setImmediate(function scheduleListener() {
		alchemy.server.listen(settings.config.port, function areListening(){
			log.info('HTTP server listening on port ' + String(settings.config.port).bold.blue, {level: 1});

			// If this process is a child, tell the parent we're ready
			if (process.send) {
				log.info('Letting the parent now we\'re ready!');
				process.send({alchemy: {ready: true}});
			}

			// Indicate the server has loaded (files have copied)
			// @todo: hawkejs files are still copying!
			alchemy.loaded = true;

			alchemy.sputnik.launch('listening');
		});
	});
});

alchemy.sputnik.after(['datasources', 'socket'], function() {

	alchemy.sputnik.launch('startServer');

	// Indicate the server has started
	alchemy.started = true;
});

alchemy.sputnik.launch([
	'http',
	'coreApp',
	'plugins',
	'baseApp',
	'middleware',
	'datasources',
	'defineDebug',
	'socket',
	'hawkejsSetup',
	'routes']);