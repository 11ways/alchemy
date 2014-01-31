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
		// Expose us to the controller
		this.expose = true;
	};
	
	/**
	 * Perform a query
	 * @this   {PaginateComponent}
	 */
	this.find = function find(model, options, callback) {

		var that = this,
		    // Get the render object from the augmented context
		    render = this.render;

		if (!render) {
			render = model.render;
		}

		// Throw an exception if the render object still isn't found
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
			if (!options.sort) options.sort = {};

			if (typeof render.req.query.order === 'string' && render.req.query.order.toLowerCase() === 'desc') {
				options.sort[render.req.query.sort] = -1;
			} else {
				options.sort[render.req.query.sort] = 1;
			}
		}

		options.limit = options.pageSize;
		options.offset = (options.page-1)*options.pageSize;

		this.processFilter(model, options, function afterFilterSettings() {

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

		});

	};

	/**
	 * Process GET query filter settings
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.processFilter = function processFilter(model, options, callback) {

		var filterParam,
		    filterField,
		    render = this.render || model.render,
		    field,
		    entry,
		    query;

		render.viewVars._filterSettings = model.blueprint;

		if (!options.conditions) {
			options.conditions = {};
		}

		query = options.conditions;

		// Get filter conditions
		if (render.req.query.filter) {

			filterParam = JSON.parse(render.req.query.filter);
			render.viewVars._filterPrev = filterParam;

			for (filterField in filterParam) {
				field = model.blueprint[filterField];

				if (!field) continue;

				entry = filterParam[filterField];

				switch (field.type.toLowerCase()) {

					case 'objectid':
						break;

					case 'string':
						query[filterField] = new RegExp(entry.value, 'i');
						break;

					default:
						query[filterField] = entry.value;
				}

			}
		}

		callback();
	};
	
});
