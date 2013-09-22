var apiActions = {};

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

		if (apiActions[render.req.params.command]) {
			apiActions[render.req.params.command].call(this, render);
		} else {
			render.res.send(404, 'Api command ' + render.req.params.command + ' does not exist!');
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
alchemy.registerApi = function registerApi(name, fnc) {

	if (typeof apiActions !== 'undefined') {
		log.warn('Alchemy Api command ' + name + ' already exists, overwriting!');
	}

	apiActions[name] = fnc;
};