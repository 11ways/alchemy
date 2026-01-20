/**
 * The Url Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
const UrlField = Function.inherits('Alchemy.Field', 'Url');

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
UrlField.setDatatype('string');

/**
 * Augment the JSON Schema with uri format
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   schema   The schema object to augment
 */
UrlField.setMethod(function augmentJsonSchema(schema) {
	schema.format = 'uri';
});
