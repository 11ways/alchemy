/**
 * Test Harness for Alchemy projects
 *
 * This module provides a reusable test harness for AlchemyMVC applications and plugins.
 * It handles all the boilerplate setup including:
 * - Environment variables
 * - MongoDB in-memory database (mongo-unit)
 * - Alchemy server startup
 * - Plugin loading
 * - Cleanup/teardown
 *
 * Usage:
 *   const TestHarness = require('alchemymvc/testing');
 *   const harness = new TestHarness({ path_root: __dirname });
 *   await harness.start();
 *   // ... run tests ...
 *   await harness.stop();
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 */
'use strict';

const libpath = require('path');

/**
 * The TestHarness class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {Object}   options
 */
const TestHarness = Function.inherits('Informer', 'Alchemy.Testing', function TestHarness(options) {

	TestHarness.super.call(this);

	if (options == null) {
		options = {};
	}

	// Store options with defaults
	this.options = Object.assign({
		// Required: path to the project root (where app/ is)
		path_root: null,

		// Environment to use (default: 'test')
		environment: 'test',

		// Skip loading local.js config (default: true for tests)
		skip_local_config: true,

		// Use mongo-unit for in-memory MongoDB (default: true)
		use_mongo_unit: true,

		// Server port (default: random between 3470-3570)
		port: 3470 + Math.floor(Math.random() * 100),

		// Silent mode - suppress Alchemy logs (default: true)
		silent: true,

		// Plugins to load: { name: options }
		plugins: {},

		// Extra stage tasks to run
		stage_tasks: {},

		// Disable request postponing on overload (default: true for tests)
		disable_postpone: true,

	}, options);

	// Validate required options
	if (!this.options.path_root) {
		throw new Error('TestHarness requires path_root option');
	}

	// State tracking
	this._mongo_uri = null;
	this._mongo_unit = null;
	this._started = false;
	this._alchemy_required = false;

	// Store reference to Puppeteer browser if used
	this.browser = null;
	this.page = null;
});

/**
 * Get the MongoUnit module (lazy loaded)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @return   {Object}
 */
TestHarness.setMethod(function getMongoUnit() {

	if (!this._mongo_unit) {
		try {
			this._mongo_unit = require('mongo-unit');
		} catch (err) {
			throw new Error('mongo-unit is required for testing. Install it with: npm install --save-dev mongo-unit');
		}
	}

	return this._mongo_unit;
});

/**
 * Resolve a plugin path from node_modules
 * 
 * This method mimics the logic in alchemy.usePlugin() to find plugins.
 * It searches in multiple locations and handles the "alchemy-" prefix.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   plugin_name
 *
 * @return   {string}
 */
TestHarness.setMethod(function getPluginPath(plugin_name) {

	// If already an absolute path, return as-is
	if (libpath.isAbsolute(plugin_name)) {
		return plugin_name;
	}

	// Determine names to try (with and without alchemy- prefix)
	let names_to_try;
	if (plugin_name.startsWith('alchemy-')) {
		names_to_try = [plugin_name, plugin_name.slice(8)];
	} else {
		names_to_try = ['alchemy-' + plugin_name, plugin_name];
	}

	// Build search paths: path_root and its parent directories
	// This handles the case where tests run from test_root inside a plugin
	let search_paths = [this.options.path_root];
	let current = this.options.path_root;

	for (let i = 0; i < 5; i++) {
		let parent = libpath.dirname(current);
		if (parent === current) break;
		search_paths.push(parent);
		current = parent;
	}

	// Use require.resolve - Node's optimized module resolution
	// It handles symlinks, node_modules lookup, and caching
	for (let name of names_to_try) {
		try {
			let resolved = require.resolve(name + '/package.json', { paths: search_paths });
			return libpath.dirname(resolved);
		} catch (err) {
			// Not found, try next name
		}
	}

	throw new Error(`Could not find plugin "${plugin_name}" in search paths starting from: ${this.options.path_root}`);
});

