/**
 * The Auth Component class
 *
 * @constructor
 * @extends       alchemy.classes.Component
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
Component.extend(function PaginateComponent (){
	
	// Expose us to the controller
	this.expose = true;

	/**
	 * Perform a query
	 * @this   {PaginateComponent}
	 */
	this.find = function find(model, options, callback) {

		var that = this,
		    // Get the render object from the calling function
		    render = getRenderObject();

		// Throw an exception if no render object is found
		if (!render) {
			throw 'No render object has been found!';
		}

		// If we've been given a string instead of a model,
		// retrieve that model
		if (typeof model === 'string') model = Model.get(model);

		// Make sure callback is set correctly
		if (typeof options === 'function') callback = options;

		// Make sure options is an object
		if (typeof options !== 'object') options = {};

		// Set the name for this pagination
		if (typeof options.name === 'undefined') options.name = model.modelName;
		else options.name = options.name.modelName()

		// If no page has been given
		if (typeof options.page !== 'number') options.page = render.req.query.page;
		if (options.page < 0 || !options.page) options.page = 1;
		if (!options.pageSize) options.pageSize = 10;

		if (render.req.query.sort) {
			if (!options.order) options.order = {};
			options.order[render.req.query.sort] = 1;
		}

		options.limit = options.pageSize;
		options.offset = (options.page-1)*options.pageSize;

		model.find('all', options, function findAllPaginate(err, result) {

			var pageInfo = {
				page: options.page,
				size: options.pageSize,
				items: result.available,
				pages: Math.ceil(result.available/options.pageSize)
			};

			if (typeof render.viewVars._PageInfo !== 'object') {
				render.viewVars._PageInfo = {};
			}

			render.viewVars._PageInfo[options.name] = pageInfo;

			callback(err, result);
		});

	};
	
});

/**
 * Get the render object from calling functions
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
function getRenderObject () {

	return alchemy.getArgument({
		// Needs the req property
		has: 'req',
		// Has a property name that equals to this
		equal: {name: 'renderCallback'},
		// Start with this function
		start: getRenderObject.caller.caller
	});

}