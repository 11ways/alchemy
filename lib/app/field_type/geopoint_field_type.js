/**
 * The GeopointType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var GeopointFieldType = FieldType.extend(function GeopointFieldType(schema, name, options) {
	FieldType.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
GeopointFieldType.setProperty('datatype', 'object');

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
GeopointFieldType.setMethod(function cast(value) {
	// Should be like {type: 'Point', coordinates: [51,3]}
	return value;
});