/**
 * Set up environment variables
 * This MUST be called before requiring alchemymvc
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 */
TestHarness.setMethod(function setupEnvironment() {

	// Disable Janeway terminal UI
	process.env.DISABLE_JANEWAY = '1';

	// Suppress "file not found" warnings during loading
	// This helps keep test output clean, but actual code errors in files
	// will still be surfaced because the load stage handles ENOENT separately.
	process.env.NO_ALCHEMY_LOAD_WARNING = '1';

	// Set PATH_ROOT before requiring alchemymvc
	process.env.PATH_ROOT = this.options.path_root;

	// Skip local.js if requested
	if (this.options.skip_local_config) {
		process.env.ALCHEMY_SKIP_LOCAL_CONFIG = '1';
	}

	// Set environment
	if (this.options.environment) {
		process.env.ALCHEMY_ENV = this.options.environment;
	}
});

/**
 * Require AlchemyMVC (only once)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 */
TestHarness.setMethod(function requireAlchemy() {

	if (this._alchemy_required) {
		return this._alchemy_required;
	}

	let pledge = this._alchemy_required = new Pledge();

	// Set up environment BEFORE requiring
	this.setupEnvironment();

	// Require alchemymvc - use the bootstrap from the same package
	const ROOT_STAGE = require('../bootstrap.js');

	ROOT_STAGE.getStage('load_core').addPostTask(() => pledge.resolve());

	return pledge;
});

/**
 * Start the in-memory MongoDB
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @return   {Promise<string>}   MongoDB URI
 */
TestHarness.setMethod(async function startMongo() {

	if (!this.options.use_mongo_unit) {
		return null;
	}

	if (this._mongo_uri) {
		return this._mongo_uri;
	}

	let MongoUnit = this.getMongoUnit();
	this._mongo_uri = await MongoUnit.start({ verbose: false });

	if (!this._mongo_uri) {
		throw new Error('Failed to start mongo-unit');
	}

	return this._mongo_uri;
});

/**
 * Configure and start the Alchemy server
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @return   {Promise}
 */
TestHarness.setMethod(function startServer() {

	return new Promise((resolve, reject) => {

		// Configure network settings
		alchemy.setSetting('network.port', this.options.port);

		// Disable request postponing for tests
		if (this.options.disable_postpone) {
			alchemy.setSetting('performance.postpone_requests_on_overload', false);
		}

		// Configure datasource if using mongo-unit
		if (this._mongo_uri) {
			STAGES.getStage('datasource').addPostTask(() => {
				Datasource.create('mongo', 'default', { uri: this._mongo_uri });
			});
		}

		// Register additional module search paths
		// This allows plugins to find their own dependencies during tests
		if (this.options.extra_module_paths) {
			for (let extra_path of this.options.extra_module_paths) {
				if (!libpath.isAbsolute(extra_path)) {
					extra_path = libpath.resolve(this.options.path_root, extra_path);
				}
				alchemy.addModuleSearchPath(extra_path);
			}
		}

		// Load plugins
		for (let [name, options] of Object.entries(this.options.plugins)) {

			let plugin_options = { ...options };

			// Resolve path if not already absolute
			if (!plugin_options.path_to_plugin) {
				plugin_options.path_to_plugin = this.getPluginPath(name);
			} else if (!libpath.isAbsolute(plugin_options.path_to_plugin)) {
				plugin_options.path_to_plugin = libpath.resolve(
					this.options.path_root,
					plugin_options.path_to_plugin
				);
			}

			// Add the plugin's node_modules to the module search paths
			// This allows dependencies of the plugin to be found during tests
			let plugin_node_modules = libpath.resolve(plugin_options.path_to_plugin, 'node_modules');
			alchemy.addModuleSearchPath(plugin_node_modules);

			alchemy.usePlugin(name, plugin_options);
		}

		// Add custom stage tasks
		for (let [stage_name, tasks] of Object.entries(this.options.stage_tasks)) {
			let stage = STAGES.getStage(stage_name);

			if (!stage) {
				console.warn(`TestHarness: Stage '${stage_name}' not found`);
				continue;
			}

			if (tasks.pre) {
				for (let task of Array.isArray(tasks.pre) ? tasks.pre : [tasks.pre]) {
					stage.addPreTask(task);
				}
			}

			if (tasks.post) {
				for (let task of Array.isArray(tasks.post) ? tasks.post : [tasks.post]) {
					stage.addPostTask(task);
				}
			}
		}

		// Start the server
		alchemy.start({ silent: this.options.silent }, (err) => {
			if (err) {
				reject(err);
			} else {
				this._started = true;
				resolve();
			}
		});
	});
});

