var filecache = {},
    sessionStore,
    libpath = require('path'),
    libmime = require('mime'),
    mmmagic = require('mmmagic'),
    magic = new mmmagic.Magic(mmmagic.MAGIC_MIME_TYPE),
    Url = require('url'),
    fs = require('fs'),
    prefixes = alchemy.shared('Routing.prefixes');

// Create a new expireable store for the sessions
sessionStore = new alchemy.modules.expirable('20 minutes');

/**
 * The Conduit Class
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {IncomingMessage}   req
 * @param    {ServerResponse}    res
 */
var Conduit = Informer.extend(function Conduit(req, res) {

	// Make conduit available in req
	req.conduit = this;

	// Basic HTTP objects
	this.request = req;
	this.response = res;

	// The HTTP request headers
	this.headers = req.headers;

	// Is this an AJAX request?
	this.ajax = null;

	// The path as given to us by the browser (including query)
	this.originalPath = req.url;

	// The path without any prefix, including section mounts
	this.path = null;

	// The path without prefix or section mount
	this.sectionPath = null;

	// The accepted languages
	this.languages = null;

	// Optional prefix name
	this.prefix = null;

	// The matching Route instance
	this.route = null;

	// The named parameters inside the path
	this.params = null;

	// The section vhost domain
	this.sectionDomain = null;

	// The section of the used route
	this.section = null;

	// The parsed path (including querystring)
	this.url = null

	// The ViewRender instance
	this.viewRender = null;

	// The current active theme
	this.theme = null;

	// The HTTP status
	this.status = 200;

	// Cookies to send to the client
	this.newCookies = {};
	this.newCookieHeader = [];

	// Parse the request, get the correct routes and such
	this.parseRequest();

	// Call the middleware, which will call the handler afterwards
	this.callMiddleware();
});

/**
 * Return the body
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Conduit.prepareProperty(function body() {
	return this.request.body || {};
});

/**
 * Return the uploaded files
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Conduit.prepareProperty(function files() {
	return this.request.files || {};
});

/**
 * Return the cookies
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Conduit.prepareProperty(function cookies() {
	return String.decodeCookies(this.request.headers.cookie);
});

/**
 * Parse the request, get information from the url
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {IncomingMessage}   req
 * @param    {ServerResponse}    res
 */
Conduit.setMethod(function parseRequest() {

	var section;

	this.method = this.request.method.toLowerCase();

	this.parseShortcuts();
	this.parseLanguages();
	this.parsePrefix();
	this.parseSection();
	this.parseRoute();

	// Parse the section path without the prefix
	this.url = Url.parse(this.sectionPath, true);
});

/**
 * Parse the headers for shortcuts
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Conduit.setMethod(function parseShortcuts() {

	var headers = this.headers;

	// A request can just tell us what route to use
	if (headers['x-alchemy-route-name']) {
		this.route = Router.getRouteByName(headers['x-alchemy-route-name']);
	}

	// And which prefix
	if (headers['x-alchemy-prefix'] && prefixes[headers['x-alchemy-prefix']]) {
		this.prefix = headers['x-alchemy-prefix'];
	}

	// Section domains can only be requested through headers
	if (headers['x-alchemy-section-domain']) {
		this.sectionDomain = headers['x-alchemy-section-domain'];
	}

	this.ajax = headers['x-requested-with'] === 'XMLHttpRequest';

});

/**
 * Sort the parsed accept-language header array
 *
 * @author   Jelle De Loecker       <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   a
 * @param    {Object}   b
 */
function qualityCmp(a, b) {
	if (a.quality === b.quality) {
		return 0;
	} else if (a.quality < b.quality) {
		return 1;
	} else {
		return -1;
	}
}

/**
 * Parses the HTTP accept-language header
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
 */
Conduit.setMethod(function parseLanguages() {

	var rawLangs,
	    rawLang,
	    parts,
	    langs,
	    qval,
	    tamp,
	    i,
	    q;

	langs = [];

	if (this.headers['accept-language']) {

		rawLangs = this.headers['accept-language'].split(',');

		for (i = 0; i < rawLangs.length; i++) {
			rawLang = rawLangs[i];

			parts = rawLang.split(';');
			qval = null;
			q = 1;

			if (parts.length > 1 && parts[1].indexOf('q=') === 0) {
				qval = parseFloat(parts[1].split('=')[1]);

				if (isNaN(qval) === false) {
					q = qval;
				}
			}

			// Get the lang-loc code
			temp = parts[0].trim().toLowerCase().split('-');

			langs.push({lang: temp[0], loc: temp[1], quality: q});
		}

		langs.sort(qualityCmp);
	};

	this.languages = langs;

});

