/**
 * The Html Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.6
 * @version  1.1.0
 */
const Html = Function.inherits('Alchemy.Field.Text', 'Html');

/**
 * Augment the JSON Schema with HTML content type hint
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   schema   The schema object to augment
 */
Html.setMethod(function augmentJsonSchema(schema) {
	schema.contentMediaType = 'text/html';
});