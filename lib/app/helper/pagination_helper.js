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

		// Get the url we're currently on
		var currentUrl = variables.hawkejs.originalUrl;

		// Get the url without the query parameters
		// @todo: only the page param needs to be removed!
		var bareUrl = currentUrl.split('?')[0];

		for (var i = 1; i <= info.pages; i++) {
			html += helpers.add_link.call(this, bareUrl + '?page='+i, {name: i, return: 'string'})
		}

		console.log(this);
		
		this.scope.buf.push(html);
	};

	/**
	 * Create a link to order the pagination
	 */
	Paginate.sort = function sort(paginationName, fieldName, display) {

		// Do nothing if no arguments have been given
		if (!arguments.length) return;

		var variables = this.scope.variables,
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

		// Get the url we're currently on
		var currentUrl = variables.hawkejs.originalUrl;

		// Get the url without the query parameters
		// @todo: only the page param needs to be removed!
		var bareUrl = currentUrl.split('?')[0];

		html = helpers.add_link.call(this, bareUrl + '?page=1&sort='+fieldName, {name: display, return: 'string'});

		this.scope.buf.push(html);
	}

}