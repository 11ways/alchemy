/**
 * The ObjectIdFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var ObjectIdFieldType = FieldType.extend(function ObjectIdFieldType(schema, name, options) {
	FieldType.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
ObjectIdFieldType.setProperty('datatype', 'objectid');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {ObjectId}
 */
ObjectIdFieldType.setMethod(function cast(value) {
	return alchemy.castObjectId(value);
});

/**
 * Cast a condition for a query
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}   value
 *
 * @return   {ObjectId}
 */
ObjectIdFieldType.setMethod(function castCondition(value) {
	return alchemy.castObjectId(value);
});