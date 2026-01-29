let cached_sitemap;

/**
 * Sitemap class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 */
const Sitemap = Function.inherits('Alchemy.Base', function Sitemap() {
	this.categories = {};
});

/**
 * Get the sitemap
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @return   {Pledge}
 */
Sitemap.setStatic(function get() {

	if (cached_sitemap) {
		return cached_sitemap;
	}

	let pledge = new Pledge();
	let sitemap = new Sitemap();
	cached_sitemap = pledge;

	let loading = sitemap.load();

	Pledge.done(loading, err => {

		if (err) {
			pledge.reject(err);
		} else {
			pledge.resolve(sitemap);
		}
	});

	return cached_sitemap;
});

/**
 * Get all the categories
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @return   {Object}
 */
Sitemap.setMethod(function getCategories(prefix) {

	let result = [],
	    category,
	    new_category,
	    entry,
	    name;

	for (name in this.categories) {
		category = this.categories[name];
		new_category = [];

		for (entry of category) {

			if (entry.prefix && prefix && entry.prefix != prefix) {
				continue;
			}

			new_category.push(entry);
		}

		if (new_category.length) {
			result.push({
				name  : name,
				pages : new_category,
			});
		}
	}

	return result;
});

/**
 * Start loading the contents
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @return   {Pledge}
 */
Sitemap.setMethod(function load() {

	let sections = Router.getFullRoutes(),
	    promises = [],
	    key;
	
	for (key in sections) {
		let promise = this.processSection(sections[key]);
		promises.push(promise);
	}

	return Function.parallel(promises);
});

/**
 * Add a URL to the sitemap
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 */
Sitemap.setMethod(function addUrl(category, url, config = {}, prefix = '') {

	if (!this.categories[category]) {
		this.categories[category] = [];
	}

	this.categories[category].push({
		url          : url,
		title        : config.title,
		changefreq   : config.changefreq,
		priority     : config.priority,
		lastmod      : config.lastmod,
		prefix       : prefix,
	});
});

/**
 * Process a route section
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @return   {Promise}
 */
Sitemap.setMethod(function processSection(section) {

	let promise,
	    tasks = [],
	    route,
	    key;

	for (key in section) {
		route = section[key];

		if (!route.sitemap) {
			continue;
		}

		promise = this.processRoute(route, route.sitemap);

		if (promise) {
			tasks.push(promise);
		}
	}

	return Function.parallel(tasks);
});

/**
 * Process a route & its sitemap config
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @return   {Promise}
 */
Sitemap.setTypedMethod([Types.Alchemy.Route], function processRoute(route) {

	if (!route.sitemap) {
		return;
	}

	return this.processRoute(route, route.sitemap);
});

/**
 * Process a route & its sitemap config
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @return   {Promise}
 */
Sitemap.setTypedMethod([Types.Alchemy.Route, Types.Boolean], function processRoute(route, value) {

	if (!value) {
		return;
	}

	return this.processRoute(route, {category: 'general'});
});

/**
 * Process a route & its sitemap config
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @return   {Promise}
 */
Sitemap.setTypedMethod([Types.Alchemy.Route, Types.Object], function processRoute(route, config) {

	const category = config.category;

	if (!category) {
		return;
	}

	let criteria = config.criteria;

	if (criteria) {

		if (typeof criteria == 'function') {

			let prefixes = [];

			for (let prefix in route.paths) {
				if (prefix) {
					prefixes.push(prefix);
				}
			}

			if (prefixes.length) {
				let tasks = [];

				for (let prefix of prefixes) {
					let prefixed_criteria = criteria(prefix);
					let task = this.processRouteCriteria(route, config, prefixed_criteria);

					if (task) {
						tasks.push(task);
					}
				}

				return Function.parallel(tasks);
			}

			criteria = criteria();
		}

		return this.processRouteCriteria(route, config, criteria);
	}

	return this.addRouteWithParameters(route, config);
});

/**
 * Process a route & its sitemap config
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @return   {Promise}
 */
Sitemap.setTypedMethod([Types.Alchemy.Route, Types.Object, Types.Alchemy.Criteria], async function processRouteCriteria(route, config, criteria) {

	let prefix = criteria.options.locale;

	for await (const record of criteria) {
		this.addRouteWithParameters(route, config, record, prefix);
	}
});

/**
 * Add a route with the given parameters
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.3
 *
 * @param    {Route}   route           The route of which to add something to the map
 * @param    {Object}  config          Sitemap configuration for this route
 * @param    {Object}  parameters      The parameter object to use for generating the url
 * @param    {string}  forced_prefix   The optional prefix to use
 *
 * @return   {Promise}
 */
Sitemap.setMethod(function addRouteWithParameters(route, config, parameters, forced_prefix) {

	if (!parameters) {
		parameters = {};
	} else {
		// Make an overlay object
		parameters = Object.create(parameters);
	}

	let route_parameters = Object.assign(parameters, config.parameters),
	    prefixes = [];
	
	if (forced_prefix) {
		prefixes.push(forced_prefix);
	} else {
		for (let prefix in route.paths) {
			prefixes.push(prefix);
		}
	}

	for (let prefix of prefixes) {

		if (!route.paths[prefix]) {
			continue;
		}

		let url = Router.getUrl(route.name, route_parameters, {
			absolute             : true,
			locale               : prefix,
			extra_get_parameters : false,
		});

		let route_config = Object.assign({}, config);

		if (parameters && parameters.getDisplayFieldValue) {
			route_config.title = parameters.getDisplayFieldValue({prefix, fallback: false});
		}

		if (!route_config.title) {
			if (route.title) {
				if (typeof route.title == 'object' && !(route.title instanceof Classes.Alchemy.Microcopy)) {
					route_config.title = route.title[prefix] || route.title[''];
				} else {
					route_config.title = route.title;
				}
			}
		}

		if (!route_config.title) {
			// Skip this if no title was found.
			// It's better to show nothing
			continue;
		}

		this.addUrl(config.category, url, route_config, prefix);
	}
});

/**
 * Create an XML builder
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.4
 * @version  1.4.1
 *
 * @param    {string}   prefix
 *
 * @return   {Hawkejs.Builder}
 */
Sitemap.setMethod(function getXmlBuilder(prefix) {

	let xml = Classes.Hawkejs.Builder.create({xml: true}),
	    urlset = xml.ele('urlset');
	
	urlset.att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
	      .att('xmlns:image', 'http://www.google.com/schemas/sitemap-image/1.1')
	      .att('xsi:schemaLocation', 'http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd')
	      .att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');
	
	let categories = this.getCategories(prefix);

	for (let category of categories) {

		if (!category.pages) {
			continue;
		}

		for (let info of category.pages) {
			let url = urlset.ele('url');

			url.ele('loc').txt(''+info.url);

			if (info.lastmod) {
				url.ele('lastmod').txt(info.lastmod);
			}

			if (info.changefreq) {
				url.ele('changefreq').txt(info.changefreq);
			}

			if (info.priority) {
				url.ele('priority').txt(info.priority);
			}
		}
	}

	return xml;
});

/**
 * Get the XML representation
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.4
 * @version  1.3.4
 *
 * @return   {string}
 */
Sitemap.setMethod(function getXml() {
	return this.getXmlBuilder().end();
});