/**
 * Start everything: mongo-unit, require alchemy, start server
 * This is the main entry point for setting up tests
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @return   {Promise}
 */
TestHarness.setMethod(async function start() {

	// Start mongo first (if enabled)
	await this.startMongo();

	// Require Alchemy (sets up environment vars first)
	await this.requireAlchemy();

	// Start the server
	await this.startServer();

	return this;
});

/**
 * Stop everything: mongo-unit, alchemy server, browser
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @return   {Promise}
 */
TestHarness.setMethod(async function stop() {

	// Close browser if open
	if (this.browser) {
		await this.browser.close();
		this.browser = null;
		this.page = null;
	}

	// Stop mongo-unit
	if (this._mongo_unit && this._mongo_uri) {
		this._mongo_unit.stop();
		this._mongo_uri = null;
	}

	// Stop alchemy
	if (this._started && typeof alchemy !== 'undefined') {
		alchemy.stop();
		this._started = false;
	}
});

/**
 * Get a full URL for a path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   path
 *
 * @return   {string}
 */
TestHarness.setMethod(function getUrl(path) {

	if (!path.startsWith('/')) {
		path = '/' + path;
	}

	return 'http://localhost:' + this.options.port + path;
});

/**
 * Get a URL for a named route
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   route_name
 * @param    {Object}   params
 *
 * @return   {string}
 */
TestHarness.setMethod(function getRouteUrl(route_name, params) {

	let url = Router.getUrl(route_name, params);

	url.host = 'localhost';
	url.protocol = 'http';
	url.port = this.options.port;

	return String(url);
});

/**
 * Make an HTTP request using Blast.fetch
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   path_or_url
 * @param    {Object}   options
 *
 * @return   {Promise<{response: Object, body: string}>}
 */
TestHarness.setMethod(function fetch(path_or_url, options) {

	if (options == null) {
		options = {};
	}

	return new Promise((resolve, reject) => {

		let url;

		if (path_or_url.startsWith('http')) {
			url = path_or_url;
		} else {
			url = this.getUrl(path_or_url);
		}

		Blast.fetch(url, options, (err, res, body) => {
			if (err) {
				reject(err);
			} else {
				resolve({ response: res, body });
			}
		});
	});
});

/**
 * Make an HTTP request to a named route
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   route_name
 * @param    {Object}   route_params
 * @param    {Object}   fetch_options
 *
 * @return   {Promise<{response: Object, body: string}>}
 */
TestHarness.setMethod(function fetchRoute(route_name, route_params, fetch_options) {

	if (route_params == null) {
		route_params = {};
	}

	if (fetch_options == null) {
		fetch_options = {};
	}

	let url = this.getRouteUrl(route_name, route_params);
	return this.fetch(url, fetch_options);
});

/**
 * Load Puppeteer browser for UI testing
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {Object}   options
 *
 * @return   {Promise<{browser: Object, page: Object}>}
 */
TestHarness.setMethod(async function loadBrowser(options) {

	if (options == null) {
		options = {};
	}

	if (this.browser) {
		return { browser: this.browser, page: this.page };
	}

	let puppeteer;

	try {
		puppeteer = require('puppeteer');
	} catch (err) {
		throw new Error('puppeteer is required for browser testing. Install it with: npm install --save-dev puppeteer');
	}

	let launch_options = {
		headless: 'new',
		...options,
	};

	this.browser = await puppeteer.launch(launch_options);
	this.page = await this.browser.newPage();

	return { browser: this.browser, page: this.page };
});

/**
 * Navigate to a path in the browser
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   path
 *
 * @return   {Promise}
 */
TestHarness.setMethod(async function goto(path) {

	if (!this.page) {
		await this.loadBrowser();
	}

	// Expose default static variables for each navigation
	if (typeof alchemy !== 'undefined') {
		alchemy.exposeDefaultStaticVariables();
	}

	let url = this.getUrl(path);
	let resource = await this.page.goto(url);
	let status = await resource.status();

	if (status >= 400) {
		throw new Error('Received a ' + status + ' error response for "' + path + '"');
	}

	return resource;
});

