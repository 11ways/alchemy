module.exports = function HawkejsPagination(Hawkejs, Blast) {

	var Pagination = Hawkejs.Helper.extend(function PaginationHelper(view) {
		Hawkejs.Helper.call(this, view);
	});

	/**
	 * Return pagination config
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 */
	Pagination.setMethod(function getConfig(name) {

		var result,
		    info = this.view.internal('PageInfo'),
		    key;

		if (info == null) {
			return false;
		}

		// Get the first name if no valid name is given
		if (name == null) {
			for (key in info) {
				name = key;
				break;
			}
		}

		result = Object.assign({}, info[name]);
		result.url = Blast.Collection.URL.parse(this.view.internal('url').href);
		result.page = Number(result.page);

		return result;
	});

	/**
	 * Return the current page number
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 */
	Pagination.setMethod(function getPageNumber(name) {

		var config = this.getConfig(name);

		if (config) {
			return Number(config.page) || 1;
		}
	});

	/**
	 * Return the available pages
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}   name
	 */
	Pagination.setMethod(function getPages(name) {

		var config = this.getConfig(name);

		if (config) {
			return Number(config.pages) || 1;
		}
	});

	/**
	 * Print an arrow link (Up or down)
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 *
	 * @param    {Object}   options
	 */
	Pagination.setMethod(function arrowLink(options) {

		var info;

		if (typeof options !== 'object') options = {};
		else options = Object.assign({}, options);

		// Get the current page number
		if (options.current == null) options.current = this.getPageNumber(options.name);

		if (!options.pages) {
			options.pages = this.getPages();
		}

		options.page = options.current + options.direction;

		return this.page(options);
	});

	/**
	 * Print a link to the next page
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 *
	 * @param    {Object}   options
	 */
	Pagination.setMethod(function next(options) {

		if (options == null) options = {};

		// Set an arrow as the content
		if (!options.content) options.content = '&raquo';

		// Set the direction
		options.direction = 1;

		return this.arrowLink(options);
	});

	/**
	 * Print a link to a certain page
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 *
	 * @param    {Object}   options
	 */
	Pagination.setMethod(function page(options) {

		var url = Blast.Classes.URL.parse(this.view.internal('url').href),
		    search,
		    query,
		    key;

		search = url.search;

		if (search) {
			query = Blast.Classes.URL.parseQuery(search.slice(1));
		} else {
			query = {};
		}

		// If no options are given, just return
		if (!options) return;

		// Clone the options object
		options = Object.assign({}, options);

		if (!options.query) options.query = query;
		if (options.page !== 0 && !options.page) options.page = 1;
		if (options.url) url = Blast.Classes.URL.parse(options.url);

		// The current page we're on. Defaults to page 1.
		var current = options.current || parseInt(query.page) || 1,
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
		}

		query.page = options.page;
		options.name = options.page;

		for (key in query) {
			url.addQuery(key, query[key]);
		}

		// If the link is impossible (page does not exist), create a simple span
		if (impossible) {
			html += '<span ';

			if (options.disabled) {
				html += 'class="' + options.disabled + '" ';
			}

			html += '>' + (options.content||options.page) + '</span>';
			this.view.print(html);
		} else {
			this.view.add_link(url, options);
		}

	});

	/**
	 * Print out the numbers
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 *
	 * @param    {String}   name   The model we're paginating. Optional.
	 */
	Pagination.setMethod(function show(name, options) {

		var config,
		    active,
		    amount,
		    items,
		    begin,
		    pages,
		    side,
		    url,
		    neg;

		if (Object.isObject(name)) {
			options = name;
			name = null;
		} else if (options == null) {
			options = {};
		}

		config = this.getConfig(name);
		active = 'pagination-active';
		url = config.url;
		amount = 5;
		side = ~~(amount/2);
		pages = [];

		begin = config.page - side;

		if (begin <= 0) {
			neg = 1 - begin;
			begin = 1;
		} else {
			neg = 0;
		}

		pages.push({page: 1, arrow: true, title: 'First', content: '&laquo;', active: active});

		if (config.page > 1) {
			pages.push({page: config.page - 1, arrow: true, title: 'Previous', content: '&laquo;', active: active});
		}

		for (var i = begin; i <= config.page+side+neg; i++) {

			if (i <= config.pages) {
				pages.push({page: i, active: active});
			}
		}

		if (i <= config.pages) {
			pages.push({page: i, arrow: true, title: 'Next', content: '&raquo;', active: active});
		}

		pages.push({page: config.pages, arrow: true, title: 'Last', content: '&raquo;', active: active});

		this.view.print_element('paginate/navlist', {pages: pages, options: options, wrap: false});
	});

	/**
	 * Create an anchor that will sort the pagination on the given field.
	 * The first argument can also be an object, which supports more features.
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 *
	 * @param    {String}   paginationName   The model we're paginating.
	 * @param    {String}   fieldName        The field we're sorting.
	 * @param    {String}   content          The text to show in the anchor.
	 */
	Pagination.setMethod(function sort(paginationName, fieldName, content) {

		var config,
		    url = Blast.Classes.URL.parse(this.view.internal('url').href),
		    cssClass,
		    options,
		    active,
		    order,
		    attr,
		    key;

		attr = {};
		cssClass = 'chimera-pagination-sort';

		if (paginationName && typeof paginationName === 'object') {
			options = paginationName;
			paginationName = options.name;
			fieldName = options.field;
			content = options.content;
		} else {
			options = {};
		}

		// Get the current pagination config
		config = this.getConfig(paginationName)

		// Is this field the active sort?
		if (url.param('sort') === fieldName) {
			active = true;
			cssClass += ' chimera-pagination-active';
		}

		// Overwrite the sort parameter
		url.param('sort', fieldName);
		order = url.param('order');

		// Set the direction of the order
		if (active) {
			if (!order || order.toLowerCase() !== 'asc') order = 'asc';
			else order = 'desc';

			attr['data-sort-active'] = true;
			cssClass += ' chimera-pagination-' + order;
		} else {
			order = 'asc';
		}

		url.param('order', order);

		// Add the sort direction as an attribute
		attr['data-sort-order'] = order;

		this.view.add_link(url, {class: cssClass, attributes: attr, content: content});
	});

};

