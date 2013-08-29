module.exports = function alchemyPaginationHelper(hawkejs) {
	
	// References
	var helpers = hawkejs.helpers;
	var Paginate = helpers.Paginate = {};
	
	/**
	 * Show the page links
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 */
	Paginate.show = function() {

		var variables = this.scope.variables,
		    info      = variables._PageInfo;

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
		
		this.scope.buf.push(html);
	};
}