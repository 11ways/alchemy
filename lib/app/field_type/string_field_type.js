/**
 * The StringFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var StringFieldType = FieldType.extend(function StringFieldType(name, options) {
	FieldType.call(this, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
StringFieldType.setProperty('datatype', 'string');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {String}
 */
StringFieldType.setMethod(function cast(value) {
	return String(value);
});

alchemy.classes.StringFieldType = StringFieldType;