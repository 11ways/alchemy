module.exports = function alchemyPaginationHelper(hawkejs) {
	
	// References
	var helpers = hawkejs.helpers;
	var Paginate = helpers.Paginate = {};

	/**
	 * Retrieve the first available pagination name
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}   variables   The available variables
	 */
	var getPaginationName = function getPaginationName(variables) {
		var info;

		for (var entry in variables._PageInfo) {
			info = variables._PageInfo[entry];
			break;
		}

		return info;
	};
	
	/**
	 * Show the page links
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}   paginationName   The model we're paginating. Optional.
	 */
	Paginate.show = function show(paginationName) {

		var variables = this.scope.variables,
		    query     = hawkejs.clone(variables.hawkejs.query),
		    url       = variables.hawkejs.cleanUrl,
		    info;

		if (paginationName) {
			info = variables._PageInfo[paginationName.modelName()];
		} else {
			// No pagination name was given, so use the first one
			info = getPaginationName(variables);
		}

		// If no pagination info is found, do nothing
		if (!info) return;

		var html = '';

		for (var i = 1; i <= info.pages; i++) {

			// Overwrite the page parameter
			query.page = i;

			html += helpers.add_link.call(this, url + '?' + hawkejs.param(query), {name: i, return: 'string'})
		}

		this.scope.buf.push(html);
	};

	/**
	 * Create a link to order the pagination
	 */
	Paginate.sort = function sort(paginationName, fieldName, display) {

		// Do nothing if no arguments have been given
		if (!arguments.length) return;

		var variables  = this.scope.variables,
		    query      = hawkejs.clone(variables.hawkejs.query),
		    url        = variables.hawkejs.cleanUrl,
		    attr       = {},
		    active,
		    info,
		    html;

		if (typeof fieldName === 'undefined') {
			fieldName = paginationName;
			paginationName = false;
		}

		if (typeof display === 'undefined') {
			display = fieldName;
		}

		if (paginationName) {
			info = variables._PageInfo[paginationName.modelName()];
		} else {
			// No pagination name was given, so use the first one
			info = getPaginationName(variables);
		}

		// Is this field the active sort?
		active = (query.sort === fieldName);

		// Overwrite the sort parameter
		query.sort = fieldName;

		// Set the direction of the order
		if (active) {
			if (!query.order || query.order.toLowerCase() !== 'asc') query.order = 'asc';
			else query.order = 'desc';
		} else {
			query.order = 'asc';
		}

		// Add the sort direction as an attribute
		attr['data-sort-order'] = query.order;

		html = helpers.add_link.call(this, url + '?' + hawkejs.param(query), {
		    attributes: attr,
		    name: display,
		    return: 'string'
		});

		this.scope.buf.push(html);
	}

}