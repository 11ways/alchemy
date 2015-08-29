var fs          = alchemy.use('fs'),
    connections = alchemy.shared('Connection.all'),
    prefixes    = alchemy.shared('Routing.prefixes'),
    linkmap     = alchemy.shared('Connection.map'),
    servecache  = {};

// Create the global Connection object
global.Connection = {};

// Create the global Prefix object
global.Prefix = {first: false};

/**
 * Add a prefix
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   name       An identifier for this url
 */
Prefix.add = function addPrefix(name, options) {

	var language = Language.get(options.locale) || '';

	options.name = name;
	prefixes[name] = options;

	if (!options.title) {
		options.title = language;
	}

	options.language = language.toLowerCase();

	if (!Prefix.first) Prefix.first = options;
};

/**
 * Get a prefix
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   name       The name of the prefix
 */
Prefix.get = function getPrefix(name) {
	return prefixes[name];
};

/**
 * Get all the available prefixes
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.0.1
 */
Prefix.all = function allPrefixes() {
	
	var obj = {},
	    key;

	// Make a shallow copy of the object
	for (key in prefixes) {
		obj[key] = prefixes[key];
	}

	return obj;
};

/**
 * Get a list of all the available prefixes
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.1
 * @version  0.1.1
 */
Prefix.getPrefixList = function getPrefixList() {
	return Object.keys(prefixes);
};

/**
 * Determine which prefix should be used
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   alchemyRoute
 * @param    {Array}    clientLanguages
 * @param    {Object}   session
 *
 * @return   {Object}
 */
Prefix.determine = function determinePrefix(alchemyRoute, clientLanguages, session) {
	
	var prefix, name, nr, entry, first, result;

	// If a prefix preference is set, use that
	if (session && session.user && session.user.prefix_preference) {
		if (prefixes[session.user.prefix_preference]) {
			return prefixes[session.user.prefix_preference];
		}
	}

	// If a route was provided get the prefix from there
	if (alchemyRoute) {
		if (alchemyRoute.prefix) {
			result = Prefix.get(alchemyRoute.prefix);
		}
	}

	// If the prefix was found, return it
	if (result || !clientLanguages) {
		return result;
	}

	// Go over every language the client accepts
	for (nr in clientLanguages) {

		entry = clientLanguages[nr];

		// Get the first entry for later use
		if (!first) first = entry;

		// Go over every prefix we have set up
		for (name in prefixes) {

			prefix = prefixes[name];

			// If the user accepts the given
			if (prefix.locale == entry.lang) {
				result = prefix;
				break;
			}
		}

		if (result) break;
	}

	if (!result) {
		result = Prefix.first;
	}

	return result;
};

/**
 * Get fallback prefixes
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Array}    languages
 *
 * @return   {Array}    An array of prefixes
 */
Prefix.getFallback = function getFallback(languages) {

	var i, prefixname, prefix, result = [];

	// Go over every language locale given
	for (i = 0; i < languages.length; i++) {

		// Go over every prefix
		for (prefixname in prefixes) {
			prefix = prefixes[prefixname];

			// If the locale of the prefix matches the one of the browser
			// add it to the result
			if (prefix.locale == languages[i]) {
				result.push(prefixname);
			}
		}
	}

	return result;
};

/**
 * Construct a URL for a connection name with the given parameters
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   connectionName  The connection to get
 * @param   {Object}   options         The options for this connection
 */
Connection.url = function url(connectionName, options) {

	if (!options) options = {};

	var context = connections[connectionName],
	    paramName,
	    url,
	    z;

	// If the context was not found, return an empty string
	if (!context) {
		return '';
	}

	// Get the template url
	if (typeof context.paths === 'object') {
		if (options.locale) {
			url = context.paths[options.locale];
		} else {
			// If no locale is set, use the first entry
			for (z in context.paths) {
				url = context.paths[z];
				break;
			}
		}
	} else {
		url = context.paths;
	}

	url = Connection.fill(url, options.params);

	return url;
};

/**
 * Fill in a source url with the given parameters
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   url      The source url to fill in
 * @param   {Object}   params   The parameters to use
 */
Connection.fill = function fill(url, params) {

	if (params) {
		for (paramName in params) {
			url = url.replace(':'+paramName, params[paramName]);
		}
	}

	return url;
};

/**
 * Sort the parsed accept-language header array
 *
 * @author   Jelle De Loecker       <jelle@develry.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   a
 * @param    {Object}   b
 */
