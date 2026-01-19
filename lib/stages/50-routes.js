const libpath = require('path');

/**
 * The "routes" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const routes = STAGES.createStage('routes');

/**
 * The "routes.hawkejs" stage:
 * Setup the Hawkejs routes
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const hawkejs = routes.createStage('hawkejs', () => {

	// Set the correct asset paths
	alchemy.hawkejs.style_path = 'stylesheets/';
	alchemy.hawkejs.script_path = 'scripts/';

	// Serve the hawkejs file
	Router.use('/hawkejs/hawkejs-client.js', function getHawkejs(req, res, next) {

		var retries = 0;

		Blast.getClientPath({
			modify_prototypes : true,
			ua                : req.conduit.headers.useragent,
			create_source_map : alchemy.getSetting('debugging.create_source_map'),
			enable_coverage   : !!global.__coverage__,
			debug             : alchemy.getSetting('debugging.debug'),
			environment       : alchemy.environment,
		}).done(gotClientFile);

		function gotClientFile(err, path) {

			if (err) {
				log.error('Error getting client file:', err);
				return retryFnc(err);
			}

			let options = {};

			if (req.conduit && req.conduit.supports('async') === false) {
				options.add_async_support = true;
			}

			alchemy.minifyScript(path, options, function gotMinifiedPath(err, mpath) {

				var options;

				if (!retries) {
					options = {
						onError: retryFnc
					}
				}

				req.conduit.serveFile(mpath || path, options);
			});
		}

		function retryFnc(err) {

			if (retries > 0) {
				return req.conduit.error(new Error('Failed to serve client file'));
			}

			retries++;

			Blast.getClientPath({
				refresh           : true,
				modify_prototypes : true,
				ua                : req.conduit.headers.useragent,
				create_source_map : alchemy.getSetting('debugging.create_source_map'),
				debug             : alchemy.getSetting('debugging.debug'),
				environment       : alchemy.environment,
			}).done(gotClientFile);
		}
	});

	// Serve the static file with exposed variables
	Router.use('/hawkejs/static.js', function getHawkejs(req, res, next) {
		alchemy.hawkejs.getStaticExposedPath((err, path) => {

			if (err) {
				return req.conduit.error(err);
			}

			req.conduit.serveFile(path);
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
 * The "routes.middleware" stage:
 * Setup all the middleware routes
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const middleware = routes.createStage('middleware', () => {

	// Serve public files
	Router.use('/public/', alchemy.publicMiddleware, 50);

	// Serve stylesheets
	Router.use('/stylesheets/', alchemy.styleMiddleware, 50);

	// Serve scripts
	Router.use('/scripts/', alchemy.scriptMiddleware, 50);

	// Serve fonts
	Router.use('/fonts/', alchemy.fontMiddleware, 50);

	// Serve root files
	Router.use('/', alchemy.rootMiddleware, 49);

	if (alchemy.getSetting('debugging.debug')) {
		// Serve sourcemap files
		Router.use('/_sourcemaps/', alchemy.sourcemapMiddleware, 50);
	}

	// Parse body (form-data & json, no multipart)
	// @todo: not all routes require body parsing
	Router.use(function parseBody(req, res, next) {

		// Don't re-check internal redirects, they always should have a body set
		if (req.original.body != null || (req.conduit && req.conduit instanceof Classes.Alchemy.Conduit.Loopback)) {
			return next();
		}

		alchemy.parseRequestBody(req, res, next);

	}, {methods: ['post'], weight: 99999});

});

/**
 * The "routes.app_routes" stage:
 * Setup the routes of the main app.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const app_routes = routes.createStage('app_routes', () => {
	try {
		alchemy.useOnce(libpath.resolve(PATH_APP, 'config', 'routes.js'));
	} catch (err) {
		// Only output warning when not in client mode
		if (!alchemy.getSetting('client_mode')) {
			log.warn('No app routes were found:', err);
		}
	}

	// Setup AI devmode routes if enabled (CLI flag only, not a setting)
	if (alchemy.ai_devmode_enabled) {
		require(libpath.resolve(PATH_CORE, 'scripts', 'setup_ai_devmode.js'))();
	}
});