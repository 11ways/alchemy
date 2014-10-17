/**
 * The Controller class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
 */
global.Controller = Function.inherits('Informer', function Controller(conduit, options) {

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
 * Enable a component
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Controller.setMethod(function addComponent(componentname, options) {

	if (!options) {
		options = {};
	}

	this.components[componentname] = Component.get(componentname, this, options);
});

/**
 * Return a model instance
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param   {String}   name
 * @param   {Object}   options
 */
Controller.setMethod(function getModel(name, options) {
	return Model.get(name, options);
});

/**
 * Render the given template
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
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

	this.conduit.status = status;
	template = Array.cast(template);

	Function.parallel(function rendering(next) {
		that.emit('rendering', next);
	}, function responding(next) {
		that.conduit.render(template, function afterRender(err, html) {

			if (err != null) {
				log.todo('Better error handling');
				return that.response.end('Error: ' + err);
			}

			output = html;

			that.emit('responding', next);
		});
	}, function respond(err) {

		if (err != null) {
			log.todo('Better error handling', {err: err});
			return that.response.end('Error: ' + err);
		}

		that.response.end(output, 'utf-8');
	});
});

/**
 * Get a parameter from the route, post or get query
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 */
Controller.setMethod(function param(name) {
	return this.conduit.param(name);
});

/**
 * Get a parameter from the route
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 */
Controller.setMethod(function routeParam(name) {
	return this.conduit.params[name];
});

/**
 * Set a variable for ViewRender, through conduit
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * Set an internal variable for ViewRender through conduit
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param   {String}   name   The name of the action to execute
 * @param   {Array}    args   Arguments to apply to the action
 */
Controller.setMethod(function doAction(name, args) {

	var that = this;

	if (typeof this[name] !== 'function') {
		throw new TypeError('Action "' + name + '" was not found on ' + this.constructor.name);
	}

	Function.series(function initializing(next) {
		that.emit('initializing', next);
	}, function filtering(next) {
		that.emit('filtering', next);
	}, function starting(next) {
		that.emit('starting', next);
	}, function actioning(err) {

		if (err != null) {
			log.todo('Better error handling');
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
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param   {String}   controllerName       The plural name of the controller
 *
 * @return  {Controller}
 */
Controller.get = function get(controllerName, conduit) {

	var className = controllerName.classify();

	if (alchemy.classes[className] == null) {
		className += 'Controller';
	}

	if (alchemy.classes[className] == null) {
		className = String(controllerName).controllerClassName();
	}

	if (alchemy.classes[className] == null) {
		return false;
	}

	return new alchemy.classes[className](conduit||false);
};