/**
 * The Integer Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
const IntegerField = Function.inherits('Alchemy.Field.Number', 'Integer');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {*}   value
 *
 * @return   {number}
 */
IntegerField.setCastFunction(function cast(value) {

	if (value == null) {
		return 0;
	}

	return Math.round(value);
});

/**
 * Get the JSON Schema type for this field.
 * Integer fields should use "integer" type per JSON Schema spec.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {string}
 */
IntegerField.setMethod(function getJsonSchemaType() {
	return 'integer';
});