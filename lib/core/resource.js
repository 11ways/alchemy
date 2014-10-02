return;
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
 * Resources should run in a special context.
 * This is the basis for that context.
 *
 * @type   {Object}
 */
var resourceContext = {};

/**
 * The getModel function for inside a resource
 *
 * @author        Jelle De Loecker   <jelle@codedor.be>
 * @since         0.0.1
 * @version       0.0.1
 */
resourceContext.getModel = function getModel(name, autoCreate) {
	return BaseClass.prototype.getModel.call(this, name, autoCreate);
};

/**
 * Get a resource
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
Resource.get = function getResource(name, data, render, callback) {

	if (typeof callback === 'undefined') {
		callback = render;
		render = null;
	}

	var augment = alchemy.augment(resourceContext, {render: render});

	if (typeof Resource._all[name] === 'undefined') {
		callback();
	} else {
		// Call the resource with an empty context
		Resource._all[name].call(augment, data, callback);
	}
};

/**
 * Get an augmented resource
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
BaseClass.prototype.getResource = function getModel(name, data, callback) {
	return Resource.get(name, data, this.render, callback);
};