/**
 * Alchemy Api Calls controller
 *
 * @constructor
 * @extends       Alchemy.Controller
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       0.3.0
 */
var Api = Function.inherits('Alchemy.AppController', function AlchemyApiCallsController(conduit, options) {
	AlchemyApiCallsController.super.call(this, conduit, options);
});

/**
 * Alchemy Api calls are routed through this action
 *
 * @author   Jelle De Loecker       <jelle@develry.be>
 * @since    0.0.1
 * @version  0.3.0
 */
Api.setMethod(function api(conduit, name) {

	var data;

	if (Resource._all[name]) {

		// Get all available parameters (URL, query & body combined)
		data = conduit.param();

		Resource.get(name, data, function gotResourceResult(err, result) {

			if (err != null) {
				return conduit.error(err);
			}

			conduit.end(result);
		});
	} else {
		conduit.notFound(new Error('API command ' + conduit.param('resource') + ' does not exist'));
	}
});