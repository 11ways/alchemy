/**
 * The Enum Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.2.1
 */
var Enum = Function.inherits('Alchemy.Field', function Enum(schema, name, options) {

	if (options.values) {
		options.values = new Classes.Alchemy.Map.Enum(options.values);
	}

	Enum.super.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
Enum.setDatatype('string');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {*}   value
 *
 * @return   {ObjectId}
 */
Enum.setCastFunction(function cast(value) {

	if (value == null) {
		return '';
	}

	return String(value);
});

/**
 * Get the enum values of this field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.0
 *
 * @return   {EnumValues}
 */
Enum.setMethod(function getValues() {

	// Look for the values under the given name,
	// or its pluralized name, if nothing was found
	if (this.options && this.options.values) {
		return this.options.values;
	} else if (this.schema.enum_values[this.name]) {
		return this.schema.enum_values[this.name];
	} else {
		return this.schema.enum_values[this.name.pluralize()];
	}
});

/**
 * Get the client-side options
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.2.1
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Object}
 */
Enum.setMethod(function getClientConfigOptions(wm) {

	let options = JSON.clone(this.options, 'toHawkejs', wm);

	return options;
});

/**
 * Get the configuration entry for the given value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {Object}
 */
Enum.setMethod(function getValueConfiguration(value) {
	return this.getValues()?.get?.(value);
});

/**
 * Augment the JSON Schema with enum values
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   schema   The schema object to augment
 */
Enum.setMethod(function augmentJsonSchema(schema) {

	let values = this.getValues();

	if (values) {
		// EnumMap has a keys() method that returns all the enum keys
		if (typeof values.keys === 'function') {
			schema.enum = Array.from(values.keys());
		} else if (values.object && typeof values.object === 'object') {
			// Fallback: EnumMap may have an `object` property
			schema.enum = Object.keys(values.object);
		} else if (typeof values === 'object') {
			// Fallback: plain object
			schema.enum = Object.keys(values);
		}
	}
});