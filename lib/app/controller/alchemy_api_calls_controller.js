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

	/**
	 * The init constructor
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @return   {undefined}
	 */
	this.init = function init() {
		this.useModel = false;
		this.parent();
	};

	/**
	 * Alchemy Api calls are routed through this action
	 *
	 * @author   Jelle De Loecker       <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.api = function api(render) {

		if (Resource._all[render.req.params.resource]) {

			var data = render.req.query;
			
			Resource.get(render.req.params.resource, data, function(result) {
				render.res.writeHead(200, {'Content-Type': 'application/json'});
				render.res.end(JSON.stringify(result));
			});
		} else {
			render.res.send(404, 'Api command ' + render.req.params.resource + ' does not exist!');
		}

	};

});