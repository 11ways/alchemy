var fs          = require('fs'),
    async       = require('async'),
    connections = {};

// Create the global Connection object
global.Connection = {};

/**
 * Add a simple route with a callback
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   path       The url
 * @param   {object}   callback   The callback function
 * @param   {string}   method     What method to use, default = get
 * @param   {number}   order      The order of this route
 */
alchemy.addRoute = function addRoute(path, callback, method, order) {
	
	alchemy.sputnik.after('routes', function() {
	
		// The for counter
		var i;
		
		// If no method is given, set all the basic four
		if (!method) method = ['get', 'post', 'put', 'delete'];
		
		// If the given method is a string, turn it into an array
		if (typeof method === 'string') method = [method];

		for (i = 0; i < method.length; i++) alchemy.app[method[i]](path, callback);
		
	}, order);
}

/**
 * Add a route the MVC way
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   name       An identifier for this url
 * @param   {Object}   paths      The paths to link
 * @param   {Object}   options    Options for this link
 */
alchemy.connect = function connect(name, paths, options) {
	
	var locale,
	    path,
	    fullPath,
	    context,
	    contextClone;
	
	// Create an empty options object if none exist
	if (typeof options === 'undefined') options = {};
	if (typeof options.order === 'undefined') options.order = 10;

	// Create a new context for each route connection
	context = {};
	context.cache = {};	
	context.options = options;
	context.name = name;
	context.paths = paths;

	// Store the info in the connections object
	connections[name] = context;
	
	if (typeof paths === 'string') paths = {'': paths};
	
	for (locale in paths) {

		// Clone the context object
		contextClone = alchemy.cloneSafe(context);
		contextClone.locale = locale;
		
		path = paths[locale];
		
		fullPath = '';
		if (locale) fullPath += '/' + locale;
		fullPath += path;
		
		alchemy.addRoute(fullPath, routeDispatcher.bind(contextClone), options.method, options.order);
	}
};

/**
 * Construct a URL for a connection name with the given parameters
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
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

	for (paramName in options.params) {
		url = url.replace(':'+paramName, options.params[paramName]);
	}

	return url;
};

/**
 * Sort the parsed accept-language header array
 *
 * @author   Jelle De Loecker       <jelle@codedor.be>
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
 * Parses the HTTP accept-language header and returns a
 * sorted array of objects. Example object:
 * {
 *   lang: 'pl', quality: 0.7
 * }
 *
 * @author   Austin King (Mozilla)  <shout@ozten.com>
 * @author   Jelle De Loecker       <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   header      The "accept-language" header
 */
function parseAcceptLanguage(header) {

	if (!header || !header.split) {
		return [];
	}

	var raw_langs = header.split(','),
	    langs;

	langs = raw_langs.map(function(raw_lang) {

		var parts = raw_lang.split(';'),
		    q     = 1,
		    qval,
		    temp;

		if (parts.length > 1 && parts[1].indexOf('q=') === 0) {
			qval = parseFloat(parts[1].split('=')[1]);
			if (isNaN(qval) === false) {
				q = qval;
			}
		}

		// Get the lang-loc code
		temp = parts[0].trim().toLowerCase().split('-');

		return {lang: temp[0], loc: temp[1], quality: q};
	});

	langs.sort(qualityCmp);
	return langs;
};

/**
 * Send a connecting client to the correct action.
 * The context of this function is defined in alchemy.connect
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   req
 * @param    {Object}   res
 */
var routeDispatcher = function routeDispatcher(req, res) {

	var that = this,
	    R    = Route.get(that.options.routeClass);

	// Store the alchemy route information in the req object
	req.alchemyRoute = alchemy.cloneSafe(this);

	R.dispatch(req, res, that, dispatchController.bind(that));
};

/**
 * Start calling the controller, if it exists.
 * If not we end the response.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   req
 * @param    {Object}   res
 * @param    {Object}   c      This url's cache
 */
