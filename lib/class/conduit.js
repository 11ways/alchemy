var fileCache  = alchemy.shared('files.fileCache'),
    libpath = alchemy.use('path'),
    libmime = alchemy.use('mime'),
    libua   = alchemy.use('useragent'),
    zlib    = alchemy.use('zlib'),
    qs      = alchemy.use('qs'),
    magic,
    Url = alchemy.use('url'),
    fs = alchemy.use('fs'),
    prefixes = alchemy.shared('Routing.prefixes');

/**
 * The Conduit Class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.3.3
 *
 * @param    {IncomingMessage}   req
 * @param    {ServerResponse}    res
 * @param    {Router}            router
 */
var Conduit = Function.inherits('Alchemy.Base', function Conduit(req, res, router) {

	// Store the starting time
	this.start = Blast.performanceNow();

	// Create a reference to ourselves
	this.conduit = this;

	// Debug messages for this request
	this.debuglog = [];

	this._debugObject = this.debug({label: 'Initialize Conduit'});
	this._debugConduitInitialize = this._debugObject;

	// Allow use of the log in the views
	if (alchemy.settings.debug) {
		this.internal('debuglog', {_placeholder_: 'debuglog'});
	}

	// Cookies to send to the client
	this.newCookies = {};
	this.newCookieHeader = [];

	// The headers to send
	this.response_headers = {};

	this.initValues();
});

/**
 * Return the body
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 */
Conduit.prepareProperty(function body() {

	if (this.request) {
		return this.request.body || {};
	}

	return {};
});

/**
 * Return the uploaded files
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Conduit.prepareProperty(function files() {
	return this.request.files || {};
});

/**
 * Return the cookies
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Conduit.prepareProperty(function cookies() {
	return String.decodeCookies(this.headers.cookie);
});

/**
 * Return the parsed useragent string
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.5.0
 */
Conduit.prepareProperty(function useragent() {
	return libua.lookup(this.headers['user-agent']);
});

/**
 * Create a Hawkejs ViewRender
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Conduit.prepareProperty(function viewRender() {
	return alchemy.hawkejs.createViewRender();
});

/**
 * Get a session object by id
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Conduit.setStatic(function getSessionById(id) {
	return alchemy.sessions.get(id);
});

/**
 * See if this is a secure connection
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.2
 * @version  0.4.2
 */
Conduit.setProperty(function is_secure() {

	var protocol;

	if (alchemy.settings.assume_https) {
		return true;
	}

	if (this.headers['x-forwarded-proto'] && this.headers['x-forwarded-proto'] == 'https') {
		return true;
	}

	if (this.protocol == 'https://') {
		return true;
	}

	if (this.encrypted == true) {
		return true;
	}

	return false;
});

/**
 * Don't convert a conduit to any special json data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Conduit.setMethod(function toJSON() {
	return null;
});

/**
 * Init values
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.3
 * @version  0.3.3
 */
Conduit.setMethod(function initValues() {

	// Use passed-along router, or default router instance
	this.router = this.router || Router;

	// The path without any prefix, including section mounts
	this.path = null;

	// The path without prefix or section mount
	this.sectionPath = null;

	// The accepted languages
	this.languages = null;

	// URL paths can be prefixed with certain locales,
	// these locales should then get preference over the user's browser locale
	this.prefix = null;

	// All the locales the user's browser accepts
	this.locales = null;

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

	// The current active theme
	this.theme = null;
});

/**
 * Get the time since the conduit was made
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Conduit.setMethod(function time() {
	return Blast.performanceNow() - this.start;
});

/**
 * Parse the request, get information from the url
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.1
 *
 * @param    {IncomingMessage}   req
 * @param    {ServerResponse}    res
 */
Conduit.setMethod(function parseRequest() {

	var protocol,
	    section;

	if (this.method == null && this.request && this.request.method) {
		this.method = this.request.method.toLowerCase();
	}

	this.parseShortcuts();
	this.parseLanguages();
	this.parsePrefix();
	this.parseSection();
	this.parseRoute();

	// Is this encrypted?
	if (this.encrypted == null) {
		this.encrypted = this.request.connection.encrypted;
	}

	// If the url has already been parsed, return early
	if (this.url) {
		return;
	}

	if (alchemy.settings.assume_https) {
		protocol = 'https://';
	} else if (this.headers['x-forwarded-proto']) {
		protocol = this.headers['x-forwarded-proto'] + '://';
	} else if (this.protocol) {
		protocol = this.protocol;
	} else if (this.encrypted) {
		protocol = 'https://';
	} else {
		protocol = 'http://';
	}

	let url = protocol + this.headers.host;

	if (this.prefix) {
		url += '/' + this.prefix;
	}

	// Parse the section path
	this.url = Url.parse(url + this.path, true);

	// Parse GET parameters using qs, which supports nested items
	if (this.url.search) {
		this.url.query = qs.parse(this.url.search.slice(1));
	}
});

