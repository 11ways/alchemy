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
 * @version  1.0.6
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
	    last_id,
	    filter,
	    pledge,
	    order,
	    name,
	    sort;

	// Get the model if a name has been given
	if (typeof model == 'string') {
		model = this.getModel(model);
	}

	// Make sure callback is set correctly
	if (typeof options == 'function') {
		callback = options;
	}

	// Make sure options is an object
	if (!options || typeof options != 'object') {
		options = {};
	}

	// Set the name for this pagination
	if (!options.name) {
		options.name = model.name;
	} else {
		options.name = options.name.modelName();
	}

	if (!options.pageSize) {
		options.pageSize = 10;
	}

	if (options.skipless) {
		last_id = options.last_id || conduit.param('page');

		// When it's a skipless pagination,
		// a sort is always implied
		if (options.skipless === true) {
			sort = {_id: 1};
		} else {
			sort = {};
			sort[options.skipless] = 1;
		}

		options.sort = sort;

	} else {

		// If no page has been given
		if (typeof options.page != 'number') {
			options.page = conduit.param('page');
		}

		if (options.page < 0 || !options.page) {
			options.page = 1;
		}

		options.offset = (options.page-1) * options.pageSize;

		sort = conduit.param('sort');

		if (sort) {
			// Always override the sort
			options.sort = {};

			order = conduit.param('order');

			if (typeof order == 'string' && order.toLowerCase() == 'desc') {
				options.sort[sort] = -1;
			} else {
				options.sort[sort] = 1;
			}
		}
	}

	options.limit = options.pageSize;

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
			if (filter[name] !== '') {
				conditions[name] = RegExp.interpret('/.*' + filter[name] + '.*/i');
			}
		}
	}

	if (last_id) {
		if (!options.conditions) {
			options.conditions = {};
		}

		if (!options.conditions.$and) {
			options.conditions.$and = [];
		}

		let entry = {};

		if (options.skipless === true) {
			entry._id = {$gt: alchemy.castObjectId(last_id)};
		} else {
			entry[options.skipless] = {$gt: last_id};
		}

		options.conditions.$and.push(entry);
	}

	pledge = model.find('all', options, function findAllPaginate(err, result) {

		if (err) {
			return;
		}

		let PageInfo = conduit.internal('PageInfo');

		if (PageInfo == null) {
			PageInfo = {};
			conduit.internal('PageInfo', PageInfo);
		}

		let entry = {
			page     : options.page,
			size     : options.pageSize,
			items    : result.available,
			pages    : Math.ceil(result.available/options.pageSize),
			skipless : options.skipless
		};

		if (options.skipless && result.length) {
			entry.last_id = result.last()._id;
		}

		PageInfo[options.name] = entry;
	});

	pledge.handleCallback(callback);

	return pledge;
});