function qualityCmp(a, b) {
	if (a.quality === b.quality) {
		return 0;
	} else if (a.quality < b.quality) {
		return 1;
	} else {
		return -1;
	}
}

/**
 * Start calling the controller, if it exists.
 * If not we end the response.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {Object}   req
 * @param    {Object}   res
 * @param    {Object}   c      This url's cache
 */
var dispatchController = function dispatchController(req, res, _c) {

	var that = this,
	    viewRender,
	    c = Object.assign({}, _c);

	// Overwrite the found controller options
	req.alchemyRoute.options.controller = c.controllerName;
	req.alchemyRoute.options.action = c.actionName;

	// See if it's an ajax request
	req.ajax = (req.headers['x-requested-with'] === 'XMLHttpRequest');

	// Parse the accept-language header
	req.languages = parseAcceptLanguage(req.headers['accept-language']);

	// Get a new ViewRender instance
	viewRender = alchemy.hawkejs.createViewRender();

	// Set some request variables
	viewRender.prepare(req, res);

	// Set the viewRender in the req object
	req.viewRender = viewRender;

	// Send the requested url back with the response
	res.setHeader('X-History-Url', req.url);

	alchemy.doMiddlewareAfter(req, res, function doMiddlewareAfterDone() {

		var augmentedController,
		    prefix,
		    fallback = [],
		    fallcheck = {},
		    i,
		    hasRendered = false,
		    hasRedirected = false;

		if (!c.controller) {
			// The controller does not exist!
			res.end('Controller ' + c.controllerName + ' does not exist!');
			return;
		}
		
		// This is the object that will be passed to the rendered
		var finalViewVars = req.variables || {};
		
		// This function has to be called inside the controller action
		// It renders the view, and fires the beforeRender & afterAction methods
		var renderCallback = function renderCallback(viewNames, viewVars) {

			// If the view property has been set on the renderCallback object,
			// apply it to the request. It can still be overridden when actually
			// calling the render callback
			if (renderCallback.view) {
				c.view = renderCallback.view;
			}

			alchemy.parallel('render.callback', renderCallback, function() {

				if (hasRendered) {
					log.warn('Render callback has already fired!');
					return;
				}

				// If deliverData has been defined, expose it to the client
				if (req.session.deliverData) {
					renderCallback.req.variables.__expose.deliverData = {list: req.session.deliverData.splice(0)};
				}
				
				if (typeof viewNames === 'string' || viewNames instanceof Array) {
					c.view = viewNames;
				} else {
					viewVars = viewNames;
				}

				// Should the viewvars have been reset, make sure the changes apply
				finalViewVars = renderCallback.viewVars;

				// Set the locale
				renderCallback.internal('locale', renderCallback.locale);
				renderCallback.internal('prefix', renderCallback.prefix);
				renderCallback.internal('fallback', renderCallback.fallback);

				hasRendered = true;
				secondComponentStage(req, res, c, finalViewVars, viewVars, renderCallback);
			});
		};

		/**
		 * Express is going to be phased out of Alchemy in favour
		 * of a totally new routing engine.
		 *
		 * While we wait, we still use renderCallback, but normalise it
		 */

		// ViewRender methods
		renderCallback.set = viewRender.set.bind(viewRender);
		renderCallback.expose = viewRender.expose.bind(viewRender);
		renderCallback.internal = viewRender.internal.bind(viewRender);
		renderCallback.store = renderCallback.expose; // Legacy name

		// A reference to the callback itself
		renderCallback.render = renderCallback;

		// A reference to the ViewRender instance
		renderCallback.viewRender = viewRender;

		// Store the augment in the req object
		req.augment = {render: renderCallback};

		// Create the augmented controller
		augmentedController = alchemy.augment(c.controller, req.augment);
		
		// The view hasn't been rendered yet
		renderCallback.rendered = false;
		renderCallback.rendering = false;

		// Is the server too busy?
		renderCallback.toobusy = req.toobusy;

		// Languages the client accepts
		renderCallback.clientLanguages = req.languages;

		// See what prefix applies to this request
		prefix = Prefix.determine(req.languages, req.alchemyRoute, req.session);
		renderCallback.prefix = prefix.name;
		renderCallback.prefixObject = prefix;

		if (prefix && prefix.locale) {
			// Get the locale from the active prefix
			renderCallback.locale = prefix.locale;

			// Indicate this locale should not be a fallback, as it's the main locale
			fallcheck[prefix.locale] = true;

			if (prefix.fallback) {
				for (i = 0; i < prefix.fallback.length; i++) {
					if (!fallcheck[prefix.fallback[i]]) {
						fallback.push(prefix.fallback[i]);
						fallcheck[prefix.fallback[i]] = true;
					}
				}
			} else {
				if (prefix.fallback === false) {
					fallback = false;
				}
			}
		} else {
			// If no prefix was found, use the first language the browser sends us
			renderCallback.locale = req.languages[0].lang;

			// Indicate this locale should not be a fallback, as it's the main locale
			fallcheck[renderCallback.locale] = true;
		}

		if (fallback) {
			for (i = 0; i < req.languages.length; i++) {
				if (!fallcheck[req.languages[i].lang]) {
					fallback.push(req.languages[i].lang);
					fallcheck[req.languages[i].lang] = true;
				}
			}
		}

		// Languages we could use to fallback to
		renderCallback.fallbackLocale = fallback;
		renderCallback.fallback = Prefix.getFallback(fallback);

		// Method info
		renderCallback.method = req.method;
		renderCallback.get    = (req.method === 'GET');
		renderCallback.post   = (req.method === 'POST');
		renderCallback.delete = (req.method === 'DELETE');
		renderCallback.put    = (req.method === 'PUT');
		renderCallback.ajax   = req.ajax;
		
		// Set controller info
		renderCallback.actionName = c.actionName;
		renderCallback.controllerName = c.controllerName;
		
		// Add the request & response objects
		renderCallback.req = req;
		renderCallback.res = res;

		// Also add the callback to the request object
		req.renderCallback = renderCallback;

		// Push a flash message to the client
		renderCallback.setFlash = function setFlash(value, type) {
			
			// Make sure the deliverData array exists
			if (!req.session.deliverData) {
				req.session.deliverData = [];
			}

			req.session.deliverData.push({type: 'flash', value: {value: value, type: type}, done: false});
		};

		// Redirect to another url, but call the beforeRedirect callback first
		renderCallback.redirect = function redirect (_status, _url) {
			
			var url, status;

			if (hasRendered) {
				if (hasRedirected) {
					log.error('Tried to redirect twice!', {level: 2});
				} else {
					log.error('Tried to redirect after submitting data to the user!', {level: 2});
				}
				return;
			}
			
			if (typeof _url === 'undefined') {
				url = _status;
				status = 302; // Status "Found"
			} else {
				url = _url;
				status = _status;
			}

			augmentedController._launchComponents('beforeRedirect', renderCallback, function afterComponentBeforeRedirect (_status, _url) {
				
				var comp_url, comp_status;
				
				// If the first parameter is false, the redirect should not happen,
				// and we should just continue the render
				if (_status === false) {
					renderCallback();
					return;
				} else if (typeof _url === 'undefined') {
					comp_url = _status;
					comp_status = 302; // Status "Found"
				} else {
					comp_url = _url;
					comp_status = _status;
				}
				
				// If these still aren't defined, look them up in the scope above
				if (typeof comp_url === 'undefined') comp_url = url;
				if (typeof comp_status === 'undefined') comp_status = status;

				augmentedController.beforeRedirect(function beforeRedirectNext (_status, _url) {
					
					var cont_url, cont_status;
				
					// If the first parameter is false, the redirect should not happen,
					// and we should just continue the render
					if (_status === false) {
						renderCallback();
						return;
					} else if (typeof _url === 'undefined') {
						cont_url = _status;
						cont_status = 302; // Status "Found"
					} else {
						cont_url = _url;
						cont_status = _status;
					}
					
					// If these still aren't defined, look them up in the scope above
					if (typeof cont_url === 'undefined') cont_url = comp_url;
					if (typeof cont_status === 'undefined') cont_status = comp_status;

					hasRendered = true;
					hasRedirected = true;

					res.redirect(cont_status, cont_url);
					
				}, renderCallback, comp_url, comp_status);
				
			}, url, status);
		};

		// Serve a file to the user
		renderCallback.serveFile = function serveFile(filepath, filename, nocache) {

			var task = {};

			// Get some information on this file and cache it
			if (nocache || typeof servecache[filepath] === 'undefined') {
				task.info = function getInfo(next) {

					alchemy.getFileInfo(filepath, {hash: false}, function gotInfo(err, result) {

						var readStream;

						if (err) {
							servecache[filepath] = {err: err};
						} else {
							servecache[filepath] = {info: result};
						}

						next(null, servecache[filepath]);
					});
				};
			}

			// Perform the information fetching if needed and serve the file
			Function.series(task, function(err, taskresult) {

				// Get the file info from the cache
				var result = taskresult.info || servecache[filepath],
				    headers = {};

				if (result.err) {
					res.send(500, 'File not found');
					log.error('File not found', {err: result.err});
				} else {

					headers['Content-Type'] = result.info.mimetype;
					headers['Content-Length'] = result.info.size;

					if (filename) {
						headers['Content-Disposition'] = 'attachment; filename=' + JSON.stringify(filename);
					} else {
						headers['Content-Disposition'] = 'attachment';
					}

					res.writeHead(200, headers);

					// Pipe the file data to the client
					readStream = fs.createReadStream(filepath);
					readStream.pipe(res);
				}

				hasRendered = true;
			});
		};
		
		// The payload object
		renderCallback.viewVars = finalViewVars;
		
		// Launch the initialize method of the components
		augmentedController._launchComponents('initialize', renderCallback, function afterComponentInitialize () {
			
			// First call the beforeAction callback
			augmentedController.beforeAction(function beforeActionNext (viewVars) {
				
				if (typeof viewVars === 'object') Object.assign(finalViewVars, viewVars);
				
				// Now call the component startup methods
				augmentedController._launchComponents('startup', renderCallback, function afterComponentStartup () {

					// Call the actual action
					augmentedController[c.actionName](renderCallback);
					
				});
				
			}, renderCallback);
			
		});
	});
};

