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
 * @param    {*}   value
 *
 * @return   {Date}
 */
Geopoint.setCastFunction(function cast(value, to_datasource) {

	if (!value) {
		return null;
	}

	// Normalize array-value format fields
	if (value.point) {
		value = value.point;
	}

	let coordinates;

	if (Array.isArray(value)) {
		coordinates = value;
	} else if (Array.isArray(value.coordinates)) {
		coordinates = value.coordinates;
	}

	// Should be like {type: 'Point', coordinates: [51,3]}
	let result = {
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

/**
 * Convert this geopoint field to a JSON Schema representation.
 * Outputs a GeoJSON Point schema.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   options                  Optional configuration
 * @param    {string}   options.option_prefix    Prefix to look for in field options (e.g., 'mcp_')
 *
 * @return   {Object}   A JSON Schema object describing this field
 */
Geopoint.setMethod(function toJsonSchema(options) {

	let option_prefix = options?.option_prefix;

	// GeoJSON Point schema
	let schema = {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				enum: ['Point'],
			},
			coordinates: {
				type: 'array',
				items: {
					type: 'number',
				},
				minItems: 2,
				maxItems: 2,
				description: 'Coordinates as [longitude, latitude]',
			},
		},
		required: ['type', 'coordinates'],
	};

	// Use prefixed versions if available
	let title = this.getPrefixedOption('title', option_prefix);
	let description = this.getPrefixedOption('description', option_prefix);

	if (title) {
		schema.title = title;
	}

	if (description) {
		schema.description = description;
	}

	// Handle arrays
	if (this.is_array) {
		schema = {
			type: 'array',
			items: schema,
		};
	}

	return schema;
});