/**
 * Parse the headers for shortcuts
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Conduit.setMethod(function parseShortcuts() {

	var headers = this.headers;

	// A request can just tell us what route to use
	if (headers['x-alchemy-route-name']) {
		this.route = this.router.getRouteByName(headers['x-alchemy-route-name']);
	}

	// And which prefix (this is a forced prefix)
	if (headers['x-alchemy-prefix'] && prefixes[headers['x-alchemy-prefix']]) {
		this.prefix = headers['x-alchemy-prefix'];
	}

	// Section domains can only be requested through headers
	if (headers['x-alchemy-section-domain']) {
		this.sectionDomain = headers['x-alchemy-section-domain'];
	}

	// Only get ajax on the first parse
	if (this.ajax == null) {
		this.ajax = headers['x-requested-with'] === 'XMLHttpRequest';
	}

});

/**
 * Sort the parsed accept-language header array
 *
 * @author   Jelle De Loecker       <jelle@develry.be>
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
 */
Conduit.setMethod(function parseLanguages() {

	var rawLangs,
	    rawLang,
	    locales,
	    parts,
	    langs,
	    qval,
	    temp,
	    i,
	    q;

	langs = [];
	locales = [];

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

	temp = {};

	for (i = 0; i < langs.length; i++) {
		if (!temp[langs[i].lang]) {
			locales.push(langs[i].lang);
			temp[langs[i].lang] = true;
		}
	}

	this.languages = langs;
	this.locales = locales;
});

/**
 * Parses accept-encoding strings
 *
 * @author   jshttp
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
function parseEncoding(s, i) {
	var match = s.match(/^\s*(\S+?)\s*(?:;(.*))?$/);

	if (!match) return null;

	var encoding = match[1];
	var q = 1;
	if (match[2]) {
		var params = match[2].split(';');
		for (var i = 0; i < params.length; i ++) {
			var p = params[i].trim().split('=');
			if (p[0] === 'q') {
				q = parseFloat(p[1]);
				break;
			}
		}
	}

	return {
		encoding: encoding,
		q: q,
		i: i
	};
}

/**
 * Parses accept-encoding strings
 *
 * @author   jshttp
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
function specify(encoding, spec, index) {
	var s = 0;
	if(spec.encoding.toLowerCase() === encoding.toLowerCase()){
		s |= 1;
	} else if (spec.encoding !== '*' ) {
		return null
	}

	return {
		i: index,
		o: spec.i,
		q: spec.q,
		s: s
	}
};

/**
 * Parses the HTTP accept-encoding header
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Conduit.setMethod(function parseAcceptEncoding() {

	var hasIdentity,
	    minQuality,
	    encoding,
	    accepts,
	    i,
	    j;

	// Make sure this only runs once
	if (this.accepted_encodings != null) {
		return;
	}

	if (!this.headers['accept-encoding']) {
		this.accepted_encodings = false;
		return;
	}

	accepts = this.headers['accept-encoding'].split(',');
	minQuality = 1;

	for (i = 0, j = 0; i < accepts.length; i++) {
		encoding = parseEncoding(accepts[i].trim(), i);

		if (encoding) {
			accepts[j++] = encoding;
			hasIdentity = hasIdentity || specify('identity', encoding);
			minQuality = Math.min(minQuality, encoding.q || 1);
		}
	}

	if (!hasIdentity) {
		/*
		 * If identity doesn't explicitly appear in the accept-encoding header,
		 * it's added to the list of acceptable encoding with the lowest q
		 */
		accepts[j++] = {
			encoding: 'identity',
			q: minQuality,
			i: i
		};
	}

	// trim accepts
	accepts.length = j;

	this.accepted_encodings = accepts;
});

/**
 * See if the wanted encoding is accepted by the client
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Conduit.setMethod(function accepts(encoding) {

	var i;

	// Parse the encodings on the fly
	this.parseAcceptEncoding();

	if (!this.accepted_encodings) {
		return false;
	}

	for (i = 0; i < this.accepted_encodings.length; i++) {
		if (this.accepted_encodings[i].encoding == encoding) {
			return true;
		}
	}

	return false;
});

/**
 * Create a loopback conduit
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.3
 *
 * @param    {Object}   args
 * @param    {Function} callback
 */