/**
 * This function has to be called inside the controller action
 * It renders the view, and fires the beforeRender & afterAction methods
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 */
var secondComponentStage = function secondComponentStage(req, res, c, finalViewVars, viewVars, renderCallback) {
	
	if (typeof viewVars === 'object') Object.assign(finalViewVars, viewVars);

	// Now call the component startup methods
	c.controller._launchComponents('beforeRender', renderCallback, function afterComponentBeforeRender() {
		
		// Indicate a render is happening
		renderCallback.rendering = true;
		
		// Call the beforeRender function
		c.controller.beforeRender(function beforeRenderNext(viewVars) {
			
			if (typeof viewVars === 'object') Object.assign(finalViewVars, viewVars);
			if (typeof finalViewVars.__current__ === 'undefined') finalViewVars.__current__ = {};

			if (req.headers['x-hawkejs-request'] && req.session.deliverData && req.session.deliverData.length) {
				if (!finalViewVars._deliverAlchemyData) {
					finalViewVars._deliverAlchemyData = [];
				}

				// Add the new deliverData to the array
				finalViewVars._deliverAlchemyData = finalViewVars._deliverAlchemyData.concat(req.session.deliverData);

				// Empty the existing array
				req.session.deliverData.length = 0;
			}

			alchemy.render(req, res, c.view, finalViewVars, function alchemyFinishedRendering(err, html) {
				
				// The actual render has happened, but we still need to run the afterRender
				renderCallback.rendered = true;

				// Call the component shutdown methods
				c.controller._launchComponents('shutdown', renderCallback, function afterComponentBeforeRender() {
				
					c.controller.afterRender(function afterRenderNext (newHtml) {

						renderCallback.rendering = false;

						if (typeof newHtml !== 'undefined') html = newHtml;
						
						// If the response is an object, jsonify it
						if (typeof html !== 'string') {

							// Stringify using json-dry
							html = alchemy.stringify(html);

							// And tell the client to expect a json-dry string
							res.writeHead(200, {'Content-Type': 'application/json-dry'});

							// End the json string with only the json string
							res.end(html);
						} else {
							// Use send to transmit the html and set the headers
							res.send(html);
						}
						
						// Call the afterAction method
						c.controller.afterAction(renderCallback);
						
					}, renderCallback, err, html);
					
				}, err, html);
				
			});
			
		}, renderCallback);
	});
};

var existsCache = {};

/**
 * Render a view
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {Object}   req
 * @param    {Object}   res
 * @param    {Array}    view       View location, as a string or array with fallbacks
 * @param    {Object}   payload
 * @param    {Function} callback
 */
alchemy.render = function render(req, res, view, payload, callback) {

	var settings;

	view = Array.cast(view);
	view.push('error/404');

	settings = {
		useView: view,
		payload: payload,
		callback: callback,
		ajax: req.ajax
	};

	// Fire the parallel alchemy.render event
	alchemy.parallel('alchemy.render', settings, function() {
		pr('Going to render view: ' + settings.useView);

		req.viewRender.beginRender(settings.useView, settings.payload, function(err, html) {

			if (typeof settings.callback == 'function') {
				settings.callback(err, html);
			}
		});
	});
}