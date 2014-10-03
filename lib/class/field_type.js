/**
 * The FieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
global.FieldType = Function.inherits(function FieldType(name, options) {
	this.name = name;
	this.options = options;

	this.hasDefault = Object.hasProperty(options, 'default');
	this.isTranslatable = !!options.translatable;
	this.isObject = this.isTranslatable;
	this.isArray = !!options.array;
});

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Mixed}
 */
FieldType.setMethod(function cast(value) {
	return value;
});

/**
 * Get the default value out of the options
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Mixed}
 */
FieldType.setMethod(function getDefault() {

	var value;

	if (!this.hasDefault) {
		return;
	}

	if (typeof this.options.default === 'function') {
		value = this.options.default();
	} else {
		value = this.options.default;
	}

	return this.getValue(this.cast(value));
});

/**
 * Get the value to store, using the given value
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Mixed}
 */
FieldType.setMethod(function getValue(value) {

	var target,
	    result,
	    temp,
	    key,
	    i;

	temp = Array.cast(value);
	result = [];

	if (this.isObject) {
		for (i = 0; i < temp.length; i++) {

			target = {};

			for (key in temp[i]) {
				target[key] = this.cast(temp[i][key]);
			}

			result.push(target);
		}
	} else {
		for (i = 0; i < temp.length; i++) {
			result.push(this.cast(temp[i]));
		}
	}

	if (!this.isArray) {
		return result[0];
	}

	return result;
});