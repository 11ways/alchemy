const FILECACHE = alchemy.getCache('served_files'),
      RX_TEXT = /svg|xml|javascript|text/i;

var libstream  = alchemy.use('stream'),
    libpath = alchemy.use('path'),
    libua   = alchemy.use('useragent'),
    zlib    = alchemy.use('zlib'),
    BODY    = Symbol('body'),
	TESTED_ROUTES = Symbol('tested_routes'),
    magic,
    fs = alchemy.use('fs'),
    prefixes = alchemy.shared('Routing.prefixes');

/**
 * The Conduit Class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.2.0
 *
 * @param    {IncomingMessage}   req
 * @param    {ServerResponse}    res
 * @param    {Router}            router
 */
var Conduit = Function.inherits('Alchemy.Base', 'Alchemy.Conduit', function Conduit(req, res, router) {

	// Store the starting time
	this.start = new Date();

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
	this.new_cookies = {};
	this.new_cookie_header = [];

	// The headers to send
	this.response_headers = {};

	// Where the body will go
	this.body = {};

	// Where the files will go
	this.files = {};

	this.initValues();
	this.setReqRes(req, res);
});

/**
 * Deprecated property names
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 */
Conduit.setDeprecatedProperty('originalPath',    'original_path');
Conduit.setDeprecatedProperty('newCookies',      'new_cookies');
Conduit.setDeprecatedProperty('newCookieHeader', 'new_cookie_header');
Conduit.setDeprecatedProperty('viewRender',      'renderer');
Conduit.setDeprecatedProperty('view_render',     'renderer');
Conduit.setDeprecatedProperty('sceneId',         'scene_id');

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
 * Create a Hawkejs Renderer
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.5
 */
Conduit.prepareProperty(function renderer() {

	let result;

	if (this.parent && this.parent != this && this.parent.renderer) {
		result = this.parent.renderer.createSubRenderer();
	} else {
		result = alchemy.hawkejs.createRenderer();
	}

	return result;
});

/**
 * Get the SessionScene instance
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 */
Conduit.setProperty(function scene() {
	return this.getSession().getScene(this.scene_id);
});

/**
 * Enforce the scene_id
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.3.10
 */
Conduit.enforceProperty(function scene_id(new_value, old_value) {

	if (!new_value) {
		new_value = this.headers['x-scene-id'] || this.expose('scene_id');

		// If there also was no old value, create a new scene
		if (!new_value && old_value == null) {
			// Generate the scene_id
			new_value = Crypto.randomHex(8) || Crypto.pseudoHex(8);

			// Tell the session this scene can be expected
			this.getSession().expectScene(new_value, this);

			let path = this.request?.url;

			// Set the sceneid cookie
			this.cookie('scene_start_' + ~~(Math.random()*1000), {

				// The time this scene has started
				start: Date.now(),

				// The id of the scene
				id: new_value
			}, {
				// Cookie should only be visible on this path
				path: path,

				// Cookie should not live for more than 15 seconds
				maxAge: 1000 * 15
			});
		}
	}

	this.expose('scene_id', new_value);

	return new_value;
});

/**
 * Enforce the active_prefix
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.5
 */
