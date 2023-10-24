/**
 * The LocalDateTime Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 */
const LocalDateTime = Function.inherits('Alchemy.Field.LocalTemporal', 'LocalDateTime');

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 */
LocalDateTime.setDatatype('datetime');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {Mixed}   value
 *
 * @return   {Develry.LocalDateTime}
 */
LocalDateTime.setMethod(function cast(value) {

	if (value == null || value === '') {
		return null;
	}

	return Classes.Develry.LocalDateTime.create(value);
});