/**
 * Evaluate code in the browser page context
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {Function}   fn
 * @param    {...*}       args
 *
 * @return   {Promise<*>}
 */
TestHarness.setMethod(function evaluate(fn, ...args) {

	if (!this.page) {
		throw new Error('Browser not loaded. Call loadBrowser() first.');
	}

	return this.page.evaluate(fn, ...args);
});

/**
 * Click an element in the browser
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   selector
 *
 * @return   {Promise<boolean>}
 */
TestHarness.setMethod(async function click(selector) {

	return this.evaluate((sel) => {
		let element = document.querySelector(sel);

		if (!element) {
			return false;
		}

		element.click();
		return true;
	}, selector);
});

/**
 * Get an element's data from the browser
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   selector
 *
 * @return   {Promise<Object|false>}
 */
TestHarness.setMethod(async function queryElement(selector) {

	return this.evaluate((sel) => {
		let element = document.querySelector(sel);

		if (!element) {
			return false;
		}

		return {
			html: element.outerHTML,
			text: element.textContent,
			location: document.location.pathname,
		};
	}, selector);
});

/**
 * Set a value on a form element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   selector
 * @param    {*}        value
 *
 * @return   {Promise<Object|false>}
 */
TestHarness.setMethod(async function setValue(selector, value) {

	return this.evaluate((sel, val) => {
		let element = document.querySelector(sel);

		if (!element) {
			return false;
		}

		element.value = val;

		return {
			html: element.outerHTML,
			value: element.value,
		};
	}, selector, value);
});

/**
 * Create a Mocha describe block for harness setup
 * This is a convenience method for the most common test pattern
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {Function}   describe   Mocha describe function
 * @param    {Function}   it         Mocha it function
 *
 * @return   {TestHarness}
 */
TestHarness.setMethod(function describeSetup(describe, it) {

	let that = this;

	describe('Test Setup', function() {
		this.timeout(150000);

		if (that.options.use_mongo_unit) {
			it('should start in-memory MongoDB', async function() {
				await that.startMongo();
			});
		}

		it('should start the Alchemy server', async function() {
			that.requireAlchemy();
			await that.startServer();
		});
	});

	return this;
});

/**
 * Create a Mocha describe block for harness teardown
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {Function}   describe   Mocha describe function
 * @param    {Function}   it         Mocha it function
 *
 * @return   {TestHarness}
 */
TestHarness.setMethod(function describeTeardown(describe, it) {

	let that = this;

	describe('Teardown', function() {
		it('should stop all services', async function() {
			await that.stop();
		});
	});

	return this;
});

// =============================================================================
// Utility Methods
// =============================================================================

/**
 * Clean up whitespace in text (trim, normalize newlines and spaces)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   text
 *
 * @return   {string}
 */
TestHarness.setStatic(function despace(text) {
	return text.trim().replace(/\n/g, ' ').replace(/\s\s+/g, ' ');
});

// Store original console functions
let _console_log = console.log;
let _console_error = console.error;

/**
 * Silence console output (useful for testing error conditions)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 */
TestHarness.setMethod(function silenceConsole() {
	console.log = () => {};
	console.error = () => {};
});

/**
 * Restore console output
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 */
TestHarness.setMethod(function restoreConsole() {
	console.log = _console_log;
	console.error = _console_error;
});

/**
 * Create a model dynamically during tests
 * Useful for testing model features without creating test fixture files
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {Function}   creator   Named function that sets up schema in constitute context
 *
 * @return   {Pledge}
 */
TestHarness.setMethod(function createModel(creator) {

	let name = creator.name,
	    pledge = new Classes.Pledge();

	let fnc = Function.create(name, function model(options) {
		model.super.call(this, options);
	});

	Function.inherits('Alchemy.Model', fnc);

	fnc.constitute(function() {
		creator.call(this);
		pledge.resolve();
	});

	return pledge;
});

// Export the TestHarness class
module.exports = TestHarness;
