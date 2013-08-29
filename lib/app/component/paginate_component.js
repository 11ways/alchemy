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

	// The current render object
	this.render = false;

	this.startup = function startup (next, render) {
		this.Paginate.render = render;
		next();
	};

	/**
	 * Perform a query
	 * @this   {PaginateComponent}
	 */
	this.find = function find(model, options, callback) {

		var that = this;

		// If we've been given a string instead of a model,
		// retrieve that model
		if (typeof model === 'string') model = Model.get(model);

		// Make sure callback is set correctly
		if (typeof options === 'function') callback = options;

		// Make sure options is an object
		if (typeof options !== 'object') options = {};

		// If no page has been given
		if (typeof options.page !== 'number') options.page = this.render.req.query.page;
		if (options.page < 0 || !options.page) options.page = 1;
		if (!options.pageSize) options.pageSize = 10;

		options.limit = options.pageSize;
		options.offset = (options.page-1)*options.pageSize;

		model.find('all', options, function findAllPaginate(err, result) {

			var pageInfo = {
				page: options.page,
				size: options.pageSize,
				items: result.available,
				pages: Math.ceil(result.available/options.pageSize)
			};

			that.render.viewVars._PageInfo = pageInfo;

			callback(err, result);
		});

	};

	this.beforeRender = function beforeRender (next, render) {
		this.render = false;
		next();
	};
	
});