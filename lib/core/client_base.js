/**
 * Alchemy's Client Base class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 */
const ClientBase = Function.inherits('Alchemy.Base', 'Alchemy.Client', function Base() {});

// PROTOBLAST START CUT
/**
 * Get the server implementation of this class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.1.2
 *
 * @return   {Function}
 */
ClientBase.setStatic(function getServerClass() {

	if (!this.namespace) {
		return;
	}

	// Remove the "Client" part of the namespace
	let namespace = this.namespace.replace('.Client.', '.');
	namespace = namespace.replace('.Client', '');

	// Get the actual namespace object
	namespace = Function.getNamespace(namespace);

	if (!namespace) {
		return;
	}

	return namespace[this.name];
});

/**
 * Request the server side class and do something with it.
 * Can happen asynchronously. Can also not happen at all.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.2
 * @version  1.4.0
 *
 * @param    {Function}
 */
ClientBase.setStatic(function callbackWithServerClass(callback) {

	if (!this.namespace) {
		return;
	}

	let server_class = this.getServerClass();

	if (server_class) {
		return callback.call(this, server_class);
	}

	const that = this;

	STAGES.afterStages('load_app.plugins', function loadedPlugins() {

		server_class = that.getServerClass();

		if (server_class) {
			return callback.call(that, server_class);
		}
	});
});
// PROTOBLAST END CUT

/**
 * Set a property
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.1.2
 *
 * @param    {string}     key        Name of the property
 * @param    {Function}   getter     Optional getter function
 * @param    {Function}   setter     Optional setter function
 * @param    {boolean}    on_server  Also set on the server implementation
 */
ClientBase.setStatic(function setProperty(key, getter, setter, on_server) {

	if (typeof key == 'function') {
		on_server = setter;
		setter = getter;
		getter = key;
		key = getter.name;
	}

	if (typeof setter == 'boolean') {
		on_server = setter;
		setter = undefined;
	}

	if (Blast.isNode && on_server !== false) {
		this.callbackWithServerClass(function gotClass(ServerClass) {
			let property_name;

			if (typeof key == 'string') {
				property_name = key;
			} else if (typeof key == 'function') {
				property_name = key.name;
			}

			if (!ServerClass.prototype.hasOwnProperty(property_name)) {
				Function.setProperty(ServerClass, key, getter, setter);
			}
		});
	}

	return Function.setProperty(this, key, getter, setter);
});

/**
 * Prepare a property
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.5
 * @version  1.1.2
 *
 * @param    {string}     key        Name of the property
 * @param    {Function}   getter     Optional getter function
 * @param    {boolean}    on_server  Also set on the server implementation
 */
ClientBase.setStatic(function prepareProperty(key, getter, on_server) {

	if (typeof key == 'function') {
		on_server = getter;
		getter = key;
		key = getter.name;
	}

	if (Blast.isNode && on_server !== false) {

		this.callbackWithServerClass(function gotClass(ServerClass) {
			let property_name;

			if (typeof key == 'string') {
				property_name = key;
			} else if (typeof key == 'function') {
				property_name = key.name;
			}

			if (!ServerClass.prototype.hasOwnProperty(property_name)) {
				Function.prepareProperty(ServerClass.prototype, key, getter);
			}
		});
	}

	return Function.prepareProperty(this.prototype, key, getter);
});

/**
 * Set a method
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.1.2
 *
 * @param    {string}     key        Name of the property
 * @param    {Function}   method     The method to set
 * @param    {boolean}    on_server  Also set on the server implementation
 */
ClientBase.setStatic(function setMethod(key, method, on_server) {

	if (typeof key == 'function') {
		on_server = method;
		method = key;
		key = method.name;
	}

	if (Blast.isNode && on_server !== false) {
		this.callbackWithServerClass(function gotClass(ServerClass) {
			if (!ServerClass.prototype.hasOwnProperty(key)) {
				Function.setMethod(ServerClass, key, method);
			}
		});
	}

	return Function.setMethod(this, key, method);
});

/**
 * Register an event-to-method name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.1
 * @version  1.1.2
 *
 * @param    {string}   event_name
 * @param    {string}   method_name
 */
ClientBase.setStatic(function mapEventToMethod(event_name, method_name) {

	function addEventMap() {

		if (!this.event_to_method_map) {
			this.setStatic('event_to_method_map', new Map(), false);
		}

		if (typeof event_name == 'object') {
			let name,
			    obj = event_name;

			for (name in obj) {
				this.event_to_method_map.set(name, obj[name]);
			}

		} else {
			this.event_to_method_map.set(event_name, method_name);
		}
	}

	this.constitute(addEventMap);

	if (Blast.isNode) {
		this.callbackWithServerClass(function gotClass(ServerClass) {
			ServerClass.constitute(addEventMap);
		});
	}
});

/**
 * Get a client model
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.2.4
 *
 * @param    {string}   name
 * @param    {Object}   options
 *
 * @return   {Model}
 */
ClientBase.setMethod(function getModel(name, init, options) {

	var constructor,
	    instance;

	if (typeof init != 'boolean') {
		options = init;
		init = true;
	}

	if (!options || !options.strict_name) {
		name = name.modelName();
	}

	if (Blast.isBrowser) {

		if (name == '') {
			constructor = Hawkejs.Model;
		} else {
			constructor = Hawkejs.Model.getClass(name, false);
		}
	} else {

		if (name == '') {
			constructor = Blast.Classes.Hawkejs.Model;
		} else {
			constructor = Blast.Classes.Hawkejs.Model.getClass(name);
		}
	}

	if (!constructor) {
		throw new Error('Model "' + name + '" could not be found');
	}

	if (!init) {
		return constructor;
	}

	instance = new constructor(options);

	let conduit = this.conduit;

	if (conduit) {
		instance.conduit = conduit;
	}

	return instance;
});

/**
 * Emit the event but call the mapped methods first
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.1
 * @version  1.3.22
 *
 * @param    {string}   name   The name of the event to emit
 * @param    {Array}    args   The parameters to pass to the event
 * @param    {Function} next   The optional callback
 *
 * @return   {Pledge}
 */
ClientBase.setMethod(function issueEvent(name, args, next) {

	let that = this,
	    method_name,
	    promise,
	    pledge = new Pledge();

	if (typeof args == 'function' || !Array.isArray(args)) {
		next = args;
		args = [];
	}

	if (this.constructor.event_to_method_map) {
		method_name = this.constructor.event_to_method_map.get(name);
	}

	if (!method_name) {
		method_name = 'on' + name.camelize();
	}

	if (method_name && typeof this[method_name] == 'function') {
		try {
			promise = this[method_name].apply(this, args);
		} catch (err) {
			pledge.reject(err);

			if (next) {
				next(err);
			}

			return pledge;
		}
	}

	Pledge.done(promise, function doneEventPromise(err, result) {

		if (err) {
			pledge.reject(err);

			if (next) {
				next(err);
			}

			return;
		}

		if (result !== false) {
			let event_args = args.slice(0);

			event_args.unshift(name);
			event_args.push(next);

			that.emit.apply(that, event_args);
		}

		pledge.resolve(result);
	});

	return pledge;
});

if (!Blast.isBrowser) {
	return;
}

Blast.Classes.Alchemy.Base.setMethod(ClientBase.prototype.getModel);

Blast.Globals.log = {
	warn: console.log.bind(console),
	warning: console.log.bind(console),
	todo: function todo() {
		var args = Array.cast(arguments);
		args.unshift('[TODO]');
		return console.log.apply(console, args);
	}
};