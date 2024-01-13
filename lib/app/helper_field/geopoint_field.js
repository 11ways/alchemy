/**
 * The Geopoint Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
var Geopoint = Function.inherits('Alchemy.Field', function Geopoint(schema, name, options) {

	Geopoint.super.call(this, schema, name, options);

	let index_options = {
		name  : name + '_geopoint',
		order : '2dsphere'
	};

	if (this.is_array) {
		index_options.db_property = 'point';
	}

	// Add the 2dsphere index
	this.schema.addIndex(this, index_options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
Geopoint.setDatatype('object');

/**
 * This field value is self-contained
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Geopoint.setSelfContained(true);

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Date}
 */
Geopoint.setMethod(function cast(value, to_datasource) {

	var coordinates,
	    result;

	if (!value) {
		return null;
	}

	// Normalize array-value format fields
	if (value.point) {
		value = value.point;
	}

	if (Array.isArray(value)) {
		coordinates = value;
	} else if (Array.isArray(value.coordinates)) {
		coordinates = value.coordinates;
	}

	// Should be like {type: 'Point', coordinates: [51,3]}
	result = {
		type: 'Point',
		coordinates: coordinates
	};

	// Arrayable fields need to be wrapped, otherwise it thinks it's a legacy coordinate
	if (to_datasource && this.is_array) {
		result = {
			point: result
		};
	}

	return result;
});