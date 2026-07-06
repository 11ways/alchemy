/**
 * The HasAndBelongsToMany Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
const HABTM = Function.inherits('Alchemy.Field.ForeignKey', 'HasAndBelongsToMany');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Mixed}   value
 *
 * @return   {ObjectId}
 */
HABTM.setCastFunction(function cast(value, to_datasource) {

	var result,
	    temp,
	    ds = this.datasource,
	    i;

	value = Array.cast(value);
	result = [];

	for (i = 0; i < value.length; i++) {

		if (to_datasource && ds) {
			if (ds.supports('objectid')) {
				temp = alchemy.castObjectId(value[i]);
			} else {
				temp = String(value[i]);
			}
		} else {
			temp = alchemy.castObjectId(value[i]);
		}

		if (temp) {
			result.push(temp);
		}
	}

	return result;
});
/**
 * Cast a CONDITION value: a query on a HABTM field matches ELEMENTS of the
 * stored array, so a scalar has to stay scalar (mongo's containment
 * semantics). Running conditions through the save-path cast wrapped every
 * value in an array, compiling equals()/in() to exact-array matches that
 * never hit a multi-element field.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.7
 * @version  1.4.7
 *
 * @param    {Mixed}   value
 * @param    {Array}   field_paths
 *
 * @return   {Mixed}
 */
HABTM.setMethod(function _castCondition(value, field_paths) {

	if (value == null || RegExp.isRegExp(value)) {
		return value;
	}

	// An explicit array stays an exact-array match
	if (Array.isArray(value)) {
		return this.cast(value, true);
	}

	let ds = this.datasource;

	if (ds && !ds.supports('objectid')) {
		return String(value);
	}

	return alchemy.castObjectId(value) || value;
});