Conduit.enforceProperty(function active_prefix(new_value, old_value) {

	if (!new_value) {
		this.renderer.language = null;
		return null;
	}

	if (new_value == old_value) {
		return new_value;
	}

	// Set the active prefix
	this.internal('active_prefix', new_value);
	this.expose('active_prefix', new_value);

	if (this.locales[0] != new_value) {
		this.locales.unshift(new_value);
	}

	// Set the translate options for use in hawkejs
	this.internal('locales', this.locales);
	this.expose('locales', this.locales);

	let config = Prefix.get(new_value);

	if (config) {
		this.renderer.language = config.locale;
	}

	return new_value;
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
 * @version  1.0.2
 */
Conduit.setProperty(function is_secure() {

	var protocol;

	if (alchemy.settings.assume_https) {
		return true;
	}

	if (this.headers && this.headers['x-forwarded-proto'] == 'https') {
		return true;
	}

	if (this.url && this.url.protocol == 'https:') {
		return true;
	}

	if (this.protocol && this.protocol.startsWith('https')) {
		return true;
	}

	if (this.encrypted == true) {
		return true;
	}

	return false;
});

/**
 * Set the request body
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object}
 */
Conduit.setMethod(function setRequestBody(body) {

	if (!body) {
		return;
	}

	Object.assign(this.body, body);
});

/**
 * Has the given route been tested yet?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.5
 * @version  1.2.5
 *
 * @param    {Route}
 */
Conduit.setMethod(function hasRouteBeenTested(route) {

	if (!route || !this[TESTED_ROUTES]) {
		return false;
	}

	return this[TESTED_ROUTES].has(route);
});

/**
 * Mark this route as having been tested
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.5
 * @version  1.2.5
 *
 * @param    {Route}
 */
Conduit.setMethod(function markRouteAsTested(route) {

	if (!this[TESTED_ROUTES]) {
		this[TESTED_ROUTES] = new Set();
	}

	this[TESTED_ROUTES].add(route);
});

/**
 * Rewrite a certain URL parameter
 * (Causing some kind of redirect)
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.5
 * @version  1.2.5
 *
 * @param    {String}   route_param
 * @param    {*}        new_value
 */
Conduit.setMethod(function rewriteRequestRouteParam(route_param, new_value) {

	if (!this.rewritten_request_route_param) {
		this.rewritten_request_route_param = {};
	}

	this.rewritten_request_route_param[route_param] = new_value;
});

/**
 * Set the request files
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object}
 */
Conduit.setMethod(function setRequestFiles(files) {

	if (!files) {
		return;
	}

	_setRequestFiles(this, files, this.files);
});

/**
 * Set the request files
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.0
 * @version  1.3.0
 *
 * @param    {Conduit}   conduit
 * @param    {Array}     files
 * @param    {Object}    target
 */
function _setRequestFiles(conduit, files, target) {

	let context,
	    upload,
	    entry,
	    key;

	for (key in files) {
		entry = files[key];

		if (Array.isArray(entry)) {
			context = target[key];

			if (!context) {
				context = target[key] = {};
			}

			_setRequestFiles(conduit, entry, context);
		} else {
			target[key] = Classes.Alchemy.Inode.File.fromUntrusted(entry);
		}
	}
}

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
 * Set the request & response objects
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.0
 * @version  1.2.0
 */
Conduit.setMethod(function setReqRes(req, res) {

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
});

/**
 * Init values
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.3
 * @version  1.3.15
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

	// The original string parameters
	this.route_string_parameters = null;

	// The section vhost domain
	this.sectionDomain = null;

	// The section of the used route
	this.section = null;

	// The parsed path (including querystring)
	this.url = null

	// The current active theme
	this.theme = null;

	// Make sure the tested routes are reset
	this[TESTED_ROUTES] = null;
});

/**
 * Get the time since the conduit was made
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
Conduit.setMethod(function time() {
	return Date.now() - this.start;
});

/**
 * Parse the request, get information from the url
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.2.5
 *
 * @param    {IncomingMessage}   req
 * @param    {ServerResponse}    res
 */
Conduit.setMethod(async function parseRequest() {

	var protocol,
	    section;

	if (this.method == null && this.request && this.request.method) {
		this.method = this.request.method.toLowerCase();
	}

	this.parseShortcuts();
	this.parseLanguages();
	this.parsePrefix();
	this.parseSection();

	// Try getting the route
	await this.parseRoute();

	if (this.halt_request) {
		return false;
	}

	// Is this encrypted?
	if (this.encrypted == null) {
		this.encrypted = this.request.connection.encrypted;
	}

	if (this.rewritten_request_route_param) {
		let params = Object.assign({}, this.route_string_parameters, this.rewritten_request_route_param);
		let new_url = this.route.generateUrl(params, this);
		this.overrideResponseUrl(new_url);
	}

	// If the url has already been parsed, return early
	if (this.url) {
		return;
	}

	if (alchemy.settings.assume_https) {
		protocol = 'https://';
	} else if (this.headers['x-forwarded-proto']) {
		protocol = this.headers['x-forwarded-proto'];
	} else if (this.protocol) {
		protocol = this.protocol;
	} else if (this.encrypted) {
		protocol = 'https://';
	} else {
		protocol = 'http://';
	}

	// Create a new RURL instance
	this.url = new RURL();

	// Set the protocol
	this.url.protocol = protocol;

	// Set the host
	this.url.hostname = this.headers.host;

	let path = this.path;

	if (this.prefix) {
		path = '/' + this.prefix + '/' + path;
	}

	this.url.path = path;

	return true;
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
 * @version  1.1.3
 *
 * @param    {Object}   args
 * @param    {Function} callback
 *
 * @return   {Alchemy.LoopbackConduit}
 */
Conduit.setMethod(function loopback(args, callback) {
	return Classes.Alchemy.Conduit.Loopback.create(this, args, callback);
});

/**
 * Parse the request, get information from the url
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
Conduit.setMethod(function parsePrefix() {

	let path = this.original_path;

	if (!path) {
		return;
	}

	let active_prefix,
	    prefix,
		begin;

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

			if (this.original_pathname == begin) {
				this.prefix = prefix;
				break;
			}
		}

		if (this.prefix && path.endsWith('/' + this.prefix)) {
			this.path = '/';
		} else if (this.prefix && path.startsWith('/' + this.prefix + '?')) {
			this.path = '/?' + path.after('?');
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

		// Remember this prefix in the session
		this.session('last_forced_prefix', this.prefix);

		// Let the client know this prefix should be used
		this.expose('forced_prefix', this.prefix);
	} else {

		let last_forced_prefix = this.session('last_forced_prefix');

		if (last_forced_prefix) {
			active_prefix = last_forced_prefix;
		} else if (this.active_prefix) {
			// There already is an active prefix, so just keep on using that
			// (Is the case in redirects)
			return;
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
	}

	this.active_prefix = active_prefix;
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
		this.sectionPath = this.path.slice(this.section.mount.length) || '/';
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
 * @version  1.3.0
 *
 * @param    {Route}   after_route   Only check routes after this one
 *
 * @return   {Boolean}   Continue processing this request or not?
 */
Conduit.setMethod(async function parseRoute(after_route) {

	var temp;

	this.section = this.router.getPathSection(this.path);

	// Remove the current found route
	if (after_route) {
		this.route_rematch = true;
		this.route = null;
	}

	// If the route hasn't been found in the header shortcuts yet, look for it
	if (!this.route) {

		temp = this.router.getRouteBySectionPath(this, this.method, this.section, this.sectionPath, this.prefix, after_route);

		if (temp && temp.then) {
			temp = await temp;
		}

		if (temp) {
			this.route = temp.route;
			this.setRouteParameters(temp.parameters);
			this.route_string_parameters = temp.original_parameters;
			this.path_definition = temp.definition;
		} else {
			// Is this a HEAD request? Then we need to check if a GET exists
			if (this.method == 'head') {
				let get_route = this.router.getRouteBySectionPath(this, 'get', this.section, this.sectionPath, this.prefix, after_route);

				if (get_route && get_route.then) {
					get_route = await get_route;
				}

				// A GET route was found, so we just need to end this request
				if (get_route) {
					this.end();
					this.halt_request = true;
					return;
				}
			} else {
				// See if the path matches another method
				temp = await this.router.getRouteBySectionPath(this, ['get', 'post', 'put'], this.section, this.sectionPath, this.prefix, after_route);

				if (temp) {
					this.route_mismatch = temp.route;

					temp = null;
				}
			}

			this.route_not_found = true;
		}
	} else {
		temp = this.route.match(this, this.method, this.sectionPath);

		if (temp && temp.then) {
			temp = await temp;
		}

		if (temp) {
			this.setRouteParameters(temp.parameters);
			this.route_string_parameters = temp.original_parameters || {};
			this.path_definition = temp.definition;
		} else {
			this.setRouteParameters();
		}
	}
});

/**
 * Run the middleware
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.5
 */
Conduit.setMethod(async function callMiddleware() {

	if (!this.section) {
		return this.callHandler();
	}

	let that = this,
	    middlewares = await this.section.getMiddleware(this, this.section, this.path, this.prefix),
	    debugObject = this._debugObject,
	    middleDebug = this.debug({label: 'middleware', data: {title: 'Doing middleware'}}),
	    routeDebug,
	    theme;

	if (middleDebug) {
		this._debugObject = middleDebug;
	}

	middlewares = new Iterator(middlewares);

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
 * @version  1.1.1
 */
Conduit.setMethod(function prepareViewRender() {

	// Add a link to this conduit
	this.renderer.conduit = this;
	this.renderer.server_var('conduit', this);

	// Let the ViewRender get some request info
	this.renderer.prepare(this.request, this);

	// Pass url parameters to the client
	this.renderer.internal('urlparams', this.route_string_parameters);
	this.renderer.internal('url', this.url);

	if (this.route) {
		this.renderer.internal('route', this.route.name);
	}

	this.renderer.is_for_client_side = this.ajax;
});

/**
 * Call the handler of this route when parsing is finished
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.7
 */
Conduit.setMethod(function callHandler() {

	if (!this.route) {

		if (this.route_mismatch) {

			if (alchemy.settings.debug) {
				console.log('Route method not allowed:', this);
			}

			this.error(405, 'Method Not Allowed', false);

		} else {
			if (alchemy.settings.debug) {
				console.log('Route not found:', this);
			}

			this.notFound('Route was not found');
		}

		return;
	}

	this.route.callHandler(this);
});

/**
 * Put this request in a queue
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @param    {Object}   options   Options or url
 */
Conduit.setMethod(function postponeAndQueue(options) {

	if (!options) {
		options = {};
	}

	const postponement = this.postponeRequest({
		put_in_queue : true,
	});

	return postponement;
});

/**
 * Postpone the response and the request
 *
 * This does not stop the current request from processing.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @param    {Number|Object}   options   Options or time to wait
 *
 * @return   {Alchemy.Conduit.Postponement}
 */
Conduit.setMethod(function postponeRequest(options) {

	let postponement = this.postponeResponse(options);

	this.afterOnce('get-postponed-response', () => {
		this.callMiddleware();
	});

	return postponement;
});

/**
 * End the current request with a 202 status
 * and tell the client to look at another url later.
 *
 * This does not stop the current request from processing.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.3.1
 *
 * @param    {Number|Object}   options   Options or time to wait
 *
 * @return   {Alchemy.Conduit.Postponement}
 */
Conduit.setMethod(function postponeResponse(options) {

	if (typeof options == 'number') {
		options = {
			expected_duration: options
		};
	} else if (!options) {
		options = {};
	}

	return this._postpone(options);
});

/**
 * Handle the postponement
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @param    {Object}   options
 *
 * @return   {Alchemy.Conduit.Postponement}
 */
Conduit.setMethod(function _postpone(options) {

	let session = this.getSession();

	let postponement = session.getExistingPostponement(this);

	if (postponement) {
		return postponement.showPostponementMessage(this);
	}

	let response = this.response;

	this.postponed_response = response;

	// Make sure the scene id exists
	this.createScene();

	postponement = session.postpone(this, options);

	if (options.put_in_queue) {
		postponement.putInQueue();
	}

	if (options.show_postponement_message !== false) {
		postponement.showPostponementMessage();
	}

	// Nullify the response
	this.response = null;

	// Set the original url
	this.overrideResponseUrl(this.url);

	// Return the postponement
	return postponement;
});

/**
 * Set the response url
 *
 * @deprecated   Use {@link #setResponseUrl} instead
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.2.5
 * @version  1.3.0
 *
 * @param    {String|RURL}   url
 */
Conduit.setMethod(function overrideResponseUrl(url) {
	return this.setResponseUrl(url);
});

/**
 * Set the response url
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {String|RURL|Boolean}   new_url
 */
Conduit.setMethod(function setResponseUrl(new_url) {

	if (new_url == null) {
		return;
	}

	if (!new_url) {
		this.renderer.history = false;
		return;
	} else {
		this.renderer.history = true;
	}

	if (typeof new_url != 'string') {
		new_url = String(new_url);
	}

	this.setHeader('x-history-url', new_url);
	this.expose('redirected_to', new_url);
});

/**
 * Redirect to another url
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.6
 *
 * @param    {Number}          status    3xx redirection codes. 302 (temporary redirect) by default
 * @param    {String|Object}   options   Options or url
 */
Conduit.setMethod(function redirect(status, options) {

	let hard_refresh = false,
	    url;

	if (typeof status != 'number') {

		if (typeof options == 'object') {
			options.url = status;
		} else {
			options = status;
		}

		status = 302;
	}

	if (typeof options == 'object' && options) {

		if (options.href || options.path) {
			url = options.href || options.path;
		} else {

			if (options.body) {
				Object.defineProperty(this, 'body', {
					value        : options.body,
					configurable : true
				});
			}

			if (options.method) {
				this.method = options.method;
			}

			// When headers are given, the redirect is internal
			if (options.headers) {
				this.headers = options.headers;

				this.oldoriginal_path = this.original_path;

				if (typeof options.url == 'string') {
					let temp = options.url;
					temp = RURL.parse(temp);
					url = temp.path;
				} else {
					url = options.url.path;
				}

				if (url == null) {
					throw new Error('Conduit#redirect can not redirect to null path');
				}

				// Register the new url as the one to use for the history
				this.overrideResponseUrl(url);

				this.original_path = url;

				// Reinitialize the conduit
				this.initValues();
				this.initHttp();

				return;
			} else {
				url = options.url;
			}
		}

		if (options.hard_refresh) {
			hard_refresh = options.hard_refresh;
		}

	} else if (typeof options == 'string') {
		url = options;
		options = null;
	} else {
		throw new Error('Conduit#redirect requires a valid url or options object');
	}

	this.status = status;

	// Make sure the url is an internal one if no hard refresh is requested
	if (!hard_refresh && alchemy.settings.url) {
		let rurl = RURL.parse(url);

		// If an explicit hostname is set, this might be an external url
		if (rurl.hostname) {
			let base_url = RURL.parse(alchemy.settings.url);

			if (base_url.hostname != rurl.hostname) {
				hard_refresh = true;
			}
		}
	}

	if (hard_refresh && this.headers['x-hawkejs-request']) {
		this.setHeader('x-hawkejs-navigate', url);

		if (options && options.popup) {
			this.setHeader('x-hawkejs-popup', options.popup);
		}

	} else {
		this.setHeader('Location', url);
	}

	this._end();
});

/**
 * Respond with an error
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.4
 *
 * @param    {Nulber}  status       Response statuscode
 * @param    {Error}   message      Optional error to send
 * @param    {Boolean} print_error  Print the error, defaults to true
 */
Conduit.setMethod(function error(status, message, print_error) {

	let print_dev = false;

	if (status instanceof Classes.Alchemy.Error.HTTP) {
		message = status;
		status = message.status;
	}

	if (typeof status !== 'number') {
		message = status;
		status = 500;
	}

	if (!message) {
		message = 'Unknown server error';
	}

	if (typeof message == 'string') {
		let error = new Classes.Alchemy.Error.HTTP(status, message);
		error[Symbol.for('extra_skip_levels')] = 1;
		message = error;
	}

	let is_400 = (status >= 400 && status <= 500);

	if (alchemy.settings.environment == 'dev') {
		print_dev = true;
	}

	if (print_error == null) {
		if (is_400) {
			print_error = false;
		} else {
			print_error = true;
		}
	}

	if (print_dev) {
		let subject = 'Error found on ' + this.original_path + '';
		log.error(subject, message, this);
	} else if (print_error) {
		let subject = 'Error found on ' + this.original_path + '';

		if (is_400) {
			log.error(subject + ':\n' + message);
		} else if (message instanceof Error) {
			alchemy.printLog('error', [subject, String(message), message], {err: message, level: -2});
		} else {
			log.error(subject + ':\n' + message);
		}
	}

	// Make sure the client doesn't expect compression
	this.setHeader('content-encoding', '');

	this.status = status;

	// Only render an expensive "Error" template when the client directly
	// browses to an HTML page.
	// Don't render a template for AJAX or asset requests
	if (this.renderer && (this.ajax || (this.headers.accept && this.headers.accept.indexOf('html') > -1))) {

		// Hawkejs will have the option to throw the error OR render the error
		if (this.ajax) {
			this.end({
				error           : true,
				status          : status,
				message         : message,
				error_templates : ['error/' + status, 'error/unknown'],
			});
		} else {
			this.set('status', status);
			this.set('message', message);

			if (alchemy.isTooBusyForRequests()) {
				this._end(`Error ${status}:\n${message}`);
			} else {
				this.render(['error/' + status, 'error/unknown']);
			}
		}
	} else {
		// Requests for images or scripts just get a non-expensive string response
		this.setHeader('content-type', 'text/plain');
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
 * @version  1.1.0
 *
 * @param    {Number}  status
 * @param    {Error}   message   optional error to send
 */
Conduit.setMethod(function deny(status, message) {

	if (typeof status == 'string') {
		message = status;
		status = 403;
	} else if (status instanceof Classes.Alchemy.Error.HTTP) {
		return this.error(status);
	}

	if (message == null) {
		message = 'Forbidden';
	}

	this.error(status, message);
});

/**
 * The current user is not authorized and needs to log in
 * (Default implementation, is overriden by the acl plugin)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {Boolean}   tried_auth   Indicate that this was an auth attempt
 */
Conduit.setMethod(function notAuthorized(tried_auth) {
	return this.deny();
});

/**
 * The current user is authenticated, but not allowed
 * (Default implementation, is overriden by the acl plugin)
 *
 * @author        Jelle De Loecker   <jelle@elevenways.be>
 * @since         1.0.7
 * @version       1.1.0
 */
Conduit.setMethod(function forbidden() {

	let error = new Classes.Alchemy.Error.HTTP(403, 'Forbidden');
	error.skipTraceLines(1);

	return this.deny(error);
});

/**
 * Respond with a not found error status
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Error}   message   optional error to send
 */
Conduit.setMethod(async function notFound(message) {

	// Look for other paths
	if (!this.route_not_found && this.route && !this.route_rematch) {

		// Try matching against paths after the ones we currently matched
		await this.parseRoute(this.route);

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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.0
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

	if (this.method == 'head') {
		return this._end();
	}

	if (typeof message !== 'string') {

		// Use regular JSON if DRY has been disabled in settings
		if (alchemy.settings.json_dry_response === false || this.json_dry === false) {
			json_type = 'json';
			json_fnc = JSON.stringify;
		} else {
			json_type = 'json-dry';
			json_fnc = JSON.dry;

			// Clone the object
			message = JSON.clone(message, 'toHawkejs');
		}

		// Only send the mimetype if it hasn't been set yet
		if (this.setHeader('content-type') == null) {
			this.setHeader('content-type', "application/" + json_type + ";charset=utf-8");
		}

		message = json_fnc(message) || 'null';
	}

	cache = this.headers['cache-control'] || this.headers['pragma'];

	// Only generate etags when caching is enabled locally & on the browser
	if (alchemy.settings.cache !== false && (cache == null || cache != 'no-cache')) {

		// Calculate the hash as etag
		etag = alchemy.checksum(message);

		if (etag != null) {

			if (this.headers['if-none-match'] == etag) {
				return this.notModified();
			}

			// Responses through `end` should always be privately cached
			this.setHeader('cache-control', 'private');

			// Send the hash as a response header
			this.setHeader('etag', etag);
		}
	}

	// No need to replace anything if debugging is disabled or the  log is empty
	if (alchemy.settings.debug && this.debuglog && this.debuglog.length && message.indexOf('_placeholder_') > -1) {
		temp = JSON.dry(this.debuglog);
		message = message.replace(/{\s*"_placeholder_":\s*"debuglog"\s*}/g, temp);
		message = message.replace(/{\s*\\"_placeholder_\\":\s*\\"debuglog\\"\s*}/g, JSON.stringify(temp).slice(1,-1));
	}

	// Compress the output if the client accepts it,
	// but only if the file is at least 150 bytes
	if (alchemy.settings.compression !== false && message.length > 150 && this.accepts('gzip')) {

		// Set the decompressed content-length for use in progress bars
		this.setHeader('x-decompressed-content-length', Buffer.byteLength(message));

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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.14
 */
Conduit.setMethod(function _end(message, encoding = 'utf-8') {

	this.ended = new Date();

	this.emit('ending');

	if (!this.response) {
		let args = [];

		if (arguments.length) {
			args.push(message);
			args.push(encoding);
		}

		this._end_arguments = args;

		this.emit('after-postponed-end', args);

		return;
	}

	let headers = [],
	    value,
	    key;

	if (this.status) {
		this.response.statusCode = this.status;
	}

	// Set the content-length if it hasn't been set yet
	if (arguments.length > 0 && !this.response_headers['content-length']) {
		this.response_headers['content-length'] = Buffer.byteLength(message);
	}

	for (key in this.response_headers) {
		value = this.response_headers[key];

		if (value == null) {
			continue;
		}

		this.response.setHeader(key, value);
	}

	if (this.new_cookie_header.length) {
		this.response.setHeader('set-cookie', this.new_cookie_header);
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
 * @version  1.1.0
 */
Conduit.setMethod(function createScene() {
	return this.scene_id;
});

/**
 * Render a view and send it to the client
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
Conduit.setMethod(function render(template_name, options, callback) {

	var that = this,
	    templates;

	if (typeof options == 'function') {
		callback = options;
		options = {};
	} else if (options == null) {
		options = {};
	}

	if (template_name) {
		templates = [template_name];
	}

	if (templates) {
		templates.push('error/404');
	}

	// Expose the useragent info to the hawkejs renderer
	this.internal('useragent', this.useragent);

	this.createScene();

	// Pass along the clientRender property,
	// can be used to force rendering HTML
	if (options.clientRender != null) {
		this.renderer.clientRender = options.clientRender;
	}

	if (this.layout) {
		this.renderer.layout = this.layout;
	}

	this.renderer.renderHTML(templates).done(function afterRender(err, html) {

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
 * Convert a buffer into a stream
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Buffer}   buffer
 *
 * @return   {Readable}
 */
function bufferToStream(buffer) {

	const readable_stream = new libstream.Readable({
		read() {
			this.push(buffer);
			this.push(null);
		}
	});

	return readable_stream;
}

/**
 * Send a file to the browser
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.0
 *
 * @param    {String}   path      The path on the server to send to the browser
 * @param    {Object}   options   Options, including headers
 */
Conduit.setTypedMethod([Types.String, Types.Object.optional()], function serveFile(path, options = {}) {

	let file = FILECACHE.get(path);

	if (!file) {
		file = new Classes.Alchemy.Inode.File(path);
	}

	return this.serveFile(file, options);
});

/**
 * Send a file to the browser
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.13
 *
 * @param    {Alchemy.Inode.File}   file      The file to serve
 * @param    {Object}               options   Options, including headers
 */
Conduit.setTypedMethod([Types.Alchemy.Inode.File, Types.Object.optional()], async function serveFile(file, options = {}) {

	if (file.path && !FILECACHE.has(file.path)) {
		FILECACHE.set(file.path, file);
	}

	let stats = await file.getStats();

	if (alchemy.settings.cache && (!options.cache_time && options.cache_time !== false)) {
		options.cache_time = stats.mtime;
	}

	if (options.content_length == null) {
		options.content_length = stats.size;
	}

	if (!options.mimetype) {
		options.mimetype = await file.getMimetype();
	}

	if (!options.filename) {
		options.filename = file.name;
	}
	
	return this.serveFile(file.createReadStream(), options);
});

/**
 * Send a buffer to the client
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {Stream}   buffer    The buffer to send
 * @param    {Object}   options   Options, including headers
 */
Conduit.setTypedMethod([Buffer, Types.Object.optional()], function serveFile(buffer, options = {}) {
	return this.serveFile(bufferToStream(buffer), options);
});

/**
 * Send a stream to the client
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {Stream}   stream    The stream to send
 * @param    {Object}   options   Options, including headers
 */
Conduit.setTypedMethod([Types.Stream, Types.Object.optional()], function serveFile(stream, options = {}) {

	let is_text = false;

	if (options.mimetype && RX_TEXT.test(options.mimetype)) {
		options.mimetype += '; charset=utf-8';
		is_text = true;
	}

	if (alchemy.settings.cache === false) {
		options.cache_time = null;
	}

	if (options.compress == null) {
		options.compress = is_text;
	}

	if (options.compress && (alchemy.settings.compression === false || !this.accepts('gzip'))) {
		options.compress = false;
	}

	if (options.cache_time && !alchemy.settings.cache) {
		options.cache_time = false;
	}

	if (!options.onError) {
		options.onError = err => this.notFound(err);
	}

	return this._sendStream(stream, options);
});

/**
 * Send a stream to the client
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.14
 *
 * @param    {Stream}   stream    The stream to send
 * @param    {Object}   options   Options, including headers
 */
Conduit.setMethod(function _sendStream(stream, options) {

	if (options.cache_time) {
		let modified_since = this.headers['if-modified-since'];

		if (modified_since != null) {
			let since = new Date(modified_since);

			// If the file's modifytime is smaller or equal to the since time,
			// don't serve the contents!
			if (options.cache_time <= since) {
				return this.notModified();
			}
		}

		// Allow the browser to cache this for 60 minutes,
		// after which it has to revalidate the content
		// by seeing if it has been modified
		this.setHeader('cache-control', 'public, max-age=3600, must-revalidate');
		this.setHeader('last-modified', options.cache_time.toGMTString());
	} else {
		this.setHeader('cache-control', 'no-cache');
	}

	let disposition,
	    key;

	if (options.mimetype) {
		this.setHeader('content-type', options.mimetype);
	}

	// Setting the disposition makes the browser download the file
	// This is on by default, but can be disabled
	if (options.disposition == 'inline') {
		disposition = 'inline';

		if (options.filename) {
			disposition += '; filename=' + JSON.stringify(options.filename)
		}

		this.setHeader('content-disposition', disposition);
	} else if (options.disposition !== false) {
		if (options.filename) {
			disposition = 'attachment; filename=' + JSON.stringify(options.filename);
		} else {
			disposition = 'attachment';
		}

		this.setHeader('content-disposition', disposition);
	}

	// Set all the headers
	for (key in options.headers) {
		this.setHeader(key, options.headers[key]);
	}

	// Don't send anything if it's a HEAD request
	if (this.method == 'head') {
		return this.end();
	}

	const response = this.response;
	let out_stream = stream;

	if (options.compress) {
		// Set the gzip header
		this.setHeader('content-encoding', 'gzip');
		this.setHeader('vary', 'accept-encoding');
		this.setHeader('transfer-encoding', 'chunked');
		this.setHeader('content-length', null);

		// Create the gzip stream
		out_stream = out_stream.pipe(zlib.createGzip());
	} else if (options.content_length != null) {
		this.setHeader('content-length', options.content_length);
	}

	if (options.cleanup_stream) {
		const cleanup = function cleanupOriginalStream() {
			// Remove all pipes
			stream.unpipe();

			if (stream.destroy) {
				stream.destroy();
			} else if (stream.end) {
				stream.end();
			}
		};

		response.on('end', cleanup);
		response.on('finish', cleanup);
		response.on('error', cleanup);
		response.on('close', cleanup);
	}

	// Set the response headers
	for (key in this.response_headers) {
		let value = this.response_headers[key];

		if (value == null) {
			continue;
		}

		response.setHeader(key, value);
	}

	if (this.new_cookie_header.length) {
		response.setHeader('set-cookie', this.new_cookie_header);
	}

	// If we got this far, the file has been found!
	response.statusCode = 200;

	// Actually stream the contents to the client
	out_stream.pipe(response);
});

/**
 * Create a session
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.6
 *
 * @param    {Boolean}   create   Create a session if none exist
 *
 * @return   {UserSession}
 */
Conduit.setMethod(function getSession(allow_create = true) {

	// Only do this once per request
	if (this.sessionData != null) {
		return this.sessionData;
	}

	let cookie_name,
	    session_id,
	    session;

	// Set the name of the cookie (could change in the future)
	cookie_name = alchemy.settings.session_key || 'alchemy_sid';

	// Get the ID of the session
	session_id = this.cookie(cookie_name);

	if (session_id) {
		// Get the session
		session = alchemy.sessions.get(session_id);
	}

	// If no valid session exists, create a new one
	if (!session && allow_create) {
		session = new Classes.Alchemy.ClientSession(this);
		session_id = session.id;

		this.cookie(cookie_name, session_id, {httpOnly: true});

		alchemy.sessions.set(session_id, session);
	}

	if (session) {
		this.sessionData = session;
		session.request_count++;
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
		data_ids = this.renderer.live_bindings;
	}

	if (Object.isEmpty(data_ids)) {
		return;
	}

	this.getSession().registerBindings(data_ids, this.sceneId);
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
 * Get a route URL
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.7
 * @version  1.2.7
 *
 * @param    {String}   name
 * @param    {Object}   parameters
 * @param    {Object}   options
 *
 * @return   {String}
 */
Conduit.setMethod(function routeUrl(name, parameters, options) {
	return this.renderer.helpers.Router.routeUrl(name, parameters, options);
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
 * Set route parameters
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 */
Conduit.setMethod(function setRouteParameters(data) {

	if (!this.params) {
		this.params = {};
	}

	if (data) {
		Object.assign(this.params, data);
	}
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
		return this.new_cookies[name] || this.cookies[name];
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

	// Store it in the new_cookies object, for quick access
	this.new_cookies[name] = value;

	if (this.websocket) {
		return this.socket.emit('alchemy-set-cookie', {name: name, value: value, options: options});
	}

	// Create the basic header string
	header = String.encodeCookie(name, value, options);

	// Add this to the cookieheader array
	this.new_cookie_header.push(header);
});

/**
 * Set a response header
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.3.0
 *
 * @param    {String}   name
 * @param    {Mixed}    value
 */
Conduit.setMethod(function setHeader(name, value) {

	if (arguments.length == 1) {
		return this.getHeader(name);
	}

	if (this.websocket) {
		throw new Error("Can't set header `" + name + "` on a websocket connection");
	}

	this.response_headers[name] = value;
});

/**
 * Get a response header
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   name
 */
Conduit.setMethod(function getHeader(name) {

	if (this.response_headers[name] != null) {
		return this.response_headers[name];
	}

	if (this.response) {
		return this.response.getHeader(name);
	}
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
	this.renderer.setTheme(name);
});

/**
 * Does this user support a certain feature?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.4
 * @version  1.0.4
 *
 * @param    {String}   feature
 *
 * @return   {Boolean}
 */
Conduit.setMethod(function supports(feature) {

	if (this.useragent && (feature == 'async' || feature == 'await')) {
		let agent = this.useragent;

		if (agent.family == 'IE') {
			return false;
		}

		if (agent.family == 'Edge' && agent.major < 15) {
			return false;
		}

		// Its actually supported on 10.1, but oh well
		if (agent.family == 'Safari' && agent.major < 11) {
			return false;
		}

		if (agent.family == 'Samsung Internet' && agent.major < 6) {
			return false;
		}

		if (agent.family == 'Opera Mini') {
			return false;
		}
	}

	return null;
});

/**
 * Should this request be delayed because the server is too busy?
 * This performs an early check, the controller might also check this later.
 * This is mainly so we can prevent Server-Side-Renders from happening
 * when the system is already overloaded.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {Boolean}
 */
Conduit.setMethod(function shouldBePostponed() {

	if (!alchemy.settings.postpone_requests_on_overload) {
		return false;
	}

	const route = this.route;

	// If no route is found, it can be allowed.
	// Most of the time this means it's a middleware-request
	// (like stylesheets, images, scripts, ...)
	// But also 404s (This can be delayed later by the controller)
	if (route == null) {
		return false;
	}

	// Some routes can't even be postponed
	if (!route.can_be_postponed) {
		return false;
	}

	// If alchemy isn't even too busy, it's obviously allowed
	if (!alchemy.isTooBusyForRequests()) {
		return false;
	}

	// Some users have the permission to skip postponements
	if (this.hasPermission('alchemy.queue.skip')) {
		return false;
	}

	let session = this.getSession(false);

	if (session) {

		// Do not postpone clients that have already been in the queue
		if (session.hasAlreadyQueued()) {
			return false;
		}

		// Do not postpone clients that have already rendered something
		if (session.render_counter > 0 && session.is_active) {
			return false;
		}
	}

	// AJAX requests are allowed a bit more
	if (this.ajax) {
		return alchemy.isTooBusyForAjax();
	}

	return true;
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

	alchemy.sessions.forEach(function eachSession(session, key) {

		// Go over every listening scene and submit the data
		Object.each(session.connections, function eachScene(scene, scene_id) {

			if (!scene) {
				return;
			}

			if (alchemy.settings.debug) {
				log.debug('Broadcasting', type, {data, scene});
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