return;
bla: {
	// References
	var helpers = hawkejs.helpers;
	var Paginate = helpers.Paginate = {};

	/**
	 * Retrieve the first available pagination name
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
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
	 * @author   Jelle De Loecker   <jelle@develry.be>
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
			disabledParentClass: 'disabled hidden',
			disabled: 'disabled hidden',
			wrapAll: ['<ul class="pagination">', '</ul>']
		});
	};
	
	
	function print(paginationName) {

		var variables = this.scope.variables,
		    query     = hawkejs.clone(variables.hawkejs.query),
		    url       = variables.hawkejs.cleanUrl,
		    current   = parseInt(query.page) || 1,
		    options   = {},
		    ammount,
		    attribs,
		    begin,
		    side,
		    info,
		    neg;

		ammount = options.ammount || 5;
		side = ~~(ammount/2);

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

		info.page = Number(info.page);

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

		if (options.arrows) {
			pageOptions.content = '&laquo';
			pageOptions.page = 1;
			html += Paginate.page.call(this, pageOptions);

			html += Paginate.previous.call(this, pageOptions);
		}

		// Remove the content for the page nr iteration
		delete pageOptions.content;

		begin = info.page - side;

		if (begin <= 0) {
			neg = 1 - begin;
			begin = 1;
		} else {
			neg = 0;
		}

		for (var i = begin; i <= info.page+side+neg; i++) {
			pageOptions.page = i;
			html += Paginate.page.call(this, pageOptions);
		}

		if (options.arrows) {
			html += Paginate.next.call(this, pageOptions);

			pageOptions.page = info.pages;
			html += Paginate.page.call(this, pageOptions);
		}

		if (options.wrapAll) {
			html = options.wrapAll[0] + html + options.wrapAll[1];
		}

		this.scope.buf.push(html);
	}


	/**
	 * Print a link to the previous page
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
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
	 * Print a link to a specific page
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
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
	 * @author   Jelle De Loecker   <jelle@develry.be>
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


	/**
	 * Create a filter input
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}   options
	 */
	Paginate.filter = function filter(options) {

		if (!options) {
			options = {};
		}

		var fieldName = options.field,
		    display = options.display,
		    html,
		    value = '';

		if (this._filterPrev && this._filterPrev[fieldName]) {
			value = this._filterPrev[fieldName].value;
		}

		html = '<input data-pagination-filter="' + fieldName + '" type="text" class="form-control" value="' + value + '">';

		this.echo(html);

	};

}