module.exports = function publicConduit(Hawkejs, Blast) {

	/**
	 * The Conduit class
	 * (on the client side)
	 *
	 * @constructor
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	var Conduit = Function.inherits('Alchemy.Client.Base', function Conduit() {

		// Reference to ourselves
		this.conduit = this;

		// New cookies
		this.new_cookies = {};

		// The headers to "send"
		this.response_headers = {};
	});

	if (Blast.isNode) {
		return;
	}

	/**
	 * Intercept Scene#openUrl calls
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 */
	Hawkejs.Scene.setMethod(function interceptOpenUrl(url, options, callback) {

		var path_prefix,
		    prefix,
		    route,
		    path = url.pathname,
		    key;

		console.log('Intercepting?', url, options, callback);
		console.log('Path:', path)

		for (key in hawkejs.scene.exposed.prefixes) {
			path_prefix = '/' + key + '/';

			if (path.startsWith(path_prefix)) {
				prefix = key;
				path = '/' + path.after(path_prefix);
				break;
			}
		}

		console.log(prefix, path);

		
	})
};