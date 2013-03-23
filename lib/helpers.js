var fs = require('fs');
var path = require('path');

/**
 * Load in the app controllers & models
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   app_path       The path
 */
alchemy.loadApp = function loadApp (app_path) {
	
	alchemy.loadControllers(path.resolve(app_path, 'controllers'));
	alchemy.loadModels(path.resolve(app_path, 'models'));
}

/**
 * Load in controllers
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   controller_path       The path
 */
alchemy.loadControllers = function loadControllers (controller_path) {
	
	// The basic plural
	var plural = 'controllers';
	
	// The expected end of the file name
	var fileTail = '_controller.js';
	
	// File counter
	var file_count;
	
	// The active file
	var fileName;
	
	// The plural name of the current file
	var filePlural;
	
	// The singular name of the current file
	var fileSingular;
	
	// List of files in active directory
	var files;
	
	// The newly created controller
	var newController;

	// Attempt to read in the app_ file
	try {
		newController = require(path.resolve(controller_path, 'app' + fileTail));
		
		newController.singular = 'app';
		newController.plural = 'app';
		
		alchemy.classes.AppController = newController;
	} catch (err) {
		// Do nothing if the file does not exist
	}
	
	// Read in all the files
	files = fs.readdirSync(controller_path);
	
	for (file_count in files) {
		
		fileName = files[file_count];
		filePlural = fileName.replace(fileTail, '');
		fileSingular = filePlural.singularize();
		
		// Do not read in app_ files, we do this ourselves
		if (fileName != 'app' + fileTail) {

			newController = require(path.resolve(controller_path, fileName));
			newController.singular = fileSingular;
			newController.plural = filePlural;
			
			alchemy.classes[newController.name] = newController;
		} else {

		}
	}
}

/**
 * Load in models
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   model_path       The path
 */
alchemy.loadModels = function loadModels (model_path) {
	
	// The basic plural
	var plural = 'models';
	
	// The expected end of the file name
	var fileTail = '_model.js';
	
	// File counter
	var file_count;
	
	// The active file
	var fileName;
	
	// The plural name of the current file
	var filePlural;
	
	// The singular name of the current file
	var fileSingular;
	
	// List of files in active directory
	var files;
	
	// The newly created controller
	var newModel;

	// Attempt to read in the app_ file
	try {
		newModel = require(path.resolve(model_path, 'app' + fileTail));
		
		newModel.singular = 'app';
		newModel.plural = 'app';
		
		newModel.prototype.singular = newModel.singular;
		newModel.prototype.plural = newModel.plural;
		
		alchemy.classes.AppModel = newModel;
	} catch (err) {
		// Do nothing if the file does not exist
	}
	
	// Read in all the files
	files = fs.readdirSync(model_path);
	
	for (file_count in files) {
		
		fileName = files[file_count];
		filePlural = fileName.replace(fileTail, '');
		fileSingular = filePlural.singularize();
		
		// Do not read in app_ files, we do this ourselves
		if (fileName != 'app' + fileTail) {
			
			// Get the new model
			newModel = require(path.resolve(model_path, fileName));
			
			// Set the names
			newModel.singular = fileSingular;
			newModel.plural = filePlural;
			newModel.useTable = filePlural.tableize();
			
			// Add them to the prototype, for new objects
			newModel.prototype.singular = fileSingular;
			newModel.prototype.plural = filePlural;
			newModel.prototype.useTable = newModel.useTable;
			
			alchemy.classes[newModel.name] = newModel;
		}
	}
}

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

/**
 * Copyright Andrée Hansson, 2010
 * Use it however you want, attribution would be nice though.
 * Website:        http://andreehansson.se/
 * GMail/Twitter:  peolanha
 *
 * update 4: Leonardo Dutra, http://twitter.com/leodutra
 *
 * @author   Andrée Hansson
 * @since    2010
 *
 * @param   {object}   superObj
 * @param   {object}   extension
 *
 * @returns {object}   A deeply cloned version of the extension object
 */
alchemy.clone = function(superObj, extension) {
	
	if (superObj && extension) {
		
		var deep = function() {}; // prepare sword
		
		deep.prototype = superObj; // hold it
		
		superObj = new deep; // pull it
		
		return (deep = function(o, ext) { // concentrate
			var k;
			
			for (k in ext) {
				o[k] = typeof ext[k] === 'object' && ext[k] ? deep({}, ext[k]) : ext[k];
			}
			
			return o;
		})(superObj, extension); // push it deep, slicing
	}
	
	return null;
}

/**
 * Inject the properties of one object into another target object
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {object}   target     The object to inject the extension into
 * @param   {object}   extension  The object to inject
 *
 * @returns {object}   Returns the injected target (which it also modifies byref)
 */
alchemy.inject = function inject (target, first, second) {
	
	var length = arguments.length;
	
	// Go over every argument, other than the first
	for (var i = 1; i <= length; i++) {
		var extension = arguments[i];
		
		// Go over every property of the current object
		for (var i in extension) {
			target[i] = extension[i];
		}
	}
	
	return target;
}

/**
 * See if an object is empty or not
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {object}   o     The object to test
 *
 * @returns {boolean}
 */
alchemy.isEmpty = function isEmpty (o) {

  for(var p in o) {
    if (o[p] != o.constructor.prototype[p])
      return false;
  }
  return true;
}