Conduit.setMethod(function loopback(args, callback) {

	var param_config,
	    result = new Classes.Alchemy.LoopbackConduit(this),
	    route;

	result.body = args.body;

	// If a route name has been given, get it now
	if (args.name) {
		route = result.getRouteByName(args.name);
	}

	// If a route has been found, also get the parameter configuration
	// This is for passing along variables to the function as parameters
	if (route) {
		param_config = Object.first(route.paths);

		if (param_config) {
			result.paramsConfig = param_config;
		}
	}

	if (args.params) {
		result.params = args.params;
	}

	if (args.arguments) {
		result.loopback_arguments = args.arguments;
	}

	if (callback) {
		result.setCallback(callback);
	}

	result.callMiddleware();

	return result;
});

/**
 * Parse the request, get information from the url
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.5.0
 */
Conduit.setMethod(function parsePrefix() {

	var active_prefix,
	    prefix,
	    begin,
	    path;

	path = this.originalPath;

	if (!path) {
		return;
	}

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

	// Handle urls with ONLY the prefix and no ending slash
	if (!this.prefix) {
		for (prefix in prefixes) {
			begin = '/' + prefix;

			if (path.indexOf(begin) === 0) {
				this.prefix = prefix;
				break;
			}
		}

		if (this.prefix && path.endsWith('/' + this.prefix)) {
			this.path = '/';
		} else {
			this.path = path;
		}

	} else if (this.prefix && path.indexOf('/' + this.prefix + '/') === 0) {
		// Remove the prefix from the path if one is given
		this.path = path.slice(this.prefix.length+1);
	} else {
		this.path = path;
	}

	// Add this prefix to the top of the locales
	if (this.prefix) {
		active_prefix = this.prefix;
		this.locales.unshift(this.prefix);

		// Let the client know this prefix should be used
		this.expose('forced_prefix', this.prefix);
	} else {

		// If no prefix has been found yet, look for the default prefix
		// This will override the browser locale
		if (this.headers['x-alchemy-default-prefix']) {
			if (prefixes[this.headers['x-alchemy-default-prefix']]) {
				active_prefix = this.headers['x-alchemy-default-prefix'];

				if (this.locales[0] != active_prefix) {
					this.locales.unshift(active_prefix);
				}
			}
		}

		if (!active_prefix) {
			active_prefix = this.locales[0];
		}
	}

	// Set the active prefix
	this.internal('active_prefix', active_prefix);
	this.expose('active_prefix', active_prefix);

	// Set the translate options for use in hawkejs
	this.internal('locales', this.locales);
	this.expose('locales', this.locales);
});

/**
 * Get the section
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.1
 */
Conduit.setMethod(function parseSection() {

	// Get the section this path is using
	this.section = this.router.getPathSection(this.path);

	if (!this.section) {
		log.warn('No section found for path "' + this.path + '"');
	}

	// If the section has a parent it's not the root
	if (this.section && this.section.parent) {
		this.sectionPath = this.path.slice(this.section.mount.length);
	} else {
		this.sectionPath = this.path;
	}

});

/**
 * Get a route by its name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String|Object}   name   The name of the route
 */
Conduit.setMethod(function getRouteByName(name) {

	// See if the name is an object, which means it's for sockets
	if (name && typeof name == 'object') {
		this.route = name;
	} else {
		this.route = this.router.getRouteByName(name);
	}

	return this.route;
});

/**
 * Get the Route instance & named parameters
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.1
 *
 * @param    {Route}   after_route   Only check routes after this one
 */
