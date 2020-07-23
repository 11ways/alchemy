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
	this.conduit = conduit;
	this.options = options || {};
});

/**
 * Map these events to methods
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.1
 * @version  1.1.1
 */
Controller.mapEventToMethod({
	initializing : 'onInitialize',
	filtering    : 'onFilter',
	starting     : 'beforeAction'
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
 * The controller name
 *
 * @type {String}
 */
Controller.prepareProperty('name', function name() {
	return this.constructor.name;
});

/**
 * The model linked to this controller
  *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.5
 *
 * @type     {Model}
 */
Controller.prepareProperty(function model() {

	var instance;

	instance = this.getModel(this.name);

	return instance;
});

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
 * @version  1.1.0
 *
 * @param   {Number}   status
 * @param   {Array}    templates
 */
Controller.setMethod(function render(status, templates) {

	var that = this,
	    conduit = this.conduit,
	    output;

	if (templates == null) {
		templates = status;
		status = conduit.status || 200;
	}

	templates = this.view_render.add(templates);

	Function.parallel(function rendering(next) {
		that.emit('rendering', templates, next);
	}, function done(err) {

		if (err != null) {
			throw err;
		}

		let pledge = hawkejs.scene.handleServerResponse(conduit.url, conduit.options, that.view_render);
		pledge.done(conduit.callback);
	});
});

/**
 * End the response
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String|Object}   message
 */
Controller.setMethod(function end(message) {
	return this.conduit.end(message);
});

/**
 * Perform the wanted action and fire expected events
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param   {String}   name   The name of the action to execute
 * @param   {Array}    args   Arguments to apply to the action
 */
Controller.setMethod(function doAction(name, args) {

	var that = this;

	if (Blast.isNode && this.conduit) {

		if (this.conduit.aborted) {
			return;
		}

		let session = this.conduit.getSession(false);

		if (session) {
			session.action_count++;
		}
	}

	if (this.constructor.actions[name] == null) {
		return this.conduit.notFound(new TypeError('Action "' + name + '" was not found on ' + this.constructor.name));
	}

	if (!this.initial_action_arguments) {
		this.initial_action_arguments = args;
	}

	if (this.conduit && this.conduit.route && this.conduit.route.options && this.conduit.route.options.title) {

		let title = this.conduit.route.options.title;

		if (alchemy.settings && alchemy.settings.title_suffix) {
			title += alchemy.settings.title_suffix;
		}

		this.setTitle(title);
	}

	Function.series(function initializing(next) {
		that.issueEvent('initializing', next);
	}, function filtering(next) {
		that.issueEvent('filtering', next);
	}, function starting(next) {
		that.issueEvent('starting', [name], next);
	}, function actioning(next) {

		var result = that.constructor.actions[name].apply(that, args);

		if (result && typeof result.then == 'function') {
			result.then(function() {
				next();
			}).catch(next);
		} else {
			next();
		}

	}, function done(err) {

		if (err != null) {
			that.conduit.error(err);
			return;
		}

	});
});

/**
 * Create client controller class for specific controller name
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {String}   controller_name
 */
Controller.setStatic(function getClass(controller_name) {

	var model_constructor,
	    ControllerClass,
	    parent_path,
	    class_name,
	    class_path,
	    config,
	    key;

	// Construct the name of the class
	class_name = controller_name;

	// Construct the path to this class
	class_path = 'Alchemy.Client.Controller.' + class_name;

	// Get the class
	ControllerClass = Object.path(Blast.Classes, class_path);

	if (ControllerClass == null) {
		model_constructor = Function.create(class_name, function ControllerConstructor(record, options) {
			ControllerConstructor.wrapper.super.call(this, record, options);
		});

		// @TODO: inherit from parents
		parent_path = 'Alchemy.Client.Controller';

		ControllerClass = Function.inherits(parent_path, model_constructor);
	}

	return ControllerClass;
});

// Make this class easily available
Hawkejs.Controller = Controller;