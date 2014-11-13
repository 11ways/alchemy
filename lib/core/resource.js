/**
 * Create the global Resource object
 *
 * @author  Jelle De Loecker   <jelle@kipdola.be>
 * @since   0.0.1
 * @version 0.0.1
 */
global.Resource = {};

/**
 * All the resources will be stored in here
 *
 * @author  Jelle De Loecker   <jelle@kipdola.be>
 * @since   0.0.1
 * @version 0.0.1
 */
Resource._all = {};

/**
 * Register an alchemy Api resource
 *
 * @author  Jelle De Loecker   <jelle@kipdola.be>
 * @since   0.0.1
 * @version 0.0.1
 */
Resource.register = function registerResource(name, fnc) {

	if (typeof Resource._all[name] !== 'undefined') {
		log.warn('Alchemy Api resource ' + name + ' already exists, overwriting!');
	}

	Resource._all[name] = fnc;
};

/**
 * Resources should run in a special context.
 * This is the basis for that context.
 *
 * @type   {Object}
 */
var resourceContext = {};

/**
 * The getModel function for inside a resource
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
 */
resourceContext.getModel = function getModel(name) {
	return Model.get(name);
};

/**
 * Get a resource
 *
 * @author  Jelle De Loecker   <jelle@kipdola.be>
 * @since   0.0.1
 * @version 1.0.0
 *
 * @param   {String}   name
 * @param   {Object}   data
 * @param   {Function} callback
 */
Resource.get = function getResource(name, data, callback) {

	if (callback == null) {
		callback = data;
		data = {};
	}

	var augment = Object.assign({}, resourceContext);

	if (typeof Resource._all[name] === 'undefined') {
		callback(new Error('Could not find resource "' + name + '"'));
	} else {
		// Call the resource with an empty context
		Resource._all[name].call(augment, data, callback);
	}
};