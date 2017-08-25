/**
 * The Controller class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.3.0
 */
global.Controller = Function.inherits('Alchemy.Base', function Controller(conduit, options) {

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
	return this.constructor.name.beforeLast('Controller');
});

/**
 * Alias to the viewRender
 *
 * @type {Hawkejs.ViewRender}
 */
Controller.setProperty(function viewRender() {
	return this.conduit.viewRender;
});

/**
 * Enable a component
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Controller.setMethod(function addComponent(componentname, options) {

	if (!options) {
		options = {};
	}

	this.components[componentname] = Component.get(componentname, this, options);
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

	this.conduit.viewRender.once('executing', function onceBegin() {
		that.conduit.viewRender.showDialog(template);
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
		return this.conduit.set(name);
	}

	return this.conduit.set(name, value);
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
		return this.conduit.set(name);
	}

	if (typeof value == 'string') {
		value = value.encodeHTML();
	}

	return this.conduit.set(name, value);
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
	this.viewRender.set_title(title);
});

/**
 * Set an internal variable for ViewRender through conduit
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Controller.setMethod(function internal(name, value) {

	if (arguments.length == 1) {
		return this.conduit.internal(name);
	}

	return this.conduit.internal(name, value);
});

/**
 * Expose a variable for ViewRender through conduit
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Controller.setMethod(function expose(name, value) {

	if (arguments.length == 1) {
		return this.conduit.expose(name);
	}

	return this.conduit.expose(name, value);
});

/**
 * Perform the wanted action and fire expected events
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.1
 *
 * @param   {String}   name   The name of the action to execute
 * @param   {Array}    args   Arguments to apply to the action
 */
Controller.setMethod(function doAction(name, args) {

	var that = this;

	if (typeof this[name] !== 'function') {
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

		// Call the actual action
		switch (args.length) {
			case 1:
				return that[name](args[0]);

			case 2:
				return that[name](args[0], args[1]);

			case 3:
				return that[name](args[0], args[1], args[2]);

			case 4:
				return that[name](args[0], args[1], args[2], args[3]);

			default:
				return that[name].apply(that, args);
		}
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

	if (!className.endsWith('ontroller') || Classes.Alchemy[className] == null) {
		className += 'Controller';
	}

	if (Classes.Alchemy[className] == null) {
		className = String(controllerName).controllerClassName();
	}

	if (Classes.Alchemy[className] == null) {
		return false;
	}

	return new Classes.Alchemy[className](conduit||false);
};

/**
 * Alchemy Api controller
 *
 * @constructor
 * @extends       Alchemy.Controller
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       0.4.0
 */
var Api = Function.inherits('Alchemy.Controller', 'Alchemy', function ApiController(conduit, options) {
	ApiController.super.call(this, conduit, options);
});