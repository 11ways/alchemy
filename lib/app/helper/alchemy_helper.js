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
	hawkejs.getResource = function getResource(name, callback) {

		// Make an ajax request on the client side
		if (this.hawkejs && this.hawkejs.ajax) {
			$.get('/hawkejs/api/' + name, callback);
		} else {
			// @todo: URL based ACL blocks won't work when run on the server
			var ctrl = Controller.get('AlchemyApiCalls', this.hawkejs.req.augment);
			ctrl[name](this.hawkejs.req.augment.render);
		}

	};

};