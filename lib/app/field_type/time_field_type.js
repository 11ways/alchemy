/**
 * The TimeFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
var TimeFieldType = FieldType.extend(function TimeFieldType(schema, name, options) {
	FieldType.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
TimeFieldType.setProperty('datatype', 'time');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.1
 *
 * @param    {Mixed}   value
 *
 * @return   {Date}
 */
TimeFieldType.setMethod(function cast(value) {

	var result;

	// We only need the time, but we use the entire date for timezone config
	if (typeof value == 'string' && value.length < 9) {
		result = Date.create(0);
		result.setTimestring(value);
	} else {
		result = Date.create(value);
	}

	return result;
});