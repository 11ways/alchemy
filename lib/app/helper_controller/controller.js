/**
 * The Controller class
 * (on the client side)
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var Controller = Function.inherits('Alchemy.Client.Base', 'Alchemy.Client.Controller', function Controller(conduit, options) {
	console.log('Setting conduit', conduit);
	this.conduit = conduit;
	this.options = options || {};
});

/**
 * Add action object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Controller.constitute(function addActions() {

	if (this.name == 'Controller') {
		return;
	}

	// Creating new actions object layer
	this.actions = Object.create(this.super.actions || {});
});

/**
 * Add an action
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Controller.setStatic(function setAction(name, fnc, on_server) {

	var class_name = this.name;

	if (typeof name == 'function') {
		on_server = fnc;
		fnc = name;
		name = fnc.name;
	}

	if (on_server == null) {
		on_server = true;
	}

	this.constitute(function setActionWhenConstituted() {

		// Constituters are also applied to child classes,
		// but in this case we only want the current class
		if (this.name != class_name) {
			return;
		}

		if (Blast.isNode && on_server) {
			var ServerClass = this.getServerClass();

			if (ServerClass) {
				ServerClass.setAction(name, fnc);
			} else {
				console.warn('Server class not found for', name)
			}
		}

		this.actions[name] = fnc;
	});
});

/**
 * Object where components are stored
 *
 * @type {Object}
 */
Controller.prepareProperty('components', Object);

/**
 * Alias to the viewRender
 *
 * @type {Hawkejs.ViewRender}
 */
Controller.setProperty(function view_render() {
	return this.conduit.view_render;
});

/**
 * Enable a component
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name     The name of the component
 * @param    {Object}   options
 */
Controller.setMethod(function addComponent(name, options) {

	var underscored,
	    space;

	if (!options) {
		options = {};
	}

	name = name.classify();

	if (!Blast.Classes.Alchemy.Client.Component[name]) {
		return false;
	}

	underscored = name.underscore();

	this.components[underscored] = new Blast.Classes.Alchemy.Client.Component[name](this, options);
}, false);


/**
 * Set a variable for ViewRender, through conduit
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Controller.setMethod(function set(name, value) {

	if (arguments.length == 1) {
		return this.view_render.set(name);
	}

	return this.view_render.set(name, value);
});

/**
 * Set a variable for ViewRender, encode HTML if it's a string
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.1
 * @version  0.4.1
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Controller.setMethod(function safeSet(name, value) {

	if (arguments.length == 1) {
		return this.view_render.set(name);
	}

	if (typeof value == 'string') {
		value = value.encodeHTML();
	}

	return this.view_render.set(name, value);
});

/**
 * Set the page title
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.1
 * @version  0.4.1
 *
 * @param    {String}   title
 */
Controller.setMethod(function setTitle(title) {
	this.set('pagetitle', title);
	this.view_render.set_title(title);
});

/**
 * Set an internal variable for ViewRender
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Controller.setMethod(function internal(name, value) {

	if (arguments.length == 1) {
		return this.view_render.internal(name);
	}

	return this.view_render.internal(name, value);
});

/**
 * Expose a variable for ViewRender
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Controller.setMethod(function expose(name, value) {

	if (arguments.length == 1) {
		return this.view_render.expose(name);
	}

	return this.view_render.expose(name, value);
});

/**
 * Render the given template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param   {Number}   status
 * @param   {Array}    template
 */
Controller.setMethod(function render(status, template) {

	var that = this,
	    output;

	if (template == null) {
		template = status;
		status = this.conduit.status || 200;
	}

	template = Array.cast(template);

	Function.parallel(function rendering(next) {
		that.emit('rendering', template, next);
	}, function done(err) {

		if (err != null) {
			throw err;
		}

		hawkejs.scene.render(template, that.view_render, function rendered(err, result) {
			if (that.conduit.callback) {
				that.conduit.callback(err, result);
			}
		});
	});
});