var async = require('async');
var instances = {};

/**
 * The Route class
 *
 * @constructor
 * @augments alchemy.classes.BaseClass
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
var Route = global.Route = alchemy.classes.BaseClass.extend(function Route (){
	
	// Cache urls and their linked controllers
	this.cache = {};
	
	/**
	 * Prepare to parse a url, and execute the dispatch controller when done
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}   req
	 * @param    {Object}   res
	 * @param    {Object}   route      The route context
	 *                      - options
	 *                      - paths
	 *                      - name
	 * @param    {Function} dispatchController
	 */
	this.dispatch = function dispatch (req, res, route, dispatchController) {
		
		this.parse(req, res, route, function afterRouteParse (c) {
			dispatchController(req, res, c);
		});
		
	}
	
	/**
	 * Parse a url
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}   req
	 * @param    {Object}   res
	 * @param    {Object}   route      The route context
	 *                      - options
	 *                      - paths
	 *                      - name
	 * @param    {Function} next       Passes the c object
	 */
	this.parse = function parse (req, res, route, next) {
		
		var c, options = route.options;
		
		// If this entry does not exist in the cache, create it
		if (typeof this.cache[req.url] == 'undefined') {
			
			c = this.cache[req.url] = {};
			
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
			if (options.inflect !== false) c.controllerName = c.controllerName.controllerName();
			
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
			c = this.cache[req.url];
		}
		
		next(c);
	}
	
});

/**
 * Return a model instance
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   modelName       The singular name of the model
 */
var _get = function get (routeName) {
	
	// If no valid routeName is given, use an empty string
	if (typeof routeName !== 'string') routeName = '';
	
	// Camelize the route name. If it's empty, it'll default to simply 'Route'
	var fullName = routeName.camelize() + 'Route';
	
	// If the wanted route does not exist, fallback to 'Route'
	if (typeof alchemy.classes[fullName] === 'undefined') {
		fullName = 'Route';
	}
	
	// There can only be one instance of a route class,
	// create it if it doesn't exist yet
	if (typeof instances[fullName] === 'undefined') {
		instances[fullName] = new alchemy.classes[fullName]();
	}
	
	return instances[fullName];
}

Route.get = _get;