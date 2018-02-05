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
global.Component = Function.inherits('Alchemy.Base', 'Alchemy.Component', function Component(controller, options) {

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
 * @param    {String}      name          The name of the component
 * @param    {Controller}  controller    Controller instance
 * @param    {Object}      options       Component options
 *
 * @return   {Component}
 */
Component.get = function get(name, controller, options) {

	var class_name = name.classify(),
	    constructor = Classes.Alchemy.Component[class_name];

	// Try getting client component if none is found
	if (!constructor) {
		constructor = Classes.Alchemy.Client.Component[class_name];
	}

	if (!constructor) {
		return false;
	}

	return new constructor(controller, options);
};