/**
 * Parse the request, get information from the url
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Conduit.setMethod(function parsePrefix() {

	var prefix,
	    begin,
	    path;

	path = this.originalPath;

	// Look for the prefix at the beginning of the url path
	if (!this.prefix) {
		for (prefix in prefixes) {
			begin = '/' + prefix + '/';

			if (path.indexOf(begin) === 0) {
				this.prefix = prefix;
				break;
			}
		}
	}

	// Remove the prefix from the path if one is given
	if (this.prefix && path.indexOf('/' + this.prefix + '/') === 0) {
		this.path = path.slice(this.prefix.length+1);
	} else {
		this.path = path;
	}

});

/**
 * Get the section
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Conduit.setMethod(function parseSection() {

	// Get the section this path is using
	this.section = Router.getPathSection(this.path);

	// If the section has a parent it's not the root
	if (this.section.parent) {
		this.sectionPath = this.path.slice(this.section.mount.length);
	} else {
		this.sectionPath = this.path;
	}

});

/**
 * Get the Route instance & named parameters
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Conduit.setMethod(function parseRoute() {

	var temp;

	this.section = Router.getPathSection(this.path);

	// If the route hasn't been found in the header shortcuts yet, look for it
	if (!this.route) {
		temp = Router.getRouteBySectionPath(this.section, this.sectionPath, this.prefix);

		if (temp) {
			this.route = temp.route;
			this.params = temp.params;
			this.paramsConfig = temp.paramsConfig;
		}
	} else {
		temp = this.route.match(this.sectionPath);

		if (temp) {
			this.params = temp.params || {};
			this.paramsConfig = temp.config || [];
		} else {
			this.params = {};
			this.paramsConfig = [];
		}
	}
});

/**
 * Run the middleware
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Conduit.setMethod(function callMiddleware() {

	var that = this,
	    middlewares = new Iterator(this.section.getMiddleware(this.section, this.sectionPath, this.prefix));

	Function.while(function test() {
		return middlewares.hasNext();
	}, function middlewareTask(next) {

		var route = middlewares.next().value,
		    middlePath,
		    req;

		// Skip middleware that does not listen to the request method
		if (route.methods.indexOf(that.method) === -1) {
			return next();
		}

		// Augment the request object
		req = Object.create(that.request);

		// Get the path without the middleware mount path
		middlePath = req.conduit.sectionPath.replace(route.paths[''].source, '');

		if (middlePath[0] !== '/') {
			middlePath = '/' + middlePath;
		}

		req.middlePath = middlePath;
		req.original = that.request;

		route.fnc(req, that.response, next);
	}, function done() {
		that.prepareViewRender();
		that.callHandler();
	});
});

/**
 * Create a new Hawkejs' ViewRender instance
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Conduit.setMethod(function prepareViewRender() {
	this.viewRender = alchemy.hawkejs.createViewRender();
	this.viewRender.conduit = this;
	this.viewRender.prepare(this.request, this.response);
});

/**
 * Call the handler of this route when parsing is finished
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Conduit.setMethod(function callHandler() {

	if (!this.route) {
		this.notFound('Route was not found');
		return;
	}

	this.route.callHandler(this);
});

/**
 * Send a response to the client
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Conduit.setMethod(function send(content) {
	this.response.end(content, 'utf-8');
});

/**
 * Redirect to another url
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Number}   status   3xx redirection codes. 301 (permanent redirect) by default
 * @param    {String}   url
 */
Conduit.setMethod(function redirect(status, url) {

	if (typeof status != 'number') {
		url = status;
		status = 301;
	}

	pr('Redirecting to ' + url);

	this.response.writeHead(status, {Location: url});
	this.response.end();
});

/**
 * Respond with an error
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Error}   message   optional error to send
 */
Conduit.setMethod(function error(status, message) {

	var subject = 'Error found on ' + this.originalPath + '';

	if (typeof status !== 'number') {
		message = status;
		status = 500;
	}

	if (!message) {
		message = 'Unknown server error';
	}

	if (message instanceof Error) {
		log.error(subject, {err: message});
	} else {
		log.error(subject + ': ' + message, {err: new Error('Unknown error')});
	}

	// Clients browsing to this page get a nicely rendered error template
	if (this.ajax || (this.headers.accept && this.headers.accept.indexOf('html') > -1)) {
		this.status = status;
		this.set('status', status);
		this.set('message', message);
		this.render(['error/' + status, 'error/unknown']);
	} else {
		// Requests for images or scripts just get a non-expensive string response
		this.response.writeHead(status, {'Content-Type': 'text/plain'});
		this.response.end(status + ': ' + message + '\n');
	}
});

/**
 * Respond with a not found error status
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Error}   message   optional error to send
 */
Conduit.setMethod(function notFound(message) {

	if (message == null) {
		message = 'Not found';
	}

	this.error(404, message);
});

/**
 * Respond with text. Objects get JSON encoded
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String|Object}   message
 */
Conduit.setMethod(function end(message) {

	if (typeof message !== 'string') {
		message = JSON.stringify(message);
	}

	this.response.end(message);
});

