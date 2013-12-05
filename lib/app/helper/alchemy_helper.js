module.exports = function alchemyFormHelpers (hawkejs) {
	
	// References
	var helpers = hawkejs.helpers,
	    drones  = hawkejs.drones,
	    asset   = helpers.asset = {};

	/**
	 * Expose specific variables to the client's browser
	 *
	 * @author        Jelle De Loecker   <jelle@kipdola.be>
	 * @since         0.0.1
	 * @version       0.0.1
	 */
	drones.doExposure = function doExposure(next, $result) {

		var name, expose = this.scope.variables.__expose;

		for (name in expose) {
			hawkejs._extendClientVar(name, expose[name], $result, null);
		}

		next();
	};

	/**
	 * Perform a resource request 
	 *
	 * @author        Jelle De Loecker   <jelle@kipdola.be>
	 * @since         0.0.1
	 * @version       0.0.1
	 */
	hawkejs.getResource = function getResource(name, data, callback) {

		if (typeof data !== 'object') data = {};

		var finished = false,
		    req      = data.req,
		    waiter   = function waiter(result) {
		    	finished = true;
		    	callback(result);
		    };

		delete data.req;

		// Make an ajax request on the client side
		if (this.ClientSide) {
			$.get('/hawkejs/api/' + name, data, waiter);
		} else {
			Resource.get(name, data, req.renderCallback, waiter);
		}

		return finished;
	};

	/**
	 * The asset style helper
	 *
	 * @author        Jelle De Loecker   <jelle@codedor.be>
	 * @since         0.0.1
	 * @version       0.0.1
	 */
	asset.style = function style(path, options) {

		// Make sure the path is an array
		if (!Array.isArray(path)) {
			path = [path];
		}

		// Normalize all the entries
		for (i = 0; i < path.length; i++) {

			// Append the path prefix
			path[i] = '/public/stylesheets/' + path[i];

			if (path[i].indexOf('.css') < 0) {
				path[i] = path[i] + '.css';
			}
		}

		// Execute the hawkejs helper
		return this.style(path, options);
	};

	/**
	 * The asset script helper
	 *
	 * @author        Jelle De Loecker   <jelle@codedor.be>
	 * @since         0.0.1
	 * @version       0.0.1
	 */
	asset.script = function script(path, options) {

		var i;

		// Make sure the path is an array
		if (!Array.isArray(path)) {
			path = [path];
		}

		// Normalize all the entries
		for (i = 0; i < path.length; i++) {

			// Append the path prefix
			path[i] = '/public/scripts/' + path[i];

			if (path[i].indexOf('.js') < 0) {
				path[i] = path[i] + '.js';
			}
		}

		// Execute the hawkejs helper
		return this.script(path, options);
	};

};