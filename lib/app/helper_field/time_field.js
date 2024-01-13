/**
 * The Time Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
var Time = Function.inherits('Alchemy.Field', function Time(schema, name, options) {
	Time.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
Time.setDatatype('time');

/**
 * Dates are self-contained objects
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Time.setSelfContained(true);

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.4.1
 *
 * @param    {Mixed}   value
 *
 * @return   {Date}
 */
Time.setMethod(function cast(value) {

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