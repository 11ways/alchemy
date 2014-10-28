/**
 * The EnumFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var EnumFieldType = FieldType.extend(function EnumFieldType(schema, name, options) {
	EnumFieldType.super.call(this, schema, name, options);
});


/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
EnumFieldType.setProperty('datatype', 'string');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {ObjectId}
 */
EnumFieldType.setMethod(function cast(value) {
	return String(value);
});