/**
 * The DateTimeFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
var DatetimeFieldType = FieldType.extend(function DatetimeFieldType(schema, name, options) {
	FieldType.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
DatetimeFieldType.setProperty('datatype', 'datetime');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.1
 *
 * @param    {Mixed}   value
 *
 * @return   {Date}
 */
DatetimeFieldType.setMethod(function cast(value) {

	// Don't cast falsy values,
	// that'll result in a date around 1970
	if (!value) {
		return null;
	}

	return new Date(value);
});