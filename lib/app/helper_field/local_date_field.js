/**
 * The LocalDate Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 */
const LocalDate = Function.inherits('Alchemy.Field.LocalTemporal', 'LocalDate');

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 */
LocalDate.setDatatype('date');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {*}   value
 *
 * @return   {Develry.LocalDate}
 */
LocalDate.setCastFunction(function cast(value) {

	if (value == null || value === '') {
		return null;
	}

	return Classes.Develry.LocalDate.create(value);
});