Conduit.setMethod(function parseRoute(after_route) {

	var temp;

	this.section = this.router.getPathSection(this.path);

	// Remove the current found route
	if (after_route) {
		this.route_rematch = true;
		this.route = null;
	}

	// If the route hasn't been found in the header shortcuts yet, look for it
	if (!this.route) {
		temp = this.router.getRouteBySectionPath(this.method, this.section, this.sectionPath, this.prefix, after_route);

		if (temp) {
			this.route = temp.route;
			this.params = temp.params;
			this.paramsConfig = temp.paramsConfig;
		} else {
			this.route_not_found = true;
		}
	} else {
		temp = this.route.match(this.method, this.sectionPath);

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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Conduit.setMethod(function callMiddleware() {

	var that = this,
	    middlewares = new Iterator(this.section.getMiddleware(this.section, this.path, this.prefix)),
	    debugObject = this._debugObject,
	    middleDebug = this.debug({label: 'middleware', data: {title: 'Doing middleware'}}),
	    routeDebug,
	    theme;

	if (middleDebug) {
		this._debugObject = middleDebug;
	}

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

		// Strip any query parameters
		if (middlePath.indexOf('?') > -1) {
			middlePath = middlePath.before('?');
		}

		if (middlePath[0] !== '/') {
			middlePath = '/' + middlePath;
		}

		// Look for theme settings
		if (req.conduit.url) {
			theme = req.conduit.url.query.theme;

			if (theme) {
				middlePath = ['/' + theme + middlePath, middlePath];
			}
		}

		req.middlePath = middlePath;
		req.original = that.request;

		if (routeDebug) {
			routeDebug.stop();
		}

		if (middleDebug) {
			routeDebug = middleDebug.debug('route', {title: 'Doing "' + route.name + '"'});
			that._debugObject = routeDebug;
		}

		route.fnc(req, that.response, next);
	}, function done(err) {

		if (err) {
			return that.emit('error', err);
		}

		if (routeDebug) {
			routeDebug.stop();
		}

		// Don't do this for websockets
		if (that.websocket) {
			return;
		}

		if (middleDebug) {
			middleDebug.mark('Preparing viewrender');
		}

		that.prepareViewRender();

		if (middleDebug) {
			middleDebug.mark(false);
			middleDebug.stop();
		}

		if (that._debugConduitInitialize) {
			that._debugConduitInitialize.stop();
		}

		// Return the original debug object
		that._debugObject = debugObject;

		that.callHandler();
	});
});

/**
 * Create a new Hawkejs' ViewRender instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Conduit.setMethod(function prepareViewRender() {

	// Add a link to this conduit
	this.viewRender.conduit = this;
	this.viewRender.server_var('conduit', this);

	// Let the ViewRender get some request info
	this.viewRender.prepare(this.request, this.response);

	// Pass url parameters to the client
	this.viewRender.internal('urlparams', this.params);
	this.viewRender.internal('url', this.url);

	if (this.route) {
		this.viewRender.internal('route', this.route.name);
	}
});

/**
 * Call the handler of this route when parsing is finished
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Conduit.setMethod(function callHandler() {

	if (!this.route) {

		if (alchemy.settings.debug) {
			console.log('Route not found:', this);
		}

		this.notFound('Route was not found');
		return;
	}

	this.route.callHandler(this);
});

/**
 * Redirect to another url
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.1
 *
 * @param    {Number}   status   3xx redirection codes. 302 (temporary redirect) by default
 * @param    {String}   url
 */
Conduit.setMethod(function redirect(status, url) {

	var temp;

	if (typeof status != 'number') {
		url = status;
		status = 302;
	}

	if (typeof url == 'object' && url) {

		if (url.href || url.path) {
			url = url.href || url.path;
		} else {

			if (url.body) {
				Object.defineProperty(this, 'body', {
					value: url.body,
					configurable: true
				});
			}

			if (url.method) {
				this.method = url.method;
			}

			// When headers are given, the redirect is internal
			if (url.headers) {
				this.headers = url.headers;

				this.oldOriginalPath = this.originalPath;

				if (typeof url.url == 'string') {
					temp = url.url;
					temp = URL.parse(temp);
					temp = temp.pathname;
				} else {
					temp = url.url.pathname;
				}

				// Register the new url as the one to use for the history
				this.setHeader('x-history-url', temp);
				this.expose('redirected_to', temp);

				this.originalPath = temp;

				// Reinitialize the conduit
				this.initValues();
				this.initHttp();

				return;
			} else {
				url = url.url;
			}
		}
	}

	this.status = status;
	this.setHeader('Location', url);
	this._end();
});

/**
 * Respond with an error
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.5.0
 *
 * @param    {Nulber}  status       Response statuscode
 * @param    {Error}   message      Optional error to send
 * @param    {Boolean} printError   Print the error, defaults to true
 */
Conduit.setMethod(function error(status, message, printError) {

	var subject = 'Error found on ' + this.originalPath + '';

	if (typeof status !== 'number') {
		message = status;
		status = 500;
	}

	if (!message) {
		message = 'Unknown server error';
	}

	if (printError === false) {
		log.error(subject + ':\n' + message);
	} else if (message instanceof Error) {
		alchemy.printLog('error', [subject, String(message), message], {err: message, level: -2});
	} else {
		log.error(subject + ':\n' + message);
	}

	// Make sure the client doesn't expect compression
	this.setHeader('content-encoding', '');

	// Only render an expensive "Error" template when the client directly
	// browses to an HTML page.
	// Don't render a template for AJAX or asset requests
	if (this.viewRender && (this.ajax || (this.headers.accept && this.headers.accept.indexOf('html') > -1))) {
		this.status = status;
		this.set('status', status);
		this.set('message', message);
		this.render(['error/' + status, 'error/unknown']);
	} else {
		// Requests for images or scripts just get a non-expensive string response
		this.setHeader('content-type', 'text/plain');
		this.status = status;
		this._end(status + ':\n' + message + '\n');
	}

	// Emit this as a conduit error
	alchemy.emit('conduit_error', this, status, message);
});

/**
 * Deny access
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Number}  status
 * @param    {Error}   message   optional error to send
 */
Conduit.setMethod(function deny(status, message) {

	if (typeof status == 'string') {
		message = status;
		status = 403;
	}

	if (message == null) {
		message = 'Forbidden';
	}

	this.error(status, message);
});

/**
 * Respond with a not found error status
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Error}   message   optional error to send
 */
Conduit.setMethod(function notFound(message) {

	// Look for other paths
	if (!this.route_not_found && this.route && !this.route_rematch) {

		// Try matching against paths after the ones we currently matched
		this.parseRoute(this.route);

		// Call the handler of that route if it has been found
		if (this.route) {
			return this.route.callHandler(this);
		}
	}

	if (message == null) {
		message = 'Not found';
	}

	this.error(404, message, false);
});

/**
 * Respond with a "Not Modified" 304 status
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 */
Conduit.setMethod(function notModified() {
	this.status = 304;
	this._end();
});

/**
 * Respond with text. Objects get JSON-dry encoded
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String|Object}   message
 */
Conduit.setMethod(function end(message) {

	var that = this,
	    json_type,
	    json_fnc,
	    cache,
	    etag,
	    temp;

	if (this.websocket) {
		throw new Error('You can not end a websocket, use the callback instead');
	}

	if (typeof message !== 'string') {

		// Use regular JSON if DRY has been disabled in settings
		if (alchemy.settings.json_dry_response === false || this.json_dry === false) {
			json_type = 'json';
			json_fnc = JSON.stringify;
		} else {
			json_type = 'json-dry';
			json_fnc = JSON.dry;
		}

		// Only send the mimetype if it hasn't been set yet
		if (this.setHeader('content-type') == null) {
			this.setHeader('content-type', "application/" + json_type + ";charset=utf-8");
		}

		message = json_fnc(message) || '';
	}

	cache = this.headers['cache-control'] || this.headers['pragma'];

	// Only generate etags when caching is enabled locally & on the browser
	if (alchemy.settings.cache !== false && (cache == null || cache != 'no-cache')) {

		// Calculate the hash as etag
		etag = Object.checksum(message);

		if (this.headers['if-none-match'] == etag) {
			return this.notModified();
		}

		// Responses through `end` should always be privately cached
		this.setHeader('cache-control', 'private');

		// Send the hash as a response header
		this.setHeader('etag', etag);
	}

	// No need to replace anything if debugging is disabled or the  log is empty
	if (alchemy.settings.debug && this.debuglog && this.debuglog.length) {
		temp = JSON.dry(this.debuglog);
		message = message.replace(/{"_placeholder_":"debuglog"}/g, temp);
		message = message.replace(/{\\"_placeholder_\\":\\"debuglog\\"}/g, JSON.stringify(temp).slice(1,-1));
	}

	// Compress the output if the client accepts it
	if (alchemy.settings.compression && this.accepts('gzip')) {

		// Set the gzip header
		this.setHeader('content-encoding', 'gzip');

		// Make sure proxy servers only cache this under this content-encoding type
		this.setHeader('vary', 'accept-encoding');

		zlib.gzip(message, function gotZipped(err, zipped) {
			that._end(zipped, 'utf-8');
		});

		return;
	}

	this._end(message, 'utf-8');
});

/**
 * Call the actual end method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 */
Conduit.setMethod(function _end(message, encoding = 'utf-8') {

	var headers = [],
	    value,
	    key;

	for (key in this.response_headers) {
		value = this.response_headers[key];
		this.response.setHeader(key, value);
	}

	if (this.newCookieHeader.length) {
		this.response.setHeader('set-cookie', this.newCookieHeader);
	}

	// Write the actual headers
	this.response.writeHead(this.status);

	if (arguments.length === 0) {
		return this.response.end();
	}

	// End the response
	return this.response.end(message, encoding);
});

/**
 * Send a response to the client
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Conduit.setMethod(function send(content) {
	return this.end(content);
});

/**
 * Create the scene id (if it doesn't exist already)
 * We do this using cookies, so the HTML response can be cached
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.2
 */
Conduit.setMethod(function createScene() {

	var scene_id;

	// Ajax requests will already have a scene
	if (this.ajax || this.sceneId) {
		return this.sceneId;
	}

	// Generate the scene_id
	scene_id = Crypto.randomHex(8) || Crypto.pseudoHex(8);

	// Store it in this conduit
	this.sceneId = scene_id;

	// Tell the session this scene can be expected
	this.getSession().expectScene(scene_id);

	// Set the sceneid cookie
	this.cookie('scene_start_' + ~~(Math.random()*1000), {

		// The time this scene has started
		start: Date.now(),

		// The id of the scene
		id: scene_id
	}, {
		// Cookie should only be visible on this path
		path: this.url.pathname,

		// Cookie should not live for more than 15 seconds
		maxAge: 1000 * 15
	});

	return this.sceneId;
});

/**
 * Render a view and send it to the client
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 */
Conduit.setMethod(function render(templateName, options, callback) {

	var that = this,
	    templates = [];

	if (typeof options == 'function') {
		callback = options;
		options = {};
	} else if (options == null) {
		options = {};
	}

	if (templateName) {
		templates.push(templateName);
	} else {
		templates.push(this.view);
	}

	this.response.statusCode = this.status;
	templates.push('error/404');

	// Expose the useragent info to the hawkejs renderer
	this.internal('useragent', this.useragent);

	this.createScene();

	// Pass along the clientRender property,
	// can be used to force rendering HTML
	if (options.clientRender != null) {
		this.viewRender.clientRender = options.clientRender;
	}

	this.viewRender.beginRender(templates, function afterRender(err, html) {

		var mimetype;

		if (err != null) {

			if (callback) {
				return callback(err);
			}

			throw err;
		}

		that.registerBindings();

		if (typeof html !== 'string') {

			// Stringify using json-dry
			html = JSON.dry(html);

			// Tell the client to expect a json-dry response
			mimetype = 'application/json-dry';
		} else {
			mimetype = 'text/html';
		}

		// Only send the mimetype if it hasn't been set yet
		if (that.setHeader('content-type') == null) {
			that.setHeader('content-type', mimetype + ";charset=utf-8");
		}

		if (callback) {
			return callback(null, html);
		}

		that.end(html);
	});
});

/**
 * Send a file to the browser.
 * Uses cache-control by default.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.3.0
 *
 * @param    {String}   path      The path on the server to send to the browser
 * @param    {Object}   options   Options, including headers
 */
Conduit.setMethod(function serveFile(path, options) {

	var that = this,
	    tasks = [],
	    stats,
	    isStream;

	// Create an options object if it doesn't exist yet
	if (options == null) {
		options = {};
	}

	// Error handling function
	if (!options.onError) {
		options.onError = function onError(err) {
			that.notFound(err);
		};
	}

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
		stats = fileCache[path];

		if (stats == null) {
			stats = {
				path: path
			};
		}
	}

	// Don't check for file information when it's a stream
	if (!isStream) {

		if (!stats.path) {
			return options.onError(new Error('No file to serve'));
		}

		// Make sure the stats object is in the cache
		if (fileCache[stats.path] == null) {
			fileCache[stats.path] = stats;
		}

		// Get file stats if it isn't available yet
		if (stats.mtime == null) {
			tasks.push(function getFileStats(next) {

				fs.stat(stats.path, function gotStats(err, fileStats) {

					if (err) {
						stats.err = err;
						stats.mtime = new Date();
					} else {
						Object.assign(stats, fileStats);
					}

					next();
				});
			});
		}

		// Get the mimetype if it isn't available yet
		if (stats.mimetype == null) {
			tasks.push(function getMimetype(next) {

				// Don't use libmime if it isn't loaded,
				// that could be the case on NW.js
				if (!libmime) {
					return next();
				}

				// Lookup the mimetype by the extension alone
				stats.mimetype = libmime.lookup(stats.path);

				// Return the result if a valid mimetype was found
				if (stats.mimetype !== 'application/octet-stream') {
					return next();
				}

				// "magic" currently doesn't work in nw.js
				if (Blast.isNW) {
					return next();
				}

				// Don't try to use magic if it's not loaded
				if (!getMagic()) {
					return next();
				}

				// Look inside the data (using "magic") for a better mimetype
				magic.detectFile(stats.path, function detectedMimetype(err, result) {

					if (!err) {
						stats.mimetype = result;
					}

					next();
				});
			});
		}
	}

	Function.parallel(tasks, function gotFileInfo(err) {

		var disposition,
		    outStream,
		    mimetype,
		    headers,
		    isText,
		    since,
		    key;

		if (err) {
			return that.error(err);
		}

		if (stats.err) {
			return options.onError(stats.err);
		}

		if (!isStream && !stats.path) {
			return options.onError(new Error('File not found'));
		}

		// Check the if-modified-since header if it's supplied
		if (alchemy.settings.cache !== false && that.headers['if-modified-since'] != null) {

			// Turn the string into a date
			since = new Date(that.headers['if-modified-since']);

			// If the file's modifytime is smaller or equal to the since time,
			// don't serve the contents!
			if (stats.mtime <= since) {
				return that.notModified();
			}
		}

		mimetype = stats.mimetype;

		// If we get a general mimetype, and an alternative is provided, use that one
		if (mimetype === 'application/octet-stream') {
			if (options.mimetype != null) {
				mimetype = options.mimetype;
			}
		}

		isText = /svg|xml|javascript|text/.test(mimetype);

		// Serve text files as utf-8
		if (isText) {
			mimetype += '; charset=utf-8';
		}

		that.setHeader('content-type', mimetype);

		// Setting the disposition makes the browser download the file
		// This is on by default, but can be disabled
		if (options.disposition !== false) {
			if (options.filename) {
				disposition = 'attachment; filename=' + JSON.stringify(options.filename);
			} else {
				disposition = 'attachment';
			}

			that.setHeader('content-disposition', disposition);
		}

		if (stats.mtime) {
			// Allow the browser to cache this for 60 minutes,
			// after which it has to revalidate the content
			// by seeing if it has been modified
			that.setHeader('cache-control', 'public, max-age=3600, must-revalidate');
			that.setHeader('last-modified', stats.mtime.toGMTString());
		}

		for (key in options.headers) {
			that.setHeader(key, options.headers[key]);
		}

		if (isStream) {
			outStream = path;
		} else {
			outStream = fs.createReadStream(path, {bufferSize: 64*1024});

			// Listen for file errors
			outStream.on('error', options.onError);
		}

		// Compress text responses
		if (isText && alchemy.settings.compression && that.accepts('gzip')) {

			// Set the gzip header
			that.setHeader('content-encoding', 'gzip');
			that.setHeader('vary', 'accept-encoding');

			// Create the gzip stream
			outStream = outStream.pipe(zlib.createGzip());
		}

		// If we received a stream as parameter...
		if (isStream) {
			that.response.on('end', cleanup);
			that.response.on('finish', cleanup);
			that.response.on('error', cleanup);
			that.response.on('close', cleanup);
		}

		function cleanup() {
			console.log('Client has closed, cleaning up', outStream);

			// Remove all pipes
			outStream.unpipe();

			if (outStream.destroy) {
				outStream.destroy();
			} else if (outStream.end) {
				outStream.end();
			}
		}

		// Send the headers
		for (key in that.response_headers) {
			that.response.setHeader(key, that.response_headers[key]);
		}

		if (that.newCookieHeader.length) {
			that.response.setHeader('set-cookie', that.newCookieHeader);
		}

		that.response.statusCode = 200;

		// Stream the file to the client
		outStream.pipe(that.response);
	});
});

