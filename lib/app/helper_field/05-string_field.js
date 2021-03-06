/**
 * The String Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
var StringField = Function.inherits('Alchemy.Field', function String(schema, name, options) {
	String.super.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
StringField.setDatatype('string');

/**
 * Cast the given value to this field's type for search in a db
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.7
 * @version  1.1.7
 *
 * @param    {Mixed}   value
 * @param    {Array}   field_paths   The path to the field
 *
 * @return   {Mixed}
 */
StringField.setMethod(function _castCondition(value, field_paths) {

	if (typeof value == 'object' && RegExp.isRegExp(value)) {
		return value;
	}

	return this.cast(value, true);
});

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Mixed}   value
 *
 * @return   {String}
 */
StringField.setMethod(function cast(value) {

	if (value == null) {
		return value;
	}

	if (typeof value == 'object') {
		value = alchemy.pickTranslation(null, value).result;
	}

	if (typeof value != 'string') {
		value = String(value);
	}

	if (this.options.trim) {
		value = value.trim();
	}

	return value;
});