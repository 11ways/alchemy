/**
 * Class that evaluates a path
 * (Used for creating default field value instructions)
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   path
 */
const PathEvaluator = Function.inherits(null, 'Alchemy', function PathEvaluator(path) {

	if (typeof path == 'string') {
		path = path.split('.');
	}

	this.path = path;
});

/**
 * Undry the value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
PathEvaluator.setStatic(function unDry(value) {
	return new PathEvaluator(value.path);
});

/**
 * Create a dry object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
PathEvaluator.setMethod(function toDry() {
	return {
		value: {
			path : this.path
		}
	};
});

/**
 * Get the actual value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
PathEvaluator.setMethod(function getValue() {

	var context = Blast.Globals,
	    result = Object.path(context, this.path);

	if (typeof result == 'function') {
		result = result();
	}

	return result;
});