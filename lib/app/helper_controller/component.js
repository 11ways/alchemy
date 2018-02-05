/**
 * The Component class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Controller}   controller
 * @param    {Object}       options
 */
var Component = Function.inherits('Alchemy.Client.Base', 'Alchemy.Client.Component', function Component(controller, options) {

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