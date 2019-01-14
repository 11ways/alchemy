/**
 * The GeopointType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 */
var GeopointFieldType = FieldType.extend(function GeopointFieldType(schema, name, options) {
	FieldType.call(this, schema, name, options);

	// Add the 2dsphere index
	this.schema.addIndex(this, {name: name + '_geopoint', order: '2dsphere'});
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
GeopointFieldType.setDatatype('object');

/**
 * This field value is self-contained
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
GeopointFieldType.setSelfContained(true);

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Date}
 */
GeopointFieldType.setMethod(function cast(value) {

	var coordinates,
	    result;

	if (value == null) {
		return value;
	}

	if (Array.isArray(value)) {
		coordinates = value;
	} else if (Array.isArray(value.coordinates)) {
		coordinates = value.coordinates;
	}

	// Should be like {type: 'Point', coordinates: [51,3]}
	return {
		type: 'Point',
		coordinates: coordinates
	};
});