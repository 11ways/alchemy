/**
 * The Http Conduit Class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.3
 *
 * @param    {IncomingMessage}   req
 * @param    {ServerResponse}    res
 * @param    {Router}            router
 */
var HttpConduit = Function.inherits('Alchemy.Conduit.Conduit', function Http(req, res, router) {

	// Initialize basic conduit values
	Http.super.call(this);

	this.initHttp(req, res, router);
});

/**
 * Has the client aborted the request?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Boolean}
 */
HttpConduit.setProperty(function aborted() {

	if (this.request && this.request.aborted != null) {
		return this.request.aborted;
	}

	return false;
});

/**
 * Return the IP address
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
HttpConduit.setProperty(function ip() {

	var req = this.request;

	if (!req) {
		return null;
	}

	let forwarded_for = req.headers['x-forwarded-for'] || req.headers['x-real-ip'];

	if (forwarded_for) {

		// Forwarded for can contain multiple ip addresses,
		// return the first one
		if (forwarded_for.indexOf(',') > -1) {
			forwarded_for = forwarded_for.before(',');
		}

		return forwarded_for;
	}

	let remote_address;

	if (req.connection) {
		remote_address = req.connection.remoteAddress;
	}

	if (!remote_address && req.socket) {
		remote_address = req.socket.remoteAddress;
	}

	if (!remote_address && req.connection && req.connection.socket) {
		remote_address = req.connection.socket.remoteAddress;
	}

	return remote_address;
});

/**
 * Get a simple fingerprint of the client
 * based on ip, accept-language & user-agent
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {String}
 */
HttpConduit.enforceProperty(function fingerprint() {

	let result,
	    language = this.headers['accept-language'] || 'all',
	    ua = this.headers['user-agent'] || 'unknown',
	    ip = this.ip || '';

	result = Object.checksum(ip + '_' + language + '_' + ua);

	return result;
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

		// Parse the original URL without host
		this.original_url = new RURL(req.url);

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

/**
 * Get the original url path
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {String}
 */
HttpConduit.setProperty(function original_path() {
	return this.original_url.path;
}, function setPath(value) {
	return this.original_url.path = value;
});

/**
 * Get the original url pathname
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {String}
 */
HttpConduit.setProperty(function original_pathname() {
	return this.original_url.pathname;
}, function setPathname(value) {
	return this.original_url.pathname = value;
});