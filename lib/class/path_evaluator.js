/**
 * Class that evaluates a path
 * (Used for creating default field value instructions)
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.3.20
 *
 * @param    {string}   path
 */
const PathEvaluator = Function.inherits(null, 'Alchemy', function PathEvaluator(path) {

	if (!(this instanceof PathEvaluator)) {
		return new PathEvaluator(path);
	}

	if (typeof path == 'string') {
		path = path.split('.');
	}

	this.path = path;
});

/**
 * Undry the value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
PathEvaluator.setStatic(function unDry(value) {
	return new PathEvaluator(value.path);
});

/**
 * Create a dry object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.3.20
 */
PathEvaluator.setMethod(function getValue(context) {

	if (arguments.length == 0) {
		context = Blast.Globals;
	}

	let result = Object.path(context, this.path);

	if (typeof result == 'function') {
		result = result();
	}

	return result;
});