var dispatchController = function dispatchController(req, res, c) {

	var that = this;

	// Overwrite the found controller options
	req.alchemyRoute.options.controller = c.controllerName;
	req.alchemyRoute.options.action = c.actionName;

	// See if it's an ajax request
	req.ajax = (req.headers['x-requested-with'] === 'XMLHttpRequest');

	// Parse the accept-language header
	req.languages = parseAcceptLanguage(req.headers['accept-language']);

	// Middleware can put variables in here
	req.variables = {__expose: {}};

	alchemy.doMiddlewareAfter(req, res, function() {

		var augmentedController;

		if (!c.controller) {
			// The controller does not exist!
			res.end('Controller ' + c.controllerName + ' does not exist!');
			return;
		}
		
		// This is the object that will be passed to the rendered
		var finalViewVars = req.variables;
		
		// This function has to be called inside the controller action
		// It renders the view, and fires the beforeRender & afterAction methods
		var renderCallback = function renderCallback(viewNames, viewVars) {
			
			if (typeof viewNames === 'string' || viewNames instanceof Array) {
				c.view = viewNames;
			} else {
				viewVars = viewNames;
			}

			// Set the locale
			finalViewVars.__locale = renderCallback.locale;
			
			return secondComponentStage(req, res, c, finalViewVars, viewVars, renderCallback);
		};

		// Store the augment in the req object
		req.augment = {render: renderCallback};

		// Create the augmented controller
		augmentedController = alchemy.augment(c.controller, req.augment);
		
		// The view hasn't been rendered yet
		renderCallback.rendered = false;
		renderCallback.rendering = false;

		// Languages the client accepts
		renderCallback.languages = req.languages;

		// Is the server too busy?
		renderCallback.toobusy = req.toobusy;

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

		// Redirect to another url, but call the beforeRedirect callback first
		renderCallback.redirect = function redirect (_status, _url) {
			
			var url, status;
			
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

					res.redirect(cont_status, cont_url);
					
				}, renderCallback, comp_url, comp_status);
				
			}, url, status);
			
		}
		
		// The payload object
		renderCallback.viewVars = finalViewVars;
		
		// Launch the initialize method of the components
		augmentedController._launchComponents('initialize', renderCallback, function afterComponentInitialize () {
			
			// First call the beforeAction callback
			augmentedController.beforeAction(function beforeActionNext (viewVars) {
				
				if (typeof viewVars === 'object') alchemy.inject(finalViewVars, viewVars);
				
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
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 */
var secondComponentStage = function secondComponentStage(req, res, c, finalViewVars, viewVars, renderCallback) {
	
	if (typeof viewVars == 'object') alchemy.inject(finalViewVars, viewVars);
	
	// Now call the component startup methods
	c.controller._launchComponents('beforeRender', renderCallback, function afterComponentBeforeRender () {
		
		// Indicate a render is happening
		renderCallback.rendering = true;
		
		// Call the beforeRender function
		c.controller.beforeRender(function beforeRenderNext (viewVars) {
			
			if (typeof viewVars == 'object') alchemy.inject(finalViewVars, viewVars);
			if (typeof finalViewVars.__current__ == 'undefined') finalViewVars.__current__ = {};

			alchemy.render(req, res, c.view, finalViewVars, function renderCallback (err, html) {
				
				// The actual render has happened, but we still need to run the afterRender
				renderCallback.rendered = true;
				
				// Call the component shutdown methods
				c.controller._launchComponents('shutdown', renderCallback, function afterComponentBeforeRender () {
				
					c.controller.afterRender(function afterRenderNext (newHtml) {
						
						renderCallback.rendering = false;
						
						if (typeof newHtml != 'undefined') html = newHtml;
						
						// If the response is an object, jsonify it
						if (typeof html != 'string') {
							html = JSON.stringify(html);
							
							// And tell the client to expect a json object
							res.writeHead(200, {'Content-Type': 'application/json'});
						}
						
						// Finally send the html to the browser
						res.end(html);
						
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
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   req
 * @param    {Object}   res
 * @param    {Array}    view       View location, as a string or array with fallbacks
 * @param    {Object}   payload
 * @param    {Function} callback
 */
alchemy.render = function render(req, res, view, payload, callback) {
	
	var i, waterfall = [], useView = 'error/404';
	
	if (!(view instanceof Array)) view = [view];
	
	var tasks = [];
	
	for (i = 0; i < view.length; i++) {
		
		(function(viewname) {
			tasks.push(function(asyncCallback) {
				
				if (typeof existsCache[viewname] != 'undefined') {
					asyncCallback(null, existsCache[viewname]);
				} else {
					
					var checkPath = alchemy.pathResolve(APP_ROOT, 'public', 'views', viewname + '.ejs');
					
					fs.exists(checkPath, function (exists) {
						
						if (exists) existsCache[viewname] = viewname;
						else existsCache[viewname] = false;
						
						asyncCallback(null, existsCache[viewname]);
					});
				}
				
			});
		})(view[i]);
		
	}
	
	// Discover what view we have to use
	async.parallel(tasks, function (err, results) {
		
		// Take the first existing view
		for (var i = 0; i < results.length; i++) {
			if (results[i]) {
				useView = results[i];
				break;
			}
		}
		
		pr('Going to render view: ' + useView);
		if (typeof callback == 'function') res.render(useView, payload, callback);
		else res.render(useView, payload);
		
	});
	
}