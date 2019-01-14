/**
 * The StringFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
var StringFieldType = FieldType.extend(function StringFieldType(schema, name, options) {
	FieldType.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
StringFieldType.setDatatype('string');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.5.0
 *
 * @param    {Mixed}   value
 *
 * @return   {String}
 */
StringFieldType.setMethod(function cast(value) {

	if (value == null) {
		return value;
	}

	if (typeof value == 'object') {
		value = alchemy.pickTranslation(null, value).result;
	}

	if (typeof value == 'string') {
		return value;
	}

	return String(value);
});