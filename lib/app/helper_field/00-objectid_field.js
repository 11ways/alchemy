/**
 * The ObjectIdFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
const ObjectId = Function.inherits('Alchemy.Field', 'ObjectId');

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
ObjectId.setDatatype('objectid');

/**
 * ObjectIDs are self-contained objects
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
ObjectId.setSelfContained(true);

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {*}   value
 *
 * @return   {ObjectId}
 */
ObjectId.setCastFunction(function cast(value, to_datasource) {

	let result,
	    ds;

	if (to_datasource && (ds = this.datasource)) {
		if (ds.supports('objectid')) {
			result = alchemy.castObjectId(value);
		} else {
			result = String(value);
		}
	} else {
		result = alchemy.castObjectId(value);
	}

	return result;
});

/**
 * Augment the JSON Schema with objectid format hint
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   schema   The schema object to augment
 */
ObjectId.setMethod(function augmentJsonSchema(schema) {
	// Use a custom format to indicate this is an ObjectId
	// (not a standard JSON Schema format, but useful for documentation)
	schema.format = 'objectid';
	schema.pattern = '^[0-9a-fA-F]{24}$';
});