/**
 * Alchemy Api Calls controller
 *
 * @constructor
 * @extends       alchemy.classes.Controller
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       1.0.0
 */
var Api = Function.inherits('AppController', function AlchemyApiCallsController(conduit, options) {
	AlchemyApiCallsController.super.call(this, conduit, options);
});

/**
 * Alchemy Api calls are routed through this action
 *
 * @author   Jelle De Loecker       <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
 */
Api.setMethod(function api(conduit, name) {

	var data;

	if (Resource._all[name]) {

		data = conduit.url.query;

		Resource.get(name, data, function gotResourceResult(err, result) {

			if (err != null) {
				return conduit.error(err);
			}

			conduit.end(result);
		});
	} else {
		conduit.notFound(new Error('Api command ' + render.req.params.resource + ' does not exist'));
	}
});