/**
 * Render a view and send it to the client
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Conduit.setMethod(function render(templateName, callback) {

	var that = this,
	    templates = [];

	if (templateName) {
		templates.push(templateName);
	} else {
		templates.push(this.view);
	}

	this.response.statusCode = this.status;
	templates.push('error/404');

	this.viewRender.beginRender(templates, {}, function afterRender(err, html) {

		if (err != null) {

			if (callback) {
				return callback(err);
			}

			throw err;
		}

		if (typeof html !== 'string') {

			// Stringify using json-dry
			html = alchemy.stringify(html);

			// Tell the client to expect a json-dry response
			that.response.writeHead(this.status, {'Content-Type': 'application/json-dry'});
		}

		if (callback) {
			return callback(null, html);
		}

		that.response.end(html, 'utf-8');
	});
});

function getFileInfo(path, options, callback) {

	var type,
	    obj;

	if (!path) {
		return callback(new Error('File not found'));
	}

	if (!filecache[path]) {
		obj = {};
		filecache[path] = obj;

		fs.exists(path, function checkExists(exists) {

			if (!exists) {
				return callback('File does not exist');
			}

			// Lookup the mimetype by the extension alone
			obj.mimetype = libmime.lookup(path);

			// Return the result if a valid mimetype was found
			if (obj.mimetype !== 'application/octet-stream') {
				return callback(null, obj);
			}

			// Look inside the data (using "magic") for a better mimetype
			magic.detectFile(path, function detectedMimetype(err, result) {
				obj.mimetype = result;
				callback(null, obj);
			});
		});
	} else {
		callback(null, filecache[path]);
	}
}

/**
 * Send a file
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Conduit.setMethod(function serveFile(path, options) {

	var that = this;

	if (options == null) {
		options = {};
	}

	getFileInfo(path, options, function gotFileInfo(err, info) {

		var mimetype,
		    stream;

		// Send a 404 if no file was found
		if (err) {
			that.notFound(err);
			return;
		}

		mimetype = info.mimetype;

		if (mimetype === 'application/octet-stream') {
			if (options.mimetype) {
				mimetype = options.mimetype;
			}
		}

		// Send the mimetype
		that.response.writeHead(200, {'Content-Type': mimetype});

		// Stream the file
		stream = fs.createReadStream(path, {bufferSize: 64*1024}).pipe(that.response);
	});
});

/**
 * Create a session
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Conduit.setMethod(function createSession() {

	var cookieName,
	    sessionId,
	    session;

	// Only do this once per request
	if (this.sessionData != null) {
		return;
	}

	// Set the name of the cookie (could change in the future)
	cookieName = 'session';

	// Get the ID of the session
	sessionId = this.cookie(cookieName);

	if (sessionId) {
		// Get the session
		session = sessionStore.get(sessionId);
	}

	// If no valid session exists, create a new one (including uid)
	if (!session) {
		session = {};
		sessionId = Crypto.uid();
		this.cookie(cookieName, sessionId);
		sessionStore.set(sessionId, session);
	}

	this.sessionData = session;
});

/**
 * Get a parameter from the route, post or get query
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 */
Conduit.setMethod(function param(name) {

	if (this.body[name] != null) {
		return this.body[name];
	}

	if (this.url.query[name] != null) {
		return this.url.query[name];
	}

	return this.params[name];
});

/**
 * Get a a value from the session object
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 *
 * @return   {Mixed}
 */
Conduit.setMethod(function session(name, value) {

	this.createSession();

	if (arguments.length === 0) {
		return this.sessionData;
	}

	if (arguments.length === 1) {
		return this.sessionData[name];
	}

	this.sessionData[name] = value;
});

/**
 * Get a parameter from the route
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 */
Conduit.setMethod(function routeParam(name) {
	return this.params[name];
});

/**
 * Get/set a cookie
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 * @param    {Object}   options
 */
Conduit.setMethod(function cookie(name, value, options) {

	var header,
	    arr,
	    key;

	if (arguments.length == 1) {
		return this.newCookies[name] || this.cookies[name];
	}

	if (options == null) options = {};

	// If the value is null or undefined, the cookie should be removed
	if (value == null) {
		options.expires = new Date(0);
	}

	// If no path is given, default to the root path
	if (options.path == null) options.path = '/';

	// Store it in the newCookies object, for quick access
	this.newCookies[name] = value;

	// Create the basic header string
	header = String.encodeCookie(name, value, options);

	// Add this to the cookieheader array
	this.newCookieHeader.push(header);

	// Re-set the set-cookie header
	this.response.setHeader('Set-Cookie', this.newCookieHeader);
});

/**
 * Set a variable for ViewRender
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Conduit.setMethod(function set(name, value) {

	if (arguments.length == 1) {
		return this.viewRender.set(name);
	}

	return this.viewRender.set(name, value);
});

/**
 * Set an internal variable for ViewRender
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Conduit.setMethod(function internal(name, value) {

	if (arguments.length == 1) {
		return this.viewRender.internal(name);
	}

	return this.viewRender.internal(name, value);
});

/**
 * Expose a variable for ViewRender
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Conduit.setMethod(function expose(name, value) {

	if (arguments.length == 1) {
		return this.viewRender.expose(name);
	}

	return this.viewRender.expose(name, value);
});

/**
 * Set a theme to use
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 */
Conduit.setMethod(function setTheme(name) {
	this.theme = name;
	this.viewRender.setTheme(name);
});

global.Conduit = Conduit;