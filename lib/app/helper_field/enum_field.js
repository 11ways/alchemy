/**
 * The Enum Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
Enum.setDatatype('string');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Mixed}   value
 *
 * @return   {ObjectId}
 */
Enum.setMethod(function cast(value) {
	return String(value);
});

/**
 * Get the enum values of this field
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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
 * @author   Jelle De Loecker   <jelle@develry.be>
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