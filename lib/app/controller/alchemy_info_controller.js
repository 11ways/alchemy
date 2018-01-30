/**
 * Alchemy Info controller
 *
 * @constructor
 * @extends       Alchemy.Controller
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.2.0
 * @version       0.2.0
 */
var Info = Function.inherits('Alchemy.Controller.App', function AlchemyInfo(conduit, options) {
	AlchemyInfo.super.call(this, conduit, options);
});

/**
 * Set information variables
 *
 * @author   Jelle De Loecker       <jelle@develry.be>
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
 * @author   Jelle De Loecker       <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Info.setMethod(function info(conduit, name) {

	// Don't show the page if info_page is false
	if (!alchemy.settings.info_page) {
		return conduit.notFound();
	}

	this.setInfoVariables();

	// Render a specific view
	this.render('alchemy/info');
});