/**
 * The Paginate Component class
 *
 * @constructor
 * @extends       Alchemy.Component
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.0.1
 * @version       1.0.0
 */
var Paginate = Function.inherits('Alchemy.Client.Component', function Paginate(controller, options) {
	Paginate.super.call(this, controller, options);
});

/**
 * Perform a query
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.4
 *
 * @param   {Model}     model
 * @param   {Object}    options
 * @param   {Function}  callback
 *
 * @return  {Pledge}
 */
Paginate.setMethod(function find(model, options, callback) {

	var that = this,
	    conduit = this.controller.conduit,
	    conditions,
	    filter,
	    pledge,
	    order,
	    name,
	    sort;

	// Get the model if a name has been given
	if (typeof model === 'string') model = this.getModel(model);

	// Make sure callback is set correctly
	if (typeof options === 'function') callback = options;

	// Make sure options is an object
	if (typeof options !== 'object') options = {};

	// Set the name for this pagination
	if (typeof options.name === 'undefined') options.name = model.name;
	else options.name = options.name.modelName()

	// If no page has been given
	if (typeof options.page !== 'number') options.page = conduit.param('page');
	if (options.page < 0 || !options.page) options.page = 1;
	if (!options.pageSize) options.pageSize = 10;

	sort = conduit.param('sort');

	if (sort) {
		// Always override the sort
		options.sort = {};

		order = conduit.param('order');

		if (typeof order === 'string' && order.toLowerCase() === 'desc') {
			options.sort[sort] = -1;
		} else {
			options.sort[sort] = 1;
		}
	}

	options.limit = options.pageSize;
	options.offset = (options.page-1)*options.pageSize;

	if (conduit.param('filter_field') && conduit.param('filter_value')) {
		conditions = {};
		conditions[conduit.param('filter_field')] = RegExp.interpret('/.*' + conduit.param('filter_value') + '.*/i');
		options.conditions = conditions;
	}

	filter = conduit.param('filter');

	if (filter) {
		if (!conditions) {
			conditions = {};
		}

		options.conditions = conditions;

		for (name in filter) {
			conditions[name] = RegExp.interpret('/.*' + filter[name] + '.*/i');;
		}
	}

	pledge = model.find('all', options, function findAllPaginate(err, result) {

		var PageInfo;

		if (err) {
			return;
		}

		PageInfo = conduit.internal('PageInfo');

		if (PageInfo == null) {
			PageInfo = {};
			conduit.internal('PageInfo', PageInfo);
		}

		PageInfo[options.name] = {
			page: options.page,
			size: options.pageSize,
			items: result.available,
			pages: Math.ceil(result.available/options.pageSize)
		};
	});

	pledge.handleCallback(callback);

	return pledge;
});