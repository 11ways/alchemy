/**
 * The DateTimeFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var DatetimeFieldType = FieldType.extend(function DatetimeFieldType(schema, name, options) {
	FieldType.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
DatetimeFieldType.setProperty('datatype', 'datetime');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Date}
 */
DatetimeFieldType.setMethod(function cast(value) {
	return new Date(value);
});

alchemy.classes.DatetimeFieldType = DatetimeFieldType;