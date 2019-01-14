/**
 * The ObjectIdFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
var ObjectIdFieldType = FieldType.extend(function ObjectIdFieldType(schema, name, options) {
	FieldType.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
ObjectIdFieldType.setDatatype('objectid');

/**
 * ObjectIDs are self-contained objects
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
ObjectIdFieldType.setSelfContained(true);

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
ObjectIdFieldType.setMethod(function cast(value, to_datasource) {

	var result,
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