/**
 * The Controller class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.3.0
 */
global.Controller = Function.inherits('Alchemy.Base', 'Alchemy.Controller', function Controller(conduit, options) {

	this.options = options;

	this.conduit = conduit;
	this.response = conduit.response;
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
 * Alias to the ViewRender instance
 *
 * @type {Hawkejs.ViewRender}
 */
Controller.setProperty(function view_render() {
	return this.conduit.view_render;
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
Controller.setStatic(function setAction(name, fnc) {

	var class_name = this.name;

	if (typeof name == 'function') {
		fnc = name;
		name = fnc.name;
	}

	this.constitute(function setActionWhenConstituted() {

		// Constituters are also applied to child classes,
		// but in this case we only want the current class
		if (this.name != class_name) {
			return;
		}

		this.actions[name] = fnc;
	});
});

/**
 * Enable a component
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 */
Controller.setMethod(function addComponent(name, options) {

	var underscored = name.underscore();

	if (!options) {
		options = {};
	}

	this.components[underscored] = Component.get(name, this, options);
});

/**
 * Render the given template as a segment
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  0.5.0
 *
 * @param   {Array}    template
 */
Controller.setMethod(function renderSegment(template) {

	var that = this,
	    placeholder,
	    variables,
	    options,
	    route;

	// Remember the route used for this segment
	if (this.conduit) {
		route = this.conduit.route.name;
		this.internal('segment_route', this.conduit.route.name);
	}

	// If this is an ajax call the client side is already loaded
	// and nothing more is needed, for now.
	if (this.conduit.ajax) {
		return this.render(template);
	}

	options = {
		newscope : true,
		print    : false,
	};

	// Create the placeholder wrapper
	placeholder = this.view_render.implement(template, options, variables);

	// Add the route to it (also happens on the client side)
	placeholder.element.setAttribute('data-segment-route', route);

	placeholder.getContent(function gotContent(err, html) {

		if (err) {
			return that.conduit.error(err);
		}

		return that.conduit.end(html);
	});
});

/**
 * Render the given template as a dialog with the given action
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.1
 * @version  0.4.1
 *
 * @param   {Mixed}    config
 * @param   {Array}    template
 */
Controller.setMethod(function renderDialogIn(config, template) {

	var that = this,
	    action_arguments,
	    action;

	if (typeof config == 'string') {
		action = config;
		config = {};
	} else {
		action = config.action;
	}

	// If parameters have been given, override them
	if (config.params) {
		let key;

		for (key in config.params) {
			this.param(key, config.params[key]);
		}
	}

	if (config.arguments) {
		action_arguments = config.arguments;
		action_arguments.unshift(this);
	} else {
		action_arguments = this.initial_action_arguments;
	}

	if (!template && config.template) {
		template = config.template;
	}

	// If this is an ajax call the client side is already loaded
	// and nothing more is needed, for now.
	if (this.conduit.ajax) {
		return this.render(template);
	}

	// Let the action do its thing
	this.doAction(action, action_arguments);

	this.view_render.once('executing', function onceBegin() {
		that.view_render.showDialog(template);
	});
});

/**
 * Render the given template
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
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

	this.conduit.status = status;
	template = Array.cast(template);

	Function.parallel(function rendering(next) {
		that.emit('rendering', template, next);
	}, function responding(next) {
		that.conduit.render(template, function afterRender(err, html) {

			if (err != null) {
				return that.conduit.error(err);
			}

			output = html;

			that.emit('responding', next);
		});
	}, function respond(err) {

		if (err != null) {
			return that.conduit.error(err);
		}

		that.conduit.end(output);
	});
});

/**
 * Deny access
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Number}  status
 * @param    {Error}   message   optional error to send
 */
Controller.setMethod(function deny(status, message) {
	return this.conduit.deny(status, message);
});

/**
 * Set/get a cookie
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 * @param    {Object}   options
 *
 * @return   {Mixed}
 */
Controller.setMethod(function cookie(name, value, options) {

	if (arguments.length == 1) {
		return this.conduit.cookie(name);
	}

	return this.conduit.cookie(name, value, options);
});

/**
 * Set/get a session value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 *
 * @return   {Mixed}
 */
Controller.setMethod(function session(name, value) {

	if (arguments.length == 0) {
		return this.conduit.session();
	}

	if (arguments.length == 1) {
		return this.conduit.session(name);
	}

	return this.conduit.session(name, value);
});

/**
 * Get a parameter from the route, post or get query
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 */
Controller.setMethod(function param(name) {
	return this.conduit.param(name);
});

/**
 * Get a parameter from the route
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 */
Controller.setMethod(function routeParam(name) {
	return this.conduit.params[name];
});

/**
 * Update data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Controller.setMethod(function update(name, value) {
	return this.conduit.update(name, value);
});

/**
 * Perform the wanted action and fire expected events
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param   {String}   name   The name of the action to execute
 * @param   {Array}    args   Arguments to apply to the action
 */
Controller.setMethod(function doAction(name, args) {

	var that = this;

	if (this.constructor.actions[name] == null) {
		return this.conduit.notFound(new TypeError('Action "' + name + '" was not found on ' + this.constructor.name));
	}

	if (!this.initial_action_arguments) {
		this.initial_action_arguments = args;
	}

	Function.series(function initializing(next) {
		that.emit('initializing', next);
	}, function filtering(next) {
		that.emit('filtering', next);
	}, function starting(next) {
		that.emit('starting', name, next);
	}, function actioning(err) {

		if (err != null) {
			log.todo('Better error handling: ' + err, {err: err});
			return that.response.end('Error: ' + err);
		}

		that.constructor.actions[name].apply(that, args);
	});
});

/**
 * Return a controller instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
 *
 * @param   {String}   controllerName       The plural name of the controller
 *
 * @return  {Controller}
 */
Controller.get = function get(controllerName, conduit) {

	var className = controllerName.classify();

	if (Classes.Alchemy.Controller[className] == null) {
		return false;
	}

	return new Classes.Alchemy.Controller[className](conduit||false);
};

/**
 * Alchemy Api controller
 *
 * @constructor
 * @extends       Alchemy.Controller
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       1.0.0
 */
var Api = Function.inherits('Alchemy.Controller', function Api(conduit, options) {
	Api.super.call(this, conduit, options);
});