/**
 * The pagination helper
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {ViewRender}    view
 */
var Pagination = Function.inherits('Alchemy.Helper', function Pagination(view) {
	Pagination.super.call(this, view);
});

/**
 * Return pagination config
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.4
 *
 * @param    {String}   name
 *
 * @return   {Object}
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
	result.url = RURL.parse(this.view.internal('url'));
	result.page = Number(result.page);

	result.sorting = !!result.url.query.sort;
	result.filtering = !!result.url.query.filter;

	return result;
});

/**
 * Default options for getInfo
 * @type   {Object}
 */
Pagination.setProperty('default_get_info', {
	showing: 'Showing',
	record_separator: '-',
	of_separator: 'of',
	empty: 'No items to show'
});

/**
 * Is there a next page?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.1
 * @version  0.4.1
 */
Pagination.setMethod(function hasNext(name) {

	var pages = this.getPages(name),
	    page = this.getPageNumber(name);

	if (page < pages) {
		return true;
	}

	return false;
});

/**
 * Return info
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 * @param    {Object}   options
 */
Pagination.setMethod(function getInfo(name, options) {

	var record_start,
	    record_end,
	    page_count,
	    page_size,
	    config,
	    page,
	    html;

	if (typeof name == 'object') {
		options = name;
		name = null;
	}

	// Get the options for showing the info
	options = Object.assign({}, this.default_get_info, options);

	// Get the config
	config = this.getConfig(name);

	if (!config) {
		return;
	}

	html = '<span class="al-p-info">';

	if (config.items == 0) {
		html += '<span class="al-p-empty">' + options.empty + '</span>';
	} else {
		page_count = Number(config.pages) || 1;
		page_size = Number(config.size) || 20,
		page = Number(config.page) || 1;

		record_start = ((page - 1) * page_size) + 1;
		record_end = ((page - 1) * page_size) + page_size;

		html += '<span class="al-p-showing">' + options.showing + '</span> ';
		html += '<span class="al-p-from">' + record_start + '</span>';
		html += '<span class="al-p-rec-sep">' + options.record_separator + '</span>';
		html += '<span class="al-p-to">' + record_end + '</span> ';
		html += '<span class="al-p-of">' + options.of_separator + '</span> ';
		html += '<span class="al-p-total">' + config.items + '</span>';
		html += '</span>';
	}

	html += '</span>';

	return html;
});

/**
 * Return the current page number
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
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
 * @since    0.2.0
 * @version  0.2.0
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
 * Return the total available items
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {String}   name
 */
Pagination.setMethod(function getTotalItems(name) {

	var config = this.getConfig(name);

	if (config) {
		return Number(config.items) || 0;
	}
});

/**
 * Return the first-of-page number
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {String}   name
 */
Pagination.setMethod(function getFirstOfPage(name) {

	var config = this.getConfig(name),
	    first,
	    size,
	    page;

	if (config) {
		page = Number(config.page);
		size = Number(config.size);

		first = 1 + ((page - 1) * size);
		return first || 0;
	}
});

/**
 * Return the last-of-page number
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {String}   name
 */
Pagination.setMethod(function getLastOfPage(name) {

	var config = this.getConfig(name),
	    total,
	    last,
	    size,
	    page;

	if (config) {
		total = Number(config.items);
		page = Number(config.page);
		size = Number(config.size);

		last = page * size;

		if (last > total) {
			last = total;
		}

		return last || 0;
	}
});

/**
 * Print an arrow link (Up or down)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
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
 * @version  0.2.0
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
 * Print a link to the previous page
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
 *
 * @param    {Object}   options
 */
Pagination.setMethod(function previous(options) {

	if (options == null) options = {};

	// Set an arrow as the content
	if (!options.content) options.content = '&laquo';

	// Set the direction
	options.direction = -1;

	return this.arrowLink(options);
});

/**
 * Default options for page
 * @type   {Object}
 */
Pagination.setProperty('default_page', {
	skip_empty: false,
	active: 'al-p-active',
	inactive_arrow: 'al-p-inactive-arrow',
	inactive: 'al-p-inactive'
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

	var config,
	    query,
	    href,
	    key,
	    url;

	// Use path instead of href
	// (href includes protocol and domain and we don't want that)
	href = this.view.internal('url').path;
	url = RURL.parse(href);

	query = url.query;

	config = this.getConfig();

	// If no options are given, just return
	if (!options && (!config || !config.skipless)) {
		return;
	}

	// Clone the options object
	options = Object.assign({}, this.default_page, options);

	if (!options.query) options.query = query;
	if (options.url) url = RURL.parse(options.url);

	let impossible = false,
	    current,
	    html = '';

	if (!options.attributes) options.attributes = {};
	if (!options.attributes.class) options.attributes.class = '';

	if (config.skipless) {
		options.name = 'Next page';
		url.addQuery('page', String(config.last_id));
	} else {
		if (options.page !== 0 && !options.page) {
			options.page = 1;
		}

		current = options.current || parseInt(query.page) || 1

		if (options.page < 1 || options.page > options.pages) {
			impossible = true;
		}

		// See if we're on the current page
		if (current === options.page) {

			options.attributes['data-page-active'] = true;

			// Arrow links for the same page should be disabled
			if (options.arrow) {
				impossible = true;
			} else if (options.active) {
				options.attributes['class'] += ' ' + options.active;
			}
		}

		query.page = options.page;
		options.name = options.page;
	}

	// Always add this class
	options.attributes.class += ' al-p-link';

	for (key in query) {
		url.addQuery(key, query[key]);
	}

	// Remove some hawkejs parameters
	url.addQuery('hajax', null);
	url.addQuery('htop', null);
	url.addQuery('h_diversion', null);

	if (options.return_url) {
		if (!impossible) {
			return String(url);
		} else {
			return '';
		}
	}

	// If the link is impossible (page does not exist), create a simple span
	if (impossible) {

		if (options.skip_empty) {
			return;
		}

		html += '<span ';

		if (options.arrow) {
			html += 'class="al-p-link ' + options.inactive_arrow + '" ';
		} else if (options.inactive) {
			html += 'class="al-p-link ' + options.inactive + '" ';
		}

		html += '>' + (options.content||options.page) + '</span>';
		return html;
	} else {
		return this.view.add_link(url, options);
	}
});

