const OBJECT = Symbol('Object'),
      BACKING = Symbol('Backing'),
	  MAP = Symbol('Map');

/**
 * The Backed map class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.2.1
 */
const Backed = Function.inherits('Alchemy.Base', 'Alchemy.Map', function Backed(backing) {
	this.local = new Map();
	this.type = null;
	this.backing = backing;
});

/**
 * Undry the given value
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.2.1
 *
 * @param    {Object}   value
 *
 * @return   {EnumValues}
 */
Backed.setStatic(function unDry(value, custom_method, whenDone) {
	let result = new this(value.backing);
	return result;
});

/**
 * Get the size
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.2.1
 */
Backed.setProperty(function size() {
	return this.keys().length;
});

/**
 * Set the backing value
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.2.1
 */
Backed.enforceProperty(function backing(new_value, old_value) {

	this.backing = null;
	this.type = null;

	if (!new_value) {
		return;
	}

	if (new_value instanceof Backed) {
		this.type = BACKING;
	} else if (new_value instanceof Map) {
		this.type = MAP;
	} else if (typeof new_value == 'object') {
		this.type = OBJECT;
	}

	return new_value;
});

/**
 * Create a (shallow) clone of this backed map.
 * Since we don't ever touch the backing itself, we don't have to clone that.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.2.1
 *
 * @return   {Backed}
 */
Backed.setMethod(function clone() {
	let result = new this.constructor(this.backing);
	result.local = new Map(this.local);
	return result;
});

/**
 * Create a (shallow) clone of this backed map.
 * Since we don't ever touch the backing itself, we don't have to clone that.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.2.1
 *
 * @return   {Backed}
 */
Backed.setMethod(function dryClone(wm, custom_method) {
	return this.clone();
});

/**
 * Simplify the object for Hawkejs
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.2.1
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Backed}
 */
Backed.setMethod(function toHawkejs(wm) {

	let values = new Map(),
	    value,
	    keys = this.keys(),
		key;
	
	for (key of keys) {
		value = this.get(key);
		values.set(key, JSON.clone(value, 'toHawkejs', wm));
	}

	return new this.constructor(values);
});

/**
 * Get all the keys
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.2.1
 *
 * @return   {String[]}
 */
Backed.setMethod(function keys() {

	let result;

	if (this.type == BACKING) {
		result = this.backing.keys();
	} else if (this.type == MAP) {
		result = [...this.backing.keys()];
	} else if (this.type == OBJECT) {
		result = Object.keys(this.backing);
	} else {
		result = [];
	}

	if (this.local.size) {
		for (let key of this.local.keys()) {
			if (result.indexOf(key) == -1) {
				result.push(key);
			}
		}
	}

	return result;
});

/**
 * Get a value by it's name
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.2.1
 *
 * @param    {String}   name
 *
 * @return   {Mixed}
 */
Backed.setMethod(function get(name) {

	if (this.local.has(name)) {
		return this.local.get(name);
	}

	if (!this.type) {
		return;
	}

	let value;

	if (this.type == BACKING || this.type == MAP) {
		value = this.backing.get(name);
	} else if (this.type == OBJECT) {
		value = this.backing[name];
	}

	return value;
});

/**
 * Set a value
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.2.1
 *
 * @param    {String}   name
 * @param    {*}        value
 *
 * @return   {*}
 */
Backed.setMethod(function set(name, value) {
	this.local.set(name, value);
	return value;
});

/**
 * Dry the object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.2.1
 *
 * @return   {Object}
 */
Backed.setMethod(function toDry() {
	
	let result = {
		backing  : {}
	};

	let value,
	    key;

	for (key of this.keys()) {
		value = this.get(key);
		result.backing[key] = value;
	}

	return {value: result};
});

/**
 * Iterate over the object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.2.1
 *
 * @return   {Object}
 */
Backed.setMethod(Symbol.iterator, function* iterate() {

	let value,
	    key;

	for (key of this.keys()) {
		value = this.get(key);
		yield value;
	}
});