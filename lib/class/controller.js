/**
 * The Controller class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.6
 */
global.Controller = Function.inherits('Alchemy.Base', 'Alchemy.Controller', function Controller(conduit, options) {

	this.options = options;
	this.conduit = conduit;
	this.response = conduit.response;

	if (conduit && !conduit.controller) {
		conduit.controller = this;
	}
});

/**
 * Object where components are stored
 *
 * @type {Object}
 */
Controller.prepareProperty('components', Object);

/**
 * Alias to the ViewRender instance
 *
 * @type {Hawkejs.ViewRender}
 */
Controller.setProperty(function view_render() {
	return this.conduit.view_render;
});

/**
 * Add actions from the parent on every constitution
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Controller.constitute(function addActions() {

	if (this.name == 'Controller') {
		this.actions = {};
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
 * Add the readDatasource action
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 */
Controller.setAction(async function readDatasource(conduit) {

	var model = this.model,
	    user_id = null;

	if (!model) {
		return conduit.error(new Error('This controller has no matching model'));
	}

	let that = this;

	// Parse json-dry content only when the user is logged in
	if (conduit.headers['content-type'] == 'application/json-dry' && typeof this.getUserId == 'function') {
		user_id = this.getUserId();

		if (user_id) {
			conduit.body = JSON.undry(conduit.body);
		}
	}

	let criteria = conduit.param('criteria');
	criteria.setOption('document', false);

	model.find(criteria, function gotResult(err, items) {

		if (err) {
			return conduit.error(err);
		}

		model.removePrivateFields(items);
		model.translateItems(items, criteria, Function.thrower);

		conduit.end({
			items     : items,
			available : null
		});
	});

	return

	// We have to normalize the query again,
	// because some fields are not cast properly
	query.normalize(function normalized(err, normalized) {

		if (err) {
			return conduit.error(err);
		}

		// Huge problem here: any ACL check is just ignored
		model.readDatasource(normalized, options, function gotResult(err, items, available) {

			if (err) {
				return conduit.error(err);
			}

			if (items) {
				model.removePrivateFields(items);
				model.translateItems(items, options, Function.thrower);
			}

			conduit.end({
				items     : items,
				available : available
			});
		});
	});
});

/**
 * Add the saveRecord action
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.4
 * @version  1.0.6
 */
Controller.setAction(async function saveRecord(conduit) {

	var model = this.model;

	if (!model) {
		return conduit.error(new Error('This controller has no matching model'));
	}

	let user = conduit.session('UserData');

	if (!user) {
		if (typeof conduit.notAuthorized == 'function') {
			conduit.notAuthorized();
		} else {
			conduit.error(new Error('Not authorized'));
		}

		return;
	}

	let that = this,
	    data = conduit.param('data'),
	    options = conduit.param('options');

	// @TODO: Add some checks here?
	if (data) {
		data = JSON.undry({data: data}).data;
	}

	if (Object.isPlainObject(data)) {
		data = model.createDocument(data);
	}

	// Huge problem here: any ACL check is just ignored
	model.saveRecord(data, options, function gotResult(err, saved_record) {

		if (err) {
			return conduit.error(err);
		}

		if (saved_record) {
			model.removePrivateFields([saved_record]);
			model.translateItems([saved_record], options, Function.thrower);
		}

		conduit.end({
			saved_record : saved_record
		});
	});
});

/**
 * Return a controller instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.5
 *
 * @param   {String}   controller_name       The plural name of the controller
 *
 * @return  {Controller}
 */
Controller.get = function get(controller_name, conduit) {

	var class_name,
	    pieces = controller_name.split('.'),
	    ns;

	// The last part is the name of the class
	class_name = pieces.pop().classify();

	if (pieces.length) {
		if (pieces[0] != 'Controller') {
			pieces.unshift('Controller');
		}

		if (pieces[0] != 'Alchemy') {
			pieces.unshift('Alchemy');
		}

		ns = Function.getNamespace(pieces);
	} else {
		ns = Function.getNamespace('Alchemy.Controller');
	}

	if (ns[class_name] == null) {

		// See if a client-only controller is available
		ns = Function.getNamespace('Alchemy.Client.Controller');

		if (ns[class_name] == null) {
			return false;
		}
	}

	return new ns[class_name](conduit||false);
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