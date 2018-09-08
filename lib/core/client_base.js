'use strict';

/**
 * Alchemy's Client Base class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var ClientBase = Function.inherits('Alchemy.Base', 'Alchemy.Client', function Base() {});

// HAWKEJS START CUT
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
// HAWKEJS END CUT

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
 * Get a client model
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.5
 *
 * @param   {String}   model_name
 * @param   {Object}   options
 *
 * @return  {Model}
 */
ClientBase.setMethod(function getModel(model_name, options) {

	var constructor,
	    instance;

	if (Blast.isBrowser) {
		constructor = Hawkejs.Model.getClass(model_name);
	} else {
		constructor = Blast.Classes.Hawkejs.Model.getClass(model_name);
	}

	if (!constructor) {
		throw new Error('Model "' + model_name + '" could not be found');
	}

	instance = new constructor(options);

	if (this.conduit) {
		instance.conduit = this.conduit;
	}

	return instance;
});