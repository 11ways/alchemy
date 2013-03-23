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
 */
alchemy.addRoute = function addRoute (path, callback, method) {
	
	// The for counter
	var i;
	
	// If no method is given, set all the basic four
	if (!method) method = ['get', 'post', 'put', 'delete'];
	
	// If the given method is a string, turn it into an array
	if (typeof method == 'string') method = [method];
	
	for (i = 0; i < method.length; i++) alchemy._app[method[i]](path, callback);
}

/**
 * Add a route the MVC way
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   path       The url
 * @param   {object}   callback   The callback function
 * @param   {string}   method     What method to use, default = get
 */
alchemy.connect = function connect (name, paths, options) {
	
	var locale;
	var path;
	var fullPath;
	
	// Each connection has a cache
	var cache = {};
	
	// Create an empty options object if none exist
	if (typeof options == 'undefined') options = {};
	
	if (typeof paths == 'string') paths = {'': paths};
	
	for (locale in paths) {
		
		path = paths[locale];
		
		fullPath = '';
		if (locale) fullPath += '/' + locale;
		fullPath += path;
		
		alchemy.addRoute(fullPath, function RouteDispatcher (req, res) {
			
			// The cache object for this particular parsed url
			var c;
			
			// This controller
			var thisController;
			
			// If the cache doesn't exist, fill it
			if (typeof cache[req.url] == 'undefined') {
				
				c = cache[req.url] = {};
				
				// Get the controller if it hasn't been set in the options
				if (!options.controller) {
					
					if (req.params.controller) {
						c.controllerName = req.params.controller;
					} else {
						c.controllerName = 'app';
					}
					
				} else {
					c.controllerName = options.controller;
				}
				
				// Make sure the controller name is set propperly
				c.controllerName = c.controllerName.controllerName();
				
				// Get the action if it hasn't been set in the options
				if (!options.action) {
					
					if (req.params.action) {
						c.actionName = req.params.action;
					} else {
						c.actionName = 'notfound';
					}
					
				} else {
					c.actionName = options.action;
				}
				
				// Set the view
				if (!options.view) {
					c.view = c.controllerName.underscore() + '/' + c.actionName;
				} else {
					c.view = options.view;
				}
				
				// Get an actual controller instance
				c.controller = Controller.get(c.controllerName);
				
			} else {
				c = cache[req.url];
			}
			
			// If the controller exists, execute the function
			if (c.controller) {
				
				// This is the object that will be passed to the rendered
				var finalViewVars = {};
				
				// This function has to be called inside the controller action
				// It renders the view, and fires the beforeRender & afterAction methods
				renderCallback = function renderCallback (viewVars) {
					
					if (typeof viewVars == 'object') alchemy.inject(finalViewVars, viewVars);
					
					// Now call the component startup methods
					c.controller._launchComponents('beforeRender', renderCallback, function afterComponentBeforeRender () {
						
						// Indicate a render is happening
						renderCallback.rendering = true;
						
						// Call the beforeRender function
						c.controller.beforeRender(function beforeRenderNext (viewVars) {
							
							if (typeof viewVars == 'object') alchemy.inject(finalViewVars, viewVars);
							
							alchemy.render(req, res, c.view, finalViewVars, function renderCallback (err, html) {
								
								// The actual render has happened, but we still need to run the afterRender
								renderCallback.rendered = true;
								
								// Call the component shutdown methods
								c.controller._launchComponents('shutdown', renderCallback, function afterComponentBeforeRender () {
								
									c.controller.afterRender(function afterRenderNext (newHtml) {
										
										renderCallback.rendering = false;
										
										if (typeof newHtml != 'undefined') html = newHtml;
										
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
				
				// The view hasn't been rendered yet
				renderCallback.rendered = false;
				renderCallback.rendering = false;
				
				// Set controller info
				renderCallback.actionName = c.actionName;
				renderCallback.controllerName = c.controllerName;
				
				// Add the request & response objects
				renderCallback.req = req;
				renderCallback.res = res;
				
				// The payload object
				renderCallback.viewVars = finalViewVars;
				
				// Launch the initialize method of the components
				c.controller._launchComponents('initialize', renderCallback, function afterComponentInitialize () {
					
					// First call the beforeAction callback
					c.controller.beforeAction(function beforeActionNext (viewVars) {
						
						if (typeof viewVars == 'object') alchemy.inject(finalViewVars, viewVars);
						
						// Now call the component startup methods
						c.controller._launchComponents('startup', renderCallback, function afterComponentStartup () {
							
							// Call the actual action
							c.controller[c.actionName](renderCallback);
							
						});
						
					}, renderCallback);
					
				});
				
			} else {
				// The controller does not exist!
				res.end('Controller does not exist!');
			}
			
		}, options.method);
	}
}

/**
 * Render a view
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 */
alchemy.render = function render (req, res, view, payload, callback) {
	
	if (typeof callback == 'function') res.render(view, payload, callback);
	else res.render(view, payload);
	
}