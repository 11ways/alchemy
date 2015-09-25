module.exports = function alchemyHelpers(Hawkejs, Blast) {

	var Alchemy = Hawkejs.Helper.extend(function AlchemyHelper(view) {
		Hawkejs.Helper.call(this, view);
	});

	/**
	 * Perform a resource request 
	 *
	 * @author        Jelle De Loecker   <jelle@develry.be>
	 * @since         0.0.1
	 * @version       0.0.1
	 */
	Alchemy.setMethod(function getResource(name, data, callback) {

		if (Blast.isNode) {
			Resource.get(name, data, callback);
		} else {
			hawkejs.scene.fetch('/resource/api/' + name, {get: data}, callback);
		}
	});

	if (!Blast.isBrowser) {
		return;
	}

	// Send a message to the server when we unload the page
	window.addEventListener('unload', function(event) {
		if (console) {
			console.log('Unloading the page ...');
		}
	});
};