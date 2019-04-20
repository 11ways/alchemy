/**
 * The Http Conduit Class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.3.0
 *
 * @param    {IncomingMessage}   req
 * @param    {ServerResponse}    res
 * @param    {Router}            router
 */
var HttpConduit = Function.inherits('Alchemy.Conduit', function HttpConduit(req, res, router) {

	// Initialize basic conduit values
	HttpConduit.super.call(this);

	this.initHttp(req, res, router);
});

/**
 * Return the IP address
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.2
 */
HttpConduit.setProperty(function ip() {

	var req = this.request;

	if (!req) {
		return null;
	}

	let forwarded_for = req.headers['x-forwarded-for'];

	if (forwarded_for) {

		// Forwarded for can contain multiple ip addresses,
		// return the first one
		if (forwarded_for.indexOf(',') > -1) {
			forwarded_for = forwarded_for.before(',');
		}

		return forwarded_for;
	}

	return req.connection.remoteAddress ||
	       req.socket.remoteAddress ||
	       req.connection.socket.remoteAddress;
});

/**
 * Init
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.3.3
 * @version  1.1.0
 *
 * @param    {IncomingMessage}   req
 * @param    {ServerResponse}    res
 * @param    {Router}            router
 */
HttpConduit.setMethod(async function initHttp(req, res, router) {

	if (req != null) {
		// Make conduit available in req
		req.conduit = this;

		// Basic HTTP objects
		this.request = req;

		// The HTTP request headers
		this.headers = req.headers;

		// The path as given to us by the browser (including query)
		this.original_path = req.url;

		// Is this an AJAX request?
		this.ajax = null;
	}

	if (res != null) {
		this.response = res;
	}

	if (router) {
		this.router = router;
	}

	// The HTTP status
	this.status = 200;

	this.debugMark('Parse request');

	// Parse the request, get the correct routes and such
	await this.parseRequest();

	if (this.halt_request) {
		return;
	}

	if (alchemy.settings.debug || alchemy.settings.environment != 'live') {
		this.setHeader('X-Robots-Tag', 'none');
	}

	this.debugMark(false);

	// Call the middleware, which will call the handler afterwards
	this.callMiddleware();
});