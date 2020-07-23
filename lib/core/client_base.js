'use strict';

/**
 * Alchemy's Client Base class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var ClientBase = Function.inherits('Alchemy.Base', 'Alchemy.Client', function Base() {});

// PROTOBLAST START CUT
/**
 * Get the server implementation of this class
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Function}
 */
ClientBase.setStatic(function getServerClass() {

	var namespace;

	if (!this.namespace) {
		return;
	}

	// Remove the "Client" part of the namespace
	namespace = this.namespace.replace('.Client.', '.');
	namespace = namespace.replace('.Client', '');

	// Get the actual namespace object
	namespace = Function.getNamespace(namespace);

	if (!namespace) {
		return;
	}

	return namespace[this.name];
});
// PROTOBLAST END CUT

/**
 * Set a property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.4
 *
 * @param    {String}     key        Name of the property
 * @param    {Function}   getter     Optional getter function
 * @param    {Function}   setter     Optional setter function
 * @param    {Boolean}    on_server  Also set on the server implementation
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
		var ServerClass = this.getServerClass(),
		    property_name;

		if (typeof key == 'string') {
			property_name = key;
		} else if (typeof key == 'function') {
			property_name = key.name;
		}

		if (ServerClass && !ServerClass.prototype.hasOwnProperty(property_name)) {
			Function.setProperty(ServerClass, key, getter, setter);
		}
	}

	return Function.setProperty(this, key, getter, setter);
});

/**
 * Prepare a property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {String}     key        Name of the property
 * @param    {Function}   getter     Optional getter function
 * @param    {Boolean}    on_server  Also set on the server implementation
 */
ClientBase.setStatic(function prepareProperty(key, getter, on_server) {

	if (typeof key == 'function') {
		on_server = getter;
		getter = key;
		key = getter.name;
	}

	if (Blast.isNode && on_server !== false) {
		var ServerClass = this.getServerClass(),
		    property_name;

		if (typeof key == 'string') {
			property_name = key;
		} else if (typeof key == 'function') {
			property_name = key.name;
		}

		if (ServerClass && !ServerClass.prototype.hasOwnProperty(property_name)) {
			Function.prepareProperty(ServerClass.prototype, key, getter);
		}
	}

	return Function.prepareProperty(this.prototype, key, getter);
});

/**
 * Set a method
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}     key        Name of the property
 * @param    {Function}   method     The method to set
 * @param    {Boolean}    on_server  Also set on the server implementation
 */
ClientBase.setStatic(function setMethod(key, method, on_server) {

	if (typeof key == 'function') {
		on_server = method;
		method = key;
		key = method.name;
	}

	if (Blast.isNode && on_server !== false) {
		var ServerClass = this.getServerClass();

		if (ServerClass && !ServerClass.prototype.hasOwnProperty(key)) {
			Function.setMethod(ServerClass, key, method);
		}
	}

	return Function.setMethod(this, key, method);
});

/**
 * Register an event-to-method name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.1
 * @version  1.1.1
 *
 * @param    {String}   event_name
 * @param    {String}   method_name
 */
ClientBase.setStatic(function mapEventToMethod(event_name, method_name) {

	function doMap() {

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

	this.constitute(doMap);

	if (Blast.isNode) {
		let ServerClass = this.getServerClass();

		if (ServerClass) {
			ServerClass.constitute(doMap);
		}
	}
});

/**
 * Get a client model
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 *
 * @param   {String}   name
 * @param   {Object}   options
 *
 * @return  {Model}
 */
ClientBase.setMethod(function getModel(name, init, options) {

	var constructor,
	    instance;

	if (typeof init != 'boolean') {
		options = init;
		init = true;
	}

	if (Blast.isBrowser) {
		constructor = Hawkejs.Model.getClass(name);
	} else {
		constructor = Blast.Classes.Hawkejs.Model.getClass(name);
	}

	if (!constructor) {
		throw new Error('Model "' + name + '" could not be found');
	}

	if (!init) {
		return constructor;
	}

	instance = new constructor(options);

	let conduit = this.conduit;

	if (!conduit) {
		if (this.view && this.view.conduit) {
			conduit = this.view.conduit;
		} else if (this.view && this.view.root_renderer && this.view.root_renderer.conduit) {
			conduit = this.view.root_renderer.conduit;
		}
	}

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
 * @version  1.1.1
 *
 * @param    {String}   name   The name of the event to emit
 * @param    {Array}    args   The parameters to pass to the event
 * @param    {Function} next   The optional callback
 */
ClientBase.setMethod(function issueEvent(name, args, next) {

	let that = this,
	    method_name,
	    promise;

	if (typeof args == 'function') {
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
		promise = this[method_name].apply(this, args);
	}

	Pledge.done(promise, function doneEventPromise(err, result) {

		if (err) {
			return next(err);
		}

		let event_args = args.slice(0);

		event_args.unshift(name);
		event_args.push(next);

		that.emit.apply(that, event_args);
	});
});

if (!Blast.isBrowser) {
	return;
}

Blast.Globals.log = {
	warn: console.log.bind(console),
	warning: console.log.bind(console),
	todo: function todo() {
		var args = Array.cast(arguments);
		args.unshift('[TODO]');
		return console.log.apply(console, args);
	}
};