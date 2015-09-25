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