/**
 * Create a session
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.2
 *
 * @param    {Boolean}   create   Create a session if none exist
 *
 * @return   {UserSession}
 */
Conduit.setMethod(function getSession(allow_create = true) {

	var cookie_name,
	    session_id,
	    session;

	// Only do this once per request
	if (this.sessionData != null) {
		return this.sessionData;
	}

	// Set the name of the cookie (could change in the future)
	cookie_name = alchemy.settings.session_key;

	// Get the ID of the session
	session_id = this.cookie(cookie_name);

	if (session_id) {
		// Get the session
		session = alchemy.sessions.get(session_id);
	}

	// If no valid session exists, create a new one
	if (!session && allow_create) {
		session = new Classes.Alchemy.ClientSession();
		session_id = session.id;

		this.cookie(cookie_name, session_id, {httpOnly: true});

		alchemy.sessions.set(session_id, session);

		alchemy.sessions.on(session_id+':removed', function removed(expired) {
			session.removed(expired);
		});
	}

	if (session) {
		this.sessionData = session;
	} else {
		return false;
	}

	return session;
});

/**
 * Register live data bindings via websockets
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 */
Conduit.setMethod(function registerBindings(arr) {

	var data_ids;

	// Don't do anything is websockets aren't enabled
	if (!alchemy.settings.websockets) {
		return;
	}

	if (arr) {
		data_ids = arr;
	} else {
		data_ids = this.viewRender.live_bindings;
	}

	if (Object.isEmpty(data_ids)) {
		return;
	}

	this.getSession().registerBindings(data_ids, this.sceneId);
});

