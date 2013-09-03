var fs = require('fs');
var async = require('async');

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
alchemy.addRoute = function addRoute (path, callback, method, order) {
	
	alchemy.sputnik.after('routes', function() {
	
		// The for counter
		var i;
		
		// If no method is given, set all the basic four
		if (!method) method = ['get', 'post', 'put', 'delete'];
		
		// If the given method is a string, turn it into an array
		if (typeof method == 'string') method = [method];

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
 * @param   {string}   name       An identifier for this url
 * @param   {object}   paths      The paths to link
 * @param   {object}   options    Options for this link
 */
alchemy.connect = function connect (name, paths, options) {
	
	var locale;
	var path;
	var fullPath;
	
	// Create an empty options object if none exist
	if (typeof options == 'undefined') options = {};
	if (typeof options.order == 'undefined') options.order = 10;

	// Create a new context for each route connection
	var context = {};
	context.cache = {};	
	context.options = options;
	context.name = name;
	context.paths = paths;
	
	if (typeof paths == 'string') paths = {'': paths};
	
	for (locale in paths) {
		
		path = paths[locale];
		
		fullPath = '';
		if (locale) fullPath += '/' + locale;
		fullPath += path;
		
		alchemy.addRoute(fullPath, routeDispatcher.bind(context), options.method, options.order);
	}
}

/**
 * Send a connecting client to the correct action.
 * The context of this function is defined in alchemy.connect
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 */
var routeDispatcher = function routeDispatcher (req, res) {

	var that = this,
	    R    = Route.get(that.options.routeClass);

	// Store the alchemy route information in the req object
	req.alchemyRoute = alchemy.cloneSafe(this);

	R.dispatch(req, res, that, dispatchController.bind(that));
}

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
var dispatchController = function dispatchController (req, res, c) {

	// Overwrite the found controller options
	req.alchemyRoute.options.controller = c.controllerName;
	req.alchemyRoute.options.action = c.actionName;

	alchemy.doMiddlewareAfter(req, res, function() {

		if (!c.controller) {
			// The controller does not exist!
			res.end('Controller ' + c.controllerName + ' does not exist!');
			return;
		}
		
		// This is the object that will be passed to the rendered
		var finalViewVars = {};
		
		// This function has to be called inside the controller action
		// It renders the view, and fires the beforeRender & afterAction methods
		var renderCallback = function renderCallback(viewNames, viewVars) {
			
			if (typeof viewNames === 'string' || viewNames instanceof Array) {
				c.view = viewNames;
			} else {
				viewVars = viewNames;
			}
			
			return secondComponentStage(req, res, c, finalViewVars, viewVars, renderCallback);
		}
		
		var that = this;
		
		// The view hasn't been rendered yet
		renderCallback.rendered = false;
		renderCallback.rendering = false;

		// Method info
		renderCallback.method = req.method;
		renderCallback.get    = (req.method === 'GET');
		renderCallback.post   = (req.method === 'POST');
		renderCallback.delete = (req.method === 'DELETE');
		renderCallback.put    = (req.method === 'PUT');
		
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

			c.controller._launchComponents('beforeRedirect', renderCallback, function afterComponentBeforeRedirect (_status, _url) {
				
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

				c.controller.beforeRedirect(function beforeRedirectNext (_status, _url) {
					
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
		c.controller._launchComponents('initialize', renderCallback, function afterComponentInitialize () {
			
			// First call the beforeAction callback
			c.controller.beforeAction(function beforeActionNext (viewVars) {
				
				if (typeof viewVars === 'object') alchemy.inject(finalViewVars, viewVars);
				
				// Now call the component startup methods
				c.controller._launchComponents('startup', renderCallback, function afterComponentStartup () {

					// Call the actual action
					c.controller[c.actionName](renderCallback);
					
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
var secondComponentStage = function secondComponentStage (req, res, c, finalViewVars, viewVars, renderCallback) {
	
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
}

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
alchemy.render = function render (req, res, view, payload, callback) {
	
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