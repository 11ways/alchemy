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