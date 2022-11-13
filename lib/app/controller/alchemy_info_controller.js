/**
 * Alchemy Info controller
 *
 * @constructor
 * @extends       Alchemy.Controller
 *
 * @author        Jelle De Loecker   <jelle@elevenways.be>
 * @since         0.2.0
 * @version       0.2.0
 */
var Info = Function.inherits('Alchemy.Controller.App', function AlchemyInfo(conduit, options) {
	AlchemyInfo.super.call(this, conduit, options);
});

/**
 * Set information variables
 *
 * @author   Jelle De Loecker       <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Info.setMethod(function setInfoVariables() {

	var data_sources = {},
	    modules = [],
	    engine,
	    temp,
	    key;

	Object.each(Datasource.get(), function eachDatasource(datasource, key) {
		data_sources[key] = {
			type: datasource.constructor.name,
			error: datasource.connectionError
		};
	});

	this.set('data_sources', data_sources);

	if (~process.execPath.indexOf('iojs')) {
		engine = 'iojs';
	} else {
		engine = 'node';
	}

	for (key in alchemy.modules_loaded) {
		temp = Object.assign({}, alchemy.modules_loaded[key]);

		// Don't add internal modules like fs & path
		if (temp.internal) {
			continue;
		}

		// Don't actually add the parsed module code itself
		temp.module = null;

		temp.name = key;
		modules.push(temp);
	}

	for (key in alchemy.modules_error) {
		temp = {
			failed: true,
			name: key
		};

		modules.push(temp);
	}

	// Sort the modules alphabetically
	modules.sortByPath(1, 'name');

	// Engine: Node or IO
	this.set('engine', engine);

	// Set the versions
	this.set('versions', process.versions);

	// Set the loaded plugins
	this.set('plugins', Object.keys(alchemy.plugins));

	// Set the settings
	this.set('settings', alchemy.settings);

	// Loaded modules
	this.set('modules', modules);
});

/**
 * Show information on this setup
 *
 * @author   Jelle De Loecker       <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.0.0
 */
Info.setAction(function info(conduit, name) {

	// Don't show the page if info_page is false
	if (!alchemy.settings.info_page) {
		return conduit.notFound();
	}

	this.setInfoVariables();

	// Render a specific view
	this.render('alchemy/info');
});

/**
 * Return the appcache manifest
 *
 * @author   Jelle De Loecker       <jelle@elevenways.be>
 * @since    1.0.7
 * @version  1.0.7
 */
Info.setAction(async function appcache(conduit) {

	if (!alchemy.settings.offline_clients) {
		return conduit.notFound();
	}

	let manifest = await alchemy.getAppcacheManifest();

	conduit.setHeader('Cache-Control', 'no-cache');
	conduit.setHeader('Content-Type', 'text/cache-manifest');
	conduit.end(manifest);
});

/**
 * Resume a postponed action
 *
 * @author   Jelle De Loecker       <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Info.setAction(function postponed(conduit, id) {

	var session = conduit.getSession(),
	    postponed_conduit = session.postponed.get(id);

	if (!postponed_conduit) {
		return conduit.notFound();
	}

	postponed_conduit.response = conduit.response;

	postponed_conduit._end(...postponed_conduit._end_arguments);

	session.postponed.remove(id);
});