/**
 * The Geopoint Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
var Geopoint = Function.inherits('Alchemy.Field', function Geopoint(schema, name, options) {
	Geopoint.super.call(this, schema, name, options);

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
Geopoint.setDatatype('object');

/**
 * This field value is self-contained
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Geopoint.setSelfContained(true);

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
Geopoint.setMethod(function cast(value) {

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