/**
 * Get a parameter from the route, post or get query or cookie
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.3
 *
 * @param    {String}   name
 * @param    {Mixed}    value   Overrides the value if set
 */
Conduit.setMethod(function param(name, value) {

	var length = arguments.length;

	if (length == 0) {
		return Object.assign({}, this.params, this.url.query, this.body);
	} else if (length == 2) {
		if (!this.param_overrides) {
			this.param_overrides = {};
		}

		this.param_overrides[name] = value;
		return;
	}

	if (this.param_overrides && this.param_overrides[name] != null) {
		return this.param_overrides[name];
	}

	if (this.body && this.body[name] != null) {
		return this.body[name];
	}

	if (this.url && this.url.query && this.url.query[name] != null) {
		return this.url.query[name];
	}

	if (this.params && this.params[name] != null) {
		return this.params[name];
	}

	return this.cookie(name);
});

/**
 * Get a a value from the session object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 *
 * @return   {Mixed}
 */
Conduit.setMethod(function session(name, value) {

	this.getSession();

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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 */
Conduit.setMethod(function routeParam(name) {
	return this.params[name];
});

/**
 * Get/set a cookie
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.2
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 * @param    {Object}   options
 */
Conduit.setMethod(function cookie(name, value, options) {

	var header,
	    arr,
	    key;

	// Return if cookies are disabled
	if (!alchemy.settings.cookies) {
		return;
	}

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

	// If the `secure` flag is not set,
	// see if this connection is secure
	if (options.secure == null) {
		if (this.is_secure) {
			options.secure = true;
		}
	}

	// Store it in the newCookies object, for quick access
	this.newCookies[name] = value;

	if (this.websocket) {
		return this.socket.emit('alchemy-set-cookie', {name: name, value: value, options: options});
	}

	// Create the basic header string
	header = String.encodeCookie(name, value, options);

	// Add this to the cookieheader array
	this.newCookieHeader.push(header);
});

/**
 * Set a response header
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Conduit.setMethod(function setHeader(name, value) {

	if (arguments.length == 1) {

		if (this.response_headers[name] != null) {
			return this.response_headers[name];
		}

		return this.response.getHeader(name);
	}

	if (this.websocket) {
		throw new Error("Can't set a header on a websocket connection");
	}

	this.response_headers[name] = value;
});

/**
 * Update data to this scene only
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Conduit.setMethod(function update(name, value) {

	// Make sure a scene id is created
	this.createScene();

	// Send this update to this scene only
	this.getSession().sendDataUpdate(name, value, this.sceneId);
});

/**
 * Set a variable for ViewRender
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
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
 * Push a flash message to the client
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Conduit.setMethod(function flash(message, options) {

	var newFlashes;

	if (options == null) {
		options = {};
	}

	newFlashes = this.internal('newFlashes');

	if (newFlashes == null) {
		newFlashes = {};
	}

	newFlashes[Date.now() + '-' + Number.random(100)] = {
		message: message,
		options: options
	};

	this.internal('newFlashes', newFlashes);
});

/**
 * Set a theme to use
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 */
Conduit.setMethod(function setTheme(name) {
	this.theme = name;
	this.viewRender.setTheme(name);
});

/**
 * Broadcast data to every connected user
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.4.0
 *
 * @param    {String}   type
 * @param    {Object}   data
 */
Alchemy.setMethod(function broadcast(type, data) {
	alchemy.sessions.forEach(function eachSession(key, session) {
		// Go over every listening scene and submit the data
		Object.each(session.connections, function eachScene(scene, scene_id) {

			if (!scene) {
				return;
			}

			scene.submit(type, data);
		});
	});
});

/**
 * Get the magic mimetype function
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
function getMagic() {

	var mmmagic;

	if (magic || magic === false) {
		return magic;
	}

	// Get mmmagic module
	mmmagic = alchemy.use('mmmagic')

	if (mmmagic) {
		magic = new mmmagic.Magic(mmmagic.MAGIC_MIME_TYPE);
	} else {
		log.error('Could not load mmmagic module');
		magic = false;
	}

	return magic;
}

global.Conduit = Conduit;
