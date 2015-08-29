/**
 * The Component class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {Controller}   controller
 * @param    {Object}       options
 */
global.Component = Function.inherits(function Component(controller, options) {

	// The parent controller instance
	this.controller = controller;

	// Merge options
	this.options = Object.assign(this.options||{}, options);

	if (typeof this.initialize === 'function') {
		controller.on('initializing', this.initialize, this);
	}

	if (typeof this.startup === 'function') {
		controller.on('starting', this.startup, this);
	}

	if (typeof this.beforeRender === 'function') {
		controller.on('rendering', this.beforeRender, this);
	}

	if (typeof this.shutdown === 'function') {
		controller.on('responding', this.shutdown, this);
	}

	if (typeof this.beforeRedirect === 'function') {
		controller.on('redirecting', this.beforeRedirect, this);
	}
});

/**
 * Return a component instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {String}      behaviourName    The singular name of the behaviour
 * @param    {Controller}  controller       Controller instance
 * @param    {Object}      options          Behaviour options
 *
 * @return   {Behaviour}
 */
Component.get = function get(componentName, controller, options) {

	var fullName = componentName.camelize() + 'Component';

	if (alchemy.classes[fullName] == null) return false;

	return new alchemy.classes[fullName](controller, options);
};