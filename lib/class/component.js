/**
 * The Component class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
var Component = global.Component = alchemy.classes.BaseClass.extend(function Component (){
	
	// Other components this component uses
	this.components = {};
	
	// The calling controller
	this.controller = {};
	
	// Default options
	this.options = {};
	
	// The controller init, where models are loaded
	this.init = function init (controller, options) {
		
		this.controller = controller;
		
		alchemy.inject(this.options, options);
		
	}
	
	/**
	 * Called before the controller's beforeAction
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
	this.initialize = function initialize (next, render) {
		next();
	}
	
	/**
	 * Called after the controller's beforeAction,
	 * but before beforeRender
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
	this.startup = function startup (next, render) {
		next();
	}
	
	/**
	 * Called after the controller's action is run
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
	this.beforeRender = function beforeRender (next, render) {
		next();
	}
	
	/**
	 * Called after Express/hawkejs has rendered a view,
	 * but before the output is sent to the browser
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
	this.shutdown = function shutdown (next, render, err, html) {
		next();
	}
	
	/**
	 * Called before a render.redirect,
	 * before the controller's beforeRedirect.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {function}  next    The callback to call when we're done
	 *                               If the callback's first parameter is false,
	 *                               the redirect will be canceled.
	 *                               If it's a string, the redirect will go there.
	 * @param    {object}    render  The render object passed to the action,
	 * @param    {string}    url     The url that is being redirected to
	 * @param    {integer}   status  The status code that is going to be sent
	 *
	 * @return void
	 */
	this.beforeRedirect = function beforeRedirect (next, render, url, status) {
		next(true);
	}
	
});

/**
 * Return a component instance
 * These are not cached
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   componentName       The singular name of the component
 * @param   ...                            Other arguments
 */
Component.get = function get (componentName) {

	var fullName = componentName.camelize() + 'Component';
	
	if (typeof alchemy.classes[fullName] == 'undefined') return false;
	
	var args = Array.prototype.slice.call(arguments, 0);
  args.sort();
	
	// Remove the first argument (which is the component name)
	args.shift();
	
	var returnComponent = new alchemy.classes[fullName](args);
	
	return returnComponent;
}