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
	
	var view = options.controller + '/' + options.action;
	var thisController = Controller.get(options.controller);
	
	if (typeof options == 'undefined') options = {};
	
	if (typeof paths == 'string') paths = {'': paths};
	
	for (locale in paths) {
		
		path = paths[locale];
		
		fullPath = '';
		if (locale) fullPath += '/' + locale;
		fullPath += path;
		
		alchemy.addRoute(fullPath, function(req, res) {
			
			// If the controller exists, execute the function
			if (thisController) {
				
				renderCallback = function renderCallback (payload) {
					if (typeof payload == 'undefined') payload = {};
					alchemy.render(req, res, view, payload);
				}
				
				renderCallback.req = req;
				renderCallback.res = res;
				
				thisController[options.action](renderCallback);
				
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
 * @since    2013.03.19
 * @version  2013.03.19
 *
 */
alchemy.render = function render (req, res, view, payload) {
	res.render(view, payload);
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