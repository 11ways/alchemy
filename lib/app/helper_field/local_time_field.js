/**
 * The LocalTime Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 */
const LocalTime = Function.inherits('Alchemy.Field.LocalTemporal', 'LocalTime');

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 */
LocalTime.setDatatype('time');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {Mixed}   value
 *
 * @return   {Develry.LocalTime}
 */
LocalTime.setMethod(function cast(value) {

	if (value == null || value === '') {
		return null;
	}

	return Classes.Develry.LocalTime.create(value);
});
