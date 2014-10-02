/**
 * The NumberFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.2.0
 * @version  0.2.0
 */
var NumberFieldType = FieldType.extend(function NumberFieldType(name, options) {
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
 * @return   {Number}
 */
NumberFieldType.setMethod(function cast(value) {
	return Number(value);
});

alchemy.classes.NumberFieldType = NumberFieldType;