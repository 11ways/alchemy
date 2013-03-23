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
	
	// Use a model with this controller?
	this.useModel = true;
	
	// The main model for this controller
	this.Model = false;
	
	// Components for this controller
	this.components = false;
	
	// Component instances
	this._components = {};
	
	// The controller init, where models are loaded
	this.init = function init () {
		
		// Get the models
		if (this.useModel === true && this.singular) {
			this.Model = Model.get(this.singular);
			this[this.singular.camelize()] = this.Model;
		}
		console.log('Getting parent components ...');
		// Get our parent's components, and merge our current ones in it
		var parentComponents = this.parent('components');
		
		console.log(parentComponents);
		
		if (typeof parentComponents != 'object') parentComponents = {};
		
		// Add the parent controller's components to this one
		this.components = alchemy.inject(parentComponents, this.components);
		
		console.log('Components: ');
		console.log(this.components);
		
		//// Construct the controllers
		//if (this.components) {
		//	for (var componentName in this.components) {
		//		this._components[componentName] = Component.get(componentName, this, this.components[componentName]);
		//	}
		//}
		
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
	 * Launch methods of all this controller's components
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {string}     methodName  The method's name to run
	 * @param   {function}   next        The next function to run
	 *
	 * @return void
	 */
	this._launchComponents = function _launchComponents (methodName, render, next) {
		
		if (!this.components) next();
		
		var series = [];

		for (var componentName in this._components) {
			
			length++;
			
			series.push(function asyncCall (callback) {
				
				if (this._components[componentName][methodName]) {
					
					// Prepare the arguments to apply
					var args = arguments;
					
					// Remove the 3 given arguments
					args.shift();
					args.shift();
					args.shift();
					
					args.unshift(render);
					args.unshift(callback);
					
					this._components[componentName][methodName].apply(this, args);
				} else {
					callback();
				}
			});
		}
		
		// If there are calls to make, make them
		if (series.length) {
			
			var check = 0;
			
			var cb = function launchComponentSerieCallback () {
				
				if (series[check]) {
					series[check](function launchComponentSerieCallbackWrapper () {
						check++;
						cb();
					});
				} else {
					next();
				}
				
			}
			
			// Initialize the loop
			cb();
			
		} else {
			next();
		}

	}
	
});

/**
 * Return a controller's instance
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   controllerName       The plural name of the controller
 */
Controller.get = function get (controllerName) {
	
	var camelName = controllerName.camelize();
	var fullName = camelName + 'Controller';
	
	if (typeof alchemy.classes[fullName] == 'undefined') return false;
	
	if (typeof alchemy.instances.controllers[controllerName] == 'undefined') {
		alchemy.instances.controllers[controllerName] = new alchemy.classes[fullName]();
	}
	
	return alchemy.instances.controllers[controllerName];
}

// Store the original extend function
Controller._extend = Controller.extend;

/**
 * Extend the base controller
 * Uses the app controller by default, unless it doesn't exist
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}     name   The name of the class
 * @param   {function}   fnc    The extension
 *
 * @returns {function}
 */
Controller.extend = function extend (name, fnc) {
	
	if (typeof alchemy.classes.AppController == 'undefined') {
		return alchemy.classes.Controller._extend(name, fnc);
	} else {
		return alchemy.classes.AppController.extend(name, fnc);
	}
}

alchemy.classes.Controller = Controller;