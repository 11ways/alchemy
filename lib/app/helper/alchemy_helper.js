module.exports = function alchemyFormHelpers (hawkejs) {
	
	// References
	var helpers = hawkejs.helpers,
	    drones  = hawkejs.drones;

	drones.doExposure = function doExposure(next, $result) {

		var name, expose = this.scope.variables.__expose;

		for (name in expose) {
			hawkejs._extendClientVar(name, expose[name], $result, null);
		}
		
		next();
	};

};