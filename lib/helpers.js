/**
 * Add a simple route with a callback
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.03.18
 * @version  2013.03.18
 *
 * @param   {string}   path       The url
 * @param   {object}   callback   The callback function
 * @param   {string}   method     What method to use, default = get
 */
alchemy.addRoute = function addRoute (path, callback, method) {
	
	if (method === undefined) method = 'get';
	
	alchemy._app[method](path, callback);
	
}

/**
 * Add a route the MVC way
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.03.18
 * @version  2013.03.18
 *
 * @param   {string}   path       The url
 * @param   {object}   callback   The callback function
 * @param   {string}   method     What method to use, default = get
 */
alchemy.connect = function connect (path, callback, method) {
	
	if (method === undefined) method = 'get';
	
	alchemy._app[method](path, function(req, res) {
		
		
		
	});
}