'use strict';

var fs          = alchemy.use('fs'),
    connections = alchemy.shared('Connection.all'),
    prefixes    = alchemy.shared('Routing.prefixes'),
    linkmap     = alchemy.shared('Connection.map'),
    servecache  = {};

// Create the global Connection object
global.Connection = {};

// Create the global Prefix object
global.Prefix = {
	first   : false,
	default : null
};

/**
 * Add a prefix
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.1.0
 *
 * @param    {string}   name       An identifier for this url
 */
Prefix.add = function addPrefix(name, options) {

	var language = Language.get(options.locale) || '';

	options.name = name;
	prefixes[name] = options;

	if (!options.title) {
		options.title = language;
	}

	options.language = language.toLowerCase();

	if (options.default) {
		Prefix.default = options;
	}

	if (!Prefix.first) Prefix.first = options;
};

/**
 * Get a prefix
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {string}   name       The name of the prefix
 */
Prefix.get = function getPrefix(name) {
	return prefixes[name];
};

/**
 * Get all the available prefixes
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.0.1
 */
Prefix.all = function allPrefixes() {
	
	var obj = {},
	    key;

	// Make a shallow copy of the object
	for (key in prefixes) {
		obj[key] = prefixes[key];
	}

	return obj;
};

/**
 * Get a list of all the available prefixes
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.1.1
 * @version  0.1.1
 */
Prefix.getPrefixList = function getPrefixList() {
	return Object.keys(prefixes);
};

/**
 * Determine which prefix should be used
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   alchemyRoute
 * @param    {Array}    clientLanguages
 * @param    {Object}   session
 *
 * @return   {Object}
 */
Prefix.determine = function determinePrefix(alchemyRoute, clientLanguages, session) {
	
	var prefix, name, nr, entry, first, result;

	// If a prefix preference is set, use that
	if (session && session.user && session.user.prefix_preference) {
		if (prefixes[session.user.prefix_preference]) {
			return prefixes[session.user.prefix_preference];
		}
	}

	// If a route was provided get the prefix from there
	if (alchemyRoute) {
		if (alchemyRoute.prefix) {
			result = Prefix.get(alchemyRoute.prefix);
		}
	}

	// If the prefix was found, return it
	if (result || !clientLanguages) {
		return result;
	}

	// Go over every language the client accepts
	for (nr in clientLanguages) {

		entry = clientLanguages[nr];

		// Get the first entry for later use
		if (!first) first = entry;

		// Go over every prefix we have set up
		for (name in prefixes) {

			prefix = prefixes[name];

			// If the user accepts the given
			if (prefix.locale == entry.lang) {
				result = prefix;
				break;
			}
		}

		if (result) break;
	}

	if (!result) {
		result = Prefix.first;
	}

	return result;
};

/**
 * Get fallback prefixes
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Array}    languages
 *
 * @return   {Array}    An array of prefixes
 */
Prefix.getFallback = function getFallback(languages) {

	var i, prefixname, prefix, result = [];

	// Go over every language locale given
	for (i = 0; i < languages.length; i++) {

		// Go over every prefix
		for (prefixname in prefixes) {
			prefix = prefixes[prefixname];

			// If the locale of the prefix matches the one of the browser
			// add it to the result
			if (prefix.locale == languages[i]) {
				result.push(prefixname);
			}
		}
	}

	return result;
};

/**
 * Construct a URL for a connection name with the given parameters
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {string}   connectionName  The connection to get
 * @param    {Object}   options         The options for this connection
 */
Connection.url = function url(connectionName, options) {

	if (!options) options = {};

	var context = connections[connectionName],
	    paramName,
	    url,
	    z;

	// If the context was not found, return an empty string
	if (!context) {
		return '';
	}

	// Get the template url
	if (typeof context.paths === 'object') {
		if (options.locale) {
			url = context.paths[options.locale];
		} else {
			// If no locale is set, use the first entry
			for (z in context.paths) {
				url = context.paths[z];
				break;
			}
		}
	} else {
		url = context.paths;
	}

	url = Connection.fill(url, options.params);

	return url;
};

/**
 * Fill in a source url with the given parameters
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {string}   url      The source url to fill in
 * @param    {Object}   params   The parameters to use
 */
Connection.fill = function fill(url, params) {

	if (params) {
		for (paramName in params) {
			url = url.replace(':'+paramName, params[paramName]);
		}
	}

	return url;
};