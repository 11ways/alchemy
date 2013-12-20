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
			arrows: true,
			disabledParentClass: 'disabled',
			disabled: 'disabled',
			wrapAll: ['<ul class="pagination">', '</ul>']
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
		
		// Set the default options for the page function
		var pageOptions = {
			query: query,
			page: 1,
			pages: info.pages,
			active: options.active,
			disabled: options.disabled,
			disabledParentClass: options.disabledParentClass,
			parentClass: options.parentClass,
			url: url,
			wrap: options.wrap,
			current: current,
			return: 'string'
		};

		if (options.arrows) html += Paginate.previous.call(this, pageOptions);

		// Remove the content for the page nr iteration
		delete pageOptions.content;

		for (var i = 1; i <= info.pages; i++) {
			pageOptions.page = i;
			html += Paginate.page.call(this, pageOptions);
		}

		if (options.arrows) html += Paginate.next.call(this, pageOptions);

		if (options.wrapAll) {
			html = options.wrapAll[0] + html + options.wrapAll[1];
		}

		this.scope.buf.push(html);
	};

	/**
	 * Print an arrow link (Up or down)
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}   options
	 */
	var arrowLink = function arrowLink(options) {

		var info;

		if (typeof options !== 'object') options = {};
		else options = hawkejs.clone(options);

		// Get the query object
		if (typeof options.query !== 'object') options.query = hawkejs.clone(this.scope.variables.hawkejs.query);

		// Get the current page number
		if (typeof options.current === 'undefined') options.current = parseInt(options.query.page) || 1;

		if (!options.pages) {
			if (options.name) {
				info = this.scope.variables._PageInfo[options.name.modelName()];
			} else {
				// No pagination name was given, so use the first one
				info = getPaginationName(this.scope.variables);
			}

			options.pages = info.pages;
		}

		options.page = options.current + options.direction;

		return Paginate.page.call(this, options);
	};

	/**
	 * Print a link to the previous page
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}   options
	 */
	Paginate.previous = function previous(options) {

		if (typeof options !== 'object') options = {};

		// Set an arrow as the content
		if (!options.content) options.content = '&laquo';

		// Set the direction
		options.direction = -1;

		return arrowLink.call(this, options);
	};

	/**
	 * Print a link to the previous page
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}   options
	 */
	Paginate.next = function next(options) {

		if (typeof options !== 'object') options = {};

		// Set an arrow as the content
		if (!options.content) options.content = '&raquo';

		// Set the direction
		options.direction = 1;

		return arrowLink.call(this, options);
	};

	/**
	 * Print a link to a specific page
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}   paginationName   The model we're paginating. Optional.
	 */
	Paginate.page = function page(options) {

		// If no options are given, just return
		if (!options) return;

		// Clone the options object
		options = hawkejs.clone(options);

		var variables = this.scope.variables;

		if (!options.query) options.query = hawkejs.clone(this.scope.variables.hawkejs.query);
		if (options.page !== 0 && !options.page) options.page = 1;
		if (!options.url) options.url = variables.hawkejs.cleanUrl;

		// The current page we're on. Defaults to page 1.
		var current = options.current || parseInt(options.query.page) || 1,
		    html = '',
		    impossible = false;

		if (options.page < 1 || options.page > options.pages) {
			impossible = true;
		}

		if (!options.attributes) options.attributes = {};
		if (!options.attributes.class) options.attributes.class = '';

		if (current === options.page) {

			options.attributes['data-page-active'] = true;

			if (options.active) {
				options.attributes['class'] += ' ' + options.active;
			}

			if (options.parentClass) {
				options.attributes['data-add-parent-class'] = options.parentClass;
			}
		}

		// Add the first part of the wrapper
		if (options.wrap) html += options.wrap[0];

		options.query.page = options.page;

		// If the link is impossible (page does not exist), create a simple span
		if (impossible) {
			html += '<span ';

			if (options.disabled) {
				html += 'class="' + options.disabled + '" ';
			}

			if (options.disabledParentClass) {
				html += 'data-add-parent-class="disabled" ';
			}

			html += '>' + (options.content||options.page) + '</span>';

		} else {
			html += helpers.add_link.call(this, options.url + '?' + hawkejs.param(options.query),
				{name: options.page, content: options.content, attributes: options.attributes, return: 'string'})
		}

		// Add the last part of the wrapper
		if (options.wrap) html += options.wrap[1];

		if (options.return === 'string') return html;

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