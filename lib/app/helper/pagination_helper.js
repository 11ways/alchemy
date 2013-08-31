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
	 * Show the page links using the default bootstrap layout.
	 * Overwrite this helper for customisation.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}   paginationName   The model we're paginating. Optional.
	 */
	Paginate.show = function show(paginationName) {
		Paginate.print.call(this, {
			name: paginationName,
			active: 'active',
			parentClass: 'active',
			wrap: 'li',
			wrapAll: ['<div class="pagination"><ul>', '</ul></div>']
		});
	};
	
	/**
	 * Print out the numbers
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}   paginationName   The model we're paginating. Optional.
	 */
	Paginate.print = function print(paginationName) {

		var variables = this.scope.variables,
		    query     = hawkejs.clone(variables.hawkejs.query),
		    url       = variables.hawkejs.cleanUrl,
		    current   = parseInt(query.page) || 1,
		    options   = {},
		    attribs,
		    info;

		if (typeof paginationName === 'object') {
			options = paginationName;
			paginationName = options.name;
		}

		// If wrapAll is just a string, it's only the tag name
		if (typeof options.wrapAll === 'string') {
			options.wrapAll = ['<'+options.wrapAll+'>', '</'+options.wrapAll+'>'];
		} else if (options.wrapAll && options.wrapAll.length !== 2) {
			// Only allow a wrapAll array with  2 entries
			options.wrapAll = false;
		}

		// If wrap is just a string, it's only the tag name
		if (typeof options.wrap === 'string') {
			options.wrap = ['<'+options.wrap+'>', '</'+options.wrap+'>'];
		} else if (options.wrap && options.wrap.length !== 2) {
			// Only allow a wrapAll array with 2 entries
			options.wrap = false;
		}

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

			attribs = false;

			if (current === i) {
				attribs = {'data-page-active': true};

				if (options.active) {
					attribs['class'] = options.active;
				}

				if (options.parentClass) {
					attribs['data-add-parent-class'] = options.parentClass;
				}
			}

			// Add the first part of the wrapper
			if (options.wrap) html += options.wrap[0];

			html += helpers.add_link.call(this, url + '?' + hawkejs.param(query),
				{name: i, attributes: attribs, return: 'string'})

			// Add the last part of the wrapper
			if (options.wrap) html += options.wrap[1];
		}

		if (options.wrapAll) {
			html = options.wrapAll[0] + html + options.wrapAll[1];
		}

		this.scope.buf.push(html);
	};

	/**
	 * Create an anchor that will sort the pagination on the given field.
	 * The first argument can also be an object, which supports more features.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}   paginationName   The model we're paginating.
	 * @param    {String}   fieldName        The field we're sorting.
	 * @param    {String}   display          The text to show in the anchor.
	 */
	Paginate.sort = function sort(paginationName, fieldName, display) {

		// Do nothing if no arguments have been given
		if (!arguments.length) return;

		var variables  = this.scope.variables,
		    query      = hawkejs.clone(variables.hawkejs.query),
		    url        = variables.hawkejs.cleanUrl,
		    attr       = {},
		    options    = {},
		    active,
		    info,
		    html;

		if (typeof paginationName === 'object') {
			options = paginationName;
			paginationName = options.name;
			fieldName = options.field;
			display = options.display;
		}

		if (!options && typeof fieldName === 'undefined') {
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

			attr['data-sort-active'] = true;

			if (options.parentClass) {
				attr['data-add-parent-class'] = options.parentClass;
			}
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