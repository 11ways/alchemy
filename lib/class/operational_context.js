const DATA = Symbol('data'),
      PARENT = Symbol('parent');

/**
 * The OperationalContext class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext}   parent
 */
const OperationalContext = Function.inherits('Alchemy.Base', 'Alchemy.OperationalContext', function OperationalContext(parent) {

	// Store the optional parent context
	this[PARENT] = parent || null;

	// Create the data object
	this[DATA] = parent ? Object.create(parent[DATA]) : {};
});

/**
 * The property creator
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
OperationalContext.setStatic(function setContextProperty(name, getter, setter) {

	let camelized = name.camelize(),
	    set_method = 'set' + camelized,
	    get_method = 'get' + camelized;

	if (setter) {
		this.setMethod(set_method, function set(value) {
			this[DATA][name] = setter.call(this, value);
			return this;
		});
	} else {
		this.setMethod(set_method, function set(value) {
			this[DATA][name] = value;
			return this;
		});
	}

	if (getter) {
		this.setMethod(get_method, function get() {
			return getter.call(this, this[DATA][name]);
		});
	} else {
		this.setMethod(get_method, function get() {
			return this[DATA][name];
		});
	}
});

/**
 * Get a value by name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   key
 *
 * @return   {*}
 */
OperationalContext.setMethod(function get(key) {
	return this[DATA][key];
});

/**
 * Set a value by name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   key
 * @param    {*}        value
 *
 * @return   {*}
 */
OperationalContext.setMethod(function set(key, value) {
	this[DATA][key] = value;
	return this;
});

/**
 * Get the parent
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {Alchemy.OperationalContext}
 */
OperationalContext.setMethod(function getParent() {
	return this[PARENT];
});

/**
 * Set the parent
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext}   context
 */
OperationalContext.setMethod(function setParent(context) {
	return this[PARENT] = context;
});

/**
 * Create a new child instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {OperationalContext}
 */
OperationalContext.setMethod(function createChild() {
	return new this.constructor(this);
});