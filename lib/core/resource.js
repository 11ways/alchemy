/**
 * Create the global Resource object
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
global.Resource = {};

/**
 * All the resources will be stored in here
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
Resource._all = {};


/**
 * Register an alchemy Api resource
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
Resource.register = function registerResource(name, fnc) {

	if (typeof Resource._all[name] !== 'undefined') {
		log.warn('Alchemy Api resource ' + name + ' already exists, overwriting!');
	}

	Resource._all[name] = fnc;
};

/**
 * Get a resource
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
Resource.get = function getResource(name, data, callback) {

	if (typeof Resource._all[name] === 'undefined') {
		callback();
	} else {
		Resource._all[name](data, callback);
	}
};