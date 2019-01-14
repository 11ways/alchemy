/**
 * The EnumFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
var EnumFieldType = FieldType.extend(function EnumFieldType(schema, name, options) {
	EnumFieldType.super.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
EnumFieldType.setDatatype('string');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Mixed}   value
 *
 * @return   {ObjectId}
 */
EnumFieldType.setMethod(function cast(value) {
	return String(value);
});

/**
 * Get the enum values of this field
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @return   {Object}
 */
EnumFieldType.setMethod(function getValues() {

	// Look for the values under the given name,
	// or its pluralized name, if nothing was found
	if (this.options && this.options.values) {
		return this.options.values;
	} else if (this.schema.enumValues[this.name]) {
		return this.schema.enumValues[this.name];
	} else {
		return this.schema.enumValues[this.name.pluralize()];
	}
});