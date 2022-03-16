/**
 * The EnumValues class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.2.1
 */
const EnumMap = Function.inherits('Alchemy.Map.Backed', 'Enum');

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
EnumMap.setMethod(function get(name) {

	if (this.local.has(name)) {
		return this.local.get(name);
	}

	let value = get.super.call(this, name);

	if (value) {
		value = this.set(name, value);
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
EnumMap.setMethod(function set(name, value) {

	if (value == null) {
		return;
	}

	if (value.is_enumified) {
		this.local.set(name, value);
		return value;
	}

	let result;

	if (typeof value == 'string') {
		result = {
			name  : value,
			title : value,
		};
	} else if (typeof value == 'function') {
		result = {
			name  : value.name,
			title : value.title,
		};
	} else {
		result = {
			name  : value.name,
			title : value.title || value.name,
		};
	}

	result.value = value;
	result.is_enumified = true;

	this.local.set(name, result);

	return result;
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
 * @return   {Enum}
 */
EnumMap.setMethod(function toHawkejs(wm) {

	let result = toHawkejs.super.call(this, wm),
	    original_value,
		cloned_value,
	    keys = this.keys(),
		key;
	
	for (key of keys) {
		original_value = this.get(key);
		cloned_value = result.get(key);

		if (original_value.value) {

			if (typeof original_value.value == 'function') {
				cloned_value.type = 'function';
			}

			if (original_value.value.schema) {
				cloned_value.schema = JSON.clone(original_value.value.schema, 'toHawkejs', wm);
			}
		}
	}

	return result;
});