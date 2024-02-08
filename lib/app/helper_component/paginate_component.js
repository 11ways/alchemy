/**
 * The Paginate Component class
 *
 * @constructor
 * @extends       Alchemy.Component
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.0.0
 */
const Paginate = Function.inherits('Alchemy.Client.Component', 'Paginate');

/**
 * Perform a query
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.4.0
 *
 * @param    {Model}     model
 * @param    {Criteria}  criteria
 *
 * @return   {Pledge}
 */
Paginate.setMethod(function find(model, criteria) {

	const conduit = this.controller.conduit;

	// Get the model if a name has been given
	if (typeof model == 'string') {
		model = this.getModel(model);
	}

	criteria = Classes.Alchemy.Criteria.Model.cast(criteria, model);

	let page_size = criteria.options.page_size || 10,
	    skipless = criteria.options.skipless,
		last_id,
	    name = criteria.options.name,
		page = criteria.options.page;

	if (!name) {
		name = model.name;
		criteria.setOption('name', name);
	}

	if (skipless) {
		let sort;
		last_id = criteria.options.last_id || conduit.param('page');

		// When it's a skipless pagination,
		// a sort is always implied
		if (skipless === true) {
			sort = {_id: 1};
		} else {
			sort = {};
			sort[skipless] = 1;
		}

		criteria.sort(sort);
	} else {

		// If no page has been given
		if (typeof page != 'number') {
			page = conduit.param('page');
		}

		if (page < 0 || !page) {
			page = 1;
		}

		let sort = conduit.param('sort');

		if (sort) {
			// Always override the sort
			let new_sort = {};

			order = conduit.param('order');

			if (typeof order == 'string' && order.toLowerCase() == 'desc') {
				new_sort[sort] = -1;
			} else {
				new_sort[sort] = 1;
			}

			criteria.sort(new_sort);
		}

		if (page) {
			criteria.page(page, page_size);
		}
	}

	if (last_id) {
		if (skipless === true) {
			criteria.where('_id').gt(last_id);
		} else {
			criteria.where(skipless).gt(last_id);
		}
	}

	criteria.setOption('available', true);

	let pledge = model.find('all', criteria, function findAllPaginate(err, result) {

		if (err) {
			return;
		}

		let PageInfo = conduit.internal('PageInfo');

		if (PageInfo == null) {
			PageInfo = {};
			conduit.internal('PageInfo', PageInfo);
		}

		let entry = {
			page     : page,
			size     : page_size,
			items    : result.available,
			pages    : Math.ceil(result.available/page_size),
			skipless : skipless
		};

		if (skipless && result.length) {
			entry.last_id = result.last()._id;
		}

		PageInfo[name] = entry;
	});

	return pledge;
});