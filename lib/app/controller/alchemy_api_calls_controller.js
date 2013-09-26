var resources = {};

/**
 * Alchemy Api Calls controller
 *
 * @constructor
 * @extends       alchemy.classes.Controller
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
Controller.extend(function AlchemyApiCallsController(){

	this.useModel = false;

	/**
	 * Alchemy Api calls are routed through this action
	 *
	 * @author   Jelle De Loecker       <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.api = function api(render) {

		if (apiActions[render.req.params.resource]) {
			apiActions[render.req.params.resource].call(this, render);
		} else {
			render.res.send(404, 'Api command ' + render.req.params.resource + ' does not exist!');
		}

	};

});

/**
 * Register an alchemy Api command
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
alchemy.registerResource = function registerResource(name, fnc) {

	if (typeof resources[name] !== 'undefined') {
		log.warn('Alchemy Api command ' + name + ' already exists, overwriting!');
	}

	resources[name] = fnc;
};

/**
 * Do a resource
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
alchemy.doResource = function doResource(name, callback) {

	if (typeof resources[name] === 'undefined') {
		callback();
	} else {
		resources[name](callback);
	}
};