/**
 * Print out the numbers
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
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
	    neg,
	    i;

	if (Object.isObject(name)) {
		options = name;
		name = null;
	} else if (options == null) {
		options = {};
	}

	config = this.getConfig(name);
	active = 'al-p-active';
	url = config.url;

	if (config.skipless) {
		options.skipless = true;
	} else {
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

		pages.push({
			page    : 1,
			arrow   : true,
			title   : 'First',
			content : '&laquo;',
			active  : active
		});

		if (config.page > 1) {
			pages.push({
				page    : config.page - 1,
				arrow   : true,
				title   : 'Previous',
				content : '&laquo;',
				active  : active
			});
		}

		for (i = begin; i <= config.page+side+neg; i++) {

			// Always show at least 1 page
			if (i <= config.pages || i === 1) {
				pages.push({page: i, active: active});
			}
		}

		if (i <= config.pages) {
			pages.push({page: i, arrow: true, title: 'Next', content: '&raquo;', active: active});
		}

		pages.push({page: config.pages, arrow: true, title: 'Last', content: '&raquo;', active: active});
	}

	this.view.print_partial('paginate/navlist', {
		pages   : pages,
		options : options,
		wrap    : false
	});
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
	    url = RURL.parse(this.view.internal('url')),
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

	if (content == null && typeof fieldName == 'string') {
		content = fieldName.titleize();
	}

	return this.view.add_link(url, {class: cssClass, attributes: attr, content: content});
});

/**
 * Create an input to filter this row.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.4
 *
 * @param    {String}   paginationName   The model we're paginating.
 * @param    {String}   fieldName        The field we're sorting.
 * @param    {String}   content          The text to show in the input.
 */
Pagination.setMethod(function filter(paginationName, fieldName, content) {

	var config,
	    cssClass,
	    options,
	    element,
	    filter,
	    url = RURL.parse(this.view.internal('url'));

	cssClass = 'chimera-pagination-filter';

	if (paginationName && typeof paginationName === 'object') {
		options = paginationName;
		paginationName = options.name;
		fieldName = options.field;
		content = options.content;
	} else {
		options = {};
	}

	element = this.view.createElement('input', {
		attributes : options.attributes,
		className  : options.className
	});

	if (url.param('filter_field') == fieldName) {
		element.setAttribute('value', url.param('filter_value'));
	} else {
		filter = url.param('filter');

		if (filter && filter[fieldName] != null) {
			element.setAttribute('value', filter[fieldName]);
		}
	}

	element.setAttribute('data-field', fieldName);
	element.setAttribute('onkeypress', 'return hawkejs.scene.helpers.Pagination.onkeypress(this, event);');

	return element;
});

/**
 * Create an apply button
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  0.5.0
 *
 * @param    {String}   paginationName   The model we're paginating.
 */
Pagination.setMethod(function applyButton(paginationName) {

	var options,
	    content,
	    html;

	if (paginationName && typeof paginationName === 'object') {
		options = paginationName;
		paginationName = options.name;
		content = options.content;
	} else {
		options = {};
	}

	html = '<button class="al-pagination-apply" ';
	html += 'onclick="return hawkejs.scene.helpers.Pagination._apply(this);">'
	html += content || 'Apply';
	html += '</button>';

	return html;
});

/**
 * Apply the filter
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  1.0.4
 */
Pagination.setMethod(function _apply(element, change_focus, callback) {

	var elements = document.querySelectorAll('[onkeypress*="Pagination.on"]'),
	    element,
	    name,
	    data,
	    val,
	    url,
	    i;

	// Focus changes by default
	if (change_focus == null) {
		change_focus = true;
	}

	// Parse the current url
	url = RURL.parse(window.location);

	// Prepare data object
	data = {};

	for (i = 0; i < elements.length; i++) {
		element = elements[i];
		name = element.getAttribute('data-field');

		if (!name) {
			continue;
		}

		val = element.value || null;

		if (val != null) {
			data[name] = val;
		}
	}

	url.param('filter', data);

	hawkejs.scene.openUrl(url, {move_browser_focus: change_focus}, callback);
});

/**
 * Create an input to filter this row.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.4
 */
Pagination.setMethod(function onkeypress(element, event) {

	var that = this,
	    old_value = element.value,
	    url;

	if (this.keypress_timeout_id) {
		clearTimeout(this.keypress_timeout_id);
		this.keypress_timeout_id = null;
	}

	if (event.keyCode != 13 && event.charCode != 13) {
		return setTimeout(function onNextTick() {

			var timeout;

			// Do nothing if nothing changed (like tabs or arrows)
			if (old_value == element.value) {
				return;
			}

			if (element.value.length < 3) {
				timeout = 500;
			} else {
				timeout = 200;
			}

			that.keypress_timeout_id = setTimeout(function applyAfterTimeout() {
				that._apply(element, false, function done() {

					var new_element = document.body.querySelector('[data-field="' + element.dataset.field + '"]');

					if (new_element) {
						new_element.value = element.value;
						new_element.focus();
						new_element.selectionStart = new_element.selectionEnd = element.value.length + 1;
					}
				});
			}, timeout);
		}, 4);
	}

	return this._apply(element);
});