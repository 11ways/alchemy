/**
 * The ObjectFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
var ObjectFieldType = FieldType.extend(function ObjectFieldType(schema, name, options) {
	ObjectFieldType.super.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
ObjectFieldType.setProperty('datatype', 'object');