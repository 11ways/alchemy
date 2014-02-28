var async = require('async');

/**
 * The Controller class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
var Controller = global.Controller = alchemy.classes.BaseClass.extend(function Controller (){

	// Components for this controller
	this.components = false;
	
	/**
	 * The controller preInit constructor
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @return {undefined}
	 */
	this.preInit = function preInit() {
		// Use a model with this controller?
		this.useModel = true;
		
		// The main model for this controller
		this.Model = null;
		
		// Component instances
		this._components = {};
	};
	
	/**
	 * The controller init constructor
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @return {undefined}
	 */
	this.init = function init () {

		// Get the models
		if (this.useModel === true && this.singular) {
			
			if (this.Model === null) this.Model = Model.get(this.singular);
			
			this[this.singular.camelize()] = this.Model;
		}

		// We'll create a reference to this controller's components
		var thisComponents = this.components;
		
		// Get our parent's components, so we can merge the current ones in it later
		var parentComponents = this.parent('components');

		if (typeof parentComponents === 'object' && typeof thisComponents === 'object') {
			// If this controller and its parent have components, merge them
			this.components = alchemy.inject(parentComponents, this.components);
		} else if (typeof parentComponents === 'object') {
			// If only the parent has components, overwrite them
			this.components = alchemy.inject({}, parentComponents);
		}

		// Construct the components
		if (typeof this.components === 'object') {
			for (var componentName in this.components) {

				// Store every component in here
				this._components[componentName] = Component.get(componentName, this, this.components[componentName]);

				// If components should be exposed easily, store them under the controller
				if (this._components[componentName].expose) {
					this[componentName.classify()] = this._components[componentName];
				}
			}
		}
	};

	/**
	 * Get an augmented component
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}   classifiedName
	 */
	this.component = function getComponent(classifiedName) {

		var cache = '__comp_' . classifiedName,
		    augmented;

		// If there is an augment here, cache the component
		if (this[cache]) {
			augmented = this[cache];
		} else {
			augmented = alchemy.augment(this[classifiedName], this.__augment__);
		}

		if (!this[cache] && this.__augment__) {
			this[cache] = augmented;
		}

		return augmented;
	};
	
	this.__extended__ = function __extended__ (parentClassName) {
		// Store this class in the controller collection
		alchemy.controllers[this.name.replace('Controller', '')] = this;
	}
	
	/**
	 * Called before the controller action, when coming from a route
	 * Perform logic here that needs to happen before each controller action.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {function}  next    The callback to call when we're done
	 * @param    {object}    render  The render object passed to the action,
	 *                               if it is called as a function the view will
	 *                               be rendered without doing the logic
	 *
	 * @return void
	 */
	this.beforeAction = function beforeAction (next, render) {
		next();
	}
	
	/**
	 * Called after the controller action is run, but before the view is rendered.
	 * Perform logic here or set view variables that are required on every request.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {function}  next    The callback to call when we're done
	 * @param    {object}    render  The render object passed to the action
	 *
	 * @return void
	 */
	this.beforeRender = function beforeRender (next, render) {
		next();
	}
	
	/**
	 * Called after Express/hawkejs has rendered a view
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {function}  next    The callback to call when we're done
	 * @param    {object}    render  The render object passed to the action
	 *
	 * @return void
	 */
	this.afterRender = function afterRender (next, render, err, html) {
		next();
	}
	
	/**
	 * Called after the controller action is run and rendered.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {object}     render  The render object, should not be executed anymore
	 *
	 * @return void
	 */
	this.afterAction = function afterAction (render) {

	}
	
	/**
	 * Called before a render.redirect,
	 * after a component's beforeRedirect.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {function}  next    The callback to call when we're done
	 *                               If the callback's first parameter is false,
	 *                               the redirect will be canceled.
	 *                               If it's a string, the redirect will go there.
	 * @param    {object}    render  The render object passed to the action
	 * @param    {string}    url     The url that is being redirected to
	 * @param    {integer}   status  The status code that is going to be sent
	 *
	 * @return void
	 */
	this.beforeRedirect = function beforeRedirect (next, render, url, status) {
		next();
	}
	
	/**
	 * Launch methods of all this controller's components
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {String}     methodName  The method's name to run
	 * @param   {Object}     render
	 * @param   {Function}   next        The next function to run
	 *
	 * @return  {undefined}
	 */
	this._launchComponents = function _launchComponents(methodName, render, next) {
		
		if (!this.components) {
			next();
			return;
		}
		
		var thisScope = this;
		var series = [];

		for (var componentName in this._components) {
			series.push(function(task_callback) {
				thisScope._launchComponentMethod(componentName, methodName, render, task_callback);
			});
		}
		
		if (series.length) {
			async.series(series, function tasks_done (err, results) {next();});
		} else {
			next();
		}
	};
	
	/**
	 * Launch method of a specific component
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {String}     componentName  The component name
	 * @param   {String}     methodName     The method's name to run
	 * @param   {Object}     render
	 * @param   {Function}   next           The next function to run
	 *
	 * @return  {undefined}
	 */
	this._launchComponentMethod = function _launchComponentMethod(componentName, methodName, render, callback) {

		if (this._components[componentName][methodName]) {
			
			// Prepare the arguments to apply
			var args = Array.prototype.slice.call(arguments, 0);
			
			// Remove the 4 given arguments, and add callback & render
			args.splice(0, 4, callback, render)
			
			this._components[componentName][methodName].apply(this, args);
		} else {
			callback();
		}
	};
	
});

