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
	this.options = options || {};

	this.hasDefault = Object.hasProperty(this.options, 'default');
	this.isTranslatable = !!this.options.translatable;
	this.isObject = this.isTranslatable;
	this.isArray = !!this.options.array;
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
 * Prepare the value to be saved in the database
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Mixed}
 */
FieldType.setMethod(function toDatasource(value) {

	if (value == null) {
		return value;
	}

	return this._toDatasource(value);
});

/**
 * The actual toDatasource method inherited fieldtype's can modify.
 * These won't get passed a null or undefined value.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Mixed}
 */
FieldType.setMethod(function _toDatasource(value) {
	return value;
});

/**
 * Prepare the value to be returned to node
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Mixed}
 */
FieldType.setMethod(function toApp(value) {

	if (value == null) {
		return value;
	}

	return this._toApp(value);
});

/**
 * The actual toApp method inherited fieldtype's can modify.
 * These won't get passed a null or undefined value.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Mixed}
 */
FieldType.setMethod(function _toApp(value) {
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

			if (!Object.isObject(temp[i])) {
				throw new Error('Object expected for value of field "' + this.name + '"');
			}

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