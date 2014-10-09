/**
 * The TimeFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var TimeFieldType = FieldType.extend(function TimeFieldType(schema, name, options) {
	FieldType.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
TimeFieldType.setProperty('datatype', 'time');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Date}
 */
TimeFieldType.setMethod(function cast(value) {
	return (new Date(value)).stripDate();
});

alchemy.classes.TimeFieldType = TimeFieldType;