/**
 * The FieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
global.FieldType = Function.inherits(function FieldType(schema, name, options) {

	// The name of the field (in the schema)
	this.name = name;
	this.options = options || {};
	this.schema = schema;

	// The name of the field type
	// @todo: move to the prototype
	this.typename = this.constructor.name.beforeLast('FieldType');

	this.hasDefault = Object.hasProperty(this.options, 'default');
	this.isTranslatable = !!this.options.translatable;
	this.isObject = this.isTranslatable;
	this.isArray = !!this.options.array;
});

/**
 * Convert to JSON
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Object}
 */
FieldType.setMethod(function toDry() {

	var result,
	    key;

	if (this._jsonified != null) {
		return this._jsonified;
	}

	result = {};

	for (key in this) {
		result[key] = this[key];
	}

	result.title = this.title;

	return {value: result};
});

/**
 * Prepare the title property
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Mixed}
 */
FieldType.prepareProperty(function title() {

	if (this.options.title) {
		return this.options.title;
	}

	return this.name.humanize();
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

	result = [];

	// Make sure the value is an array
	if (Array.isArray(value)) {
		// If this field is not an arrayable field, wrap it again
		if (!this.isArray) {
			temp = [value];
		}
	} else {
		temp = [value];
	}

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