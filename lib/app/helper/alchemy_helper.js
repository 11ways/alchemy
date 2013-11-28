module.exports = function alchemyFormHelpers (hawkejs) {
	
	// References
	var helpers = hawkejs.helpers,
	    drones  = hawkejs.drones;

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

};