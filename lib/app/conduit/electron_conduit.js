var fs = require('fs');

/**
 * The Electron Conduit Class
 *
 * @constructor
 * @extends       Alchemy.Conduit
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.2.0
 * @version       0.3.0
 *
 * @param         {Object}     request
 * @param         {Function}   callback
 */
var ElectronConduit = Function.inherits('Alchemy.Conduit', function ElectronConduit(request, callback, router) {

	// Create a reference to ourselves
	this.conduit = this;

	// Use passed-along router, or default router instance
	this.router = router || Router;

	// Debug messages for this request
	this.debuglog = [];

	this._debugObject = this.debug({label: 'Initialize Conduit'});
	this._debugConduitInitialize = this._debugObject;

	this.request = request;
	this.response = callback;
	request.conduit = this;

	// Allow use of the log in the views
	if (alchemy.settings.debug) {
		this.internal('debuglog', {_placeholder_: 'debuglog'});
	}

	// Cookies to send to the client
	this.newCookies = {};
	this.newCookieHeader = [];

	this.debugMark('Parse request');

	// Pre-set headers & protocol
	this.url = URL.parse(request.url);
	this.headers = {};
	this.protocol = 'alc';
	this.originalPath = this.url.pathname;
	this.encrypted = false;

	// Parse the request, get the correct routes and such
	this.parseRequest();

	this.debugMark(false);

	// Call the middleware, which will call the handler afterwards
	this.callMiddleware();
});

/**
 * Create a new Hawkejs' ViewRender instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
ElectronConduit.setMethod(function prepareViewRender() {

	// Add a link to this conduit
	this.viewRender.conduit = this;

	// Let the ViewRender get some request info
	this.viewRender.prepare(this, this);

	// Pass url parameters to the client
	this.viewRender.internal('urlparams', this.params);
	this.viewRender.internal('url', this.url);
});

ElectronConduit.setMethod(function setHeader(name, val) {
	console.log('Setting header', name, val);
});

/**
 * Call the actual end method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 */
ElectronConduit.setMethod(function _end(message, encoding) {
	this.response({mimeType: 'text/html', data: Buffer.from(message)});
});

/**
 * Serve a file
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
ElectronConduit.setMethod(function serveFile(path, options) {

	var that = this,
	    stats,
	    isStream;

	// See if we have a stats object
	if (Object.isObject(path)) {

		if (path.readable) {
			isStream = true;
			stats = {
				mimetype: 'application/octet-stream'
			};
		} else {
			stats = path;
		}
	} else {
		stats = {
			path: path
		};
	}

	fs.readFile(stats.path, function (err, data) {
		that.response({mimeType: stats.mimetype, data: data});
	});
});