/**
 * The BooleanFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 */
var BooleanFieldType = FieldType.extend(function BooleanFieldType(name, options) {
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
 * @return   {Boolean}
 */
BooleanFieldType.setMethod(function cast(value) {
	return Boolean(value);
});

alchemy.classes.BooleanFieldType = BooleanFieldType;