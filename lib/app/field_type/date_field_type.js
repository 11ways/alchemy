/**
 * The DateFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 */
var DateFieldType = FieldType.extend(function DateFieldType(name, options) {
	FieldType.call(this, name, options);
});

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Date}
 */
DateFieldType.setMethod(function cast(value) {
	return new Date(value);
});

alchemy.classes.DateFieldType = DateFieldType;