/**
 * Return a controller's instance
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   controllerName       The plural name of the controller
 * @param   {Object}   augmentData          Optional object to augment the
 *                                          instance with.
 */
Controller.get = function get(controllerName, augmentData) {
	
	var camelName = controllerName.camelize(),
	    fullName  = camelName,
	    instance;

	// Make sure the full name ends with Controller
	if (!fullName.endsWith('Controller')) {
		fullName = fullName + 'Controller';
	}

	if (typeof alchemy.classes[fullName] === 'undefined') return false;
	
	if (typeof alchemy.instances.controllers[controllerName] === 'undefined') {
		alchemy.instances.controllers[controllerName] = new alchemy.classes[fullName]();
	}
	
	instance = alchemy.instances.controllers[controllerName];

	if (typeof augmentData === 'object') {
		instance = alchemy.augment(instance, augmentData);
	}

	return instance;
};

/**
 * Get an augmented controller
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   controllerName   The name of the controller to get
 * @param    {Object}   extraData        Optional object to augment the instance
 *                                       with. Will use this.__augment__ if not
 *                                       provided.
 */
BaseClass.prototype.getController = function getController(controllerName, extraData) {

	var keys, key, nr;

	// If no extraData was given and an augment is present
	if (!extraData && this.__augment__) {
		// Get the OWN properties of this augmentation
		keys = Object.getOwnPropertyNames(this);

		// Add all these own properties to the __augment__ object
		for (nr = 0; nr < keys.length; nr++) {

			key = keys[nr];

			// Skip keys which should not be inherited further
			if (this.__augmentNoInherit[key]) {
				continue;
			}

			this.__augment__[key] = this[key];
		}
	}

	return Controller.get(controllerName, extraData||this.__augment__);
};

// Store the original extend function
Controller._extend = Controller.extend;

/**
 * Overwrite the original extend method:
 * automatically extend from the AppController if it's available.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}    name     The name of the class to extend from
 * @param   {Object}    options  Extra options
 *                      .base    Extend from Controller, not AppController
 *                               False by default
 * @param   {Function}  fnc      The extension
 *
 * @returns {Function}
 */
Controller.extend = function extend(name, options, fnc) {
	
	if (typeof name !== 'string') {
		fnc = options;
		options = name;
		name = undefined;
	}
	
	if (typeof fnc === 'undefined') {
		fnc = options;
		options = {};
	}
	
	if (typeof options.base === 'undefined') options.base = false;
	
	if (this.name == 'Controller') {
		if (options.base || typeof alchemy.classes.AppController === 'undefined') {
			return alchemy.classes.Controller._extend(name, options, fnc);
		} else {
			return alchemy.classes.AppController._extend(name, options, fnc);
		}
	} else {
		return this._extend(name, options, fnc);
	}
};
