/**
 * Browser Testing Helper for Alchemy projects
 *
 * This module provides browser testing capabilities using Puppeteer.
 * It handles:
 * - Puppeteer lifecycle (launch/connect/close)
 * - Navigation with coverage tracking
 * - DOM queries and interactions
 * - Hawkejs client-side navigation
 * - File uploads
 * - Development mode (connect to existing browser)
 *
 * Usage:
 *   const { BrowserHelper } = require('alchemymvc/testing');
 *   const browser_helper = new BrowserHelper(harness, { coverage: true });
 *   await browser_helper.load();
 *   await browser_helper.goto('/some/path');
 *   await browser_helper.click('.button');
 *   await browser_helper.close();
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 */
'use strict';

/**
 * The BrowserHelper class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {TestHarness}   harness   The test harness instance
 * @param    {Object}        options
 */
const BrowserHelper = Function.inherits('Informer', 'Alchemy.Testing', function BrowserHelper(harness, options) {

	BrowserHelper.super.call(this);

	if (options == null) {
		options = {};
	}

	// Store the harness reference
	this.harness = harness;

	// Store options with defaults
	this.options = Object.assign({
		// Enable coverage collection (default: false)
		coverage: false,

		// Connect to existing browser instead of launching (default: false)
		// When true, connects to 'http://127.0.0.1:9333/' for debugging
		connect: false,

		// Browser URL to connect to in development mode
		browser_url: 'http://127.0.0.1:9333/',

		// Viewport dimensions
		viewport_width: 1680,
		viewport_height: 1050,

		// Enable devtools in connect mode
		devtools: true,

		// Log browser console messages (default: false)
		log_console: false,

		// Headless mode when launching (default: 'new')
		headless: 'new',

	}, options);

	// Puppeteer instances
	this.browser = null;
	this.page = null;

	// Coverage tracking
	this._navigations = 0;
	this._coverages = [];
});

/**
 * Get Puppeteer module (lazy loaded)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @return   {Object}
 */
BrowserHelper.setMethod(function getPuppeteer() {

	if (!this._puppeteer) {
		try {
			this._puppeteer = require('puppeteer');
		} catch (err) {
			throw new Error('puppeteer is required for browser testing. Install it with: npm install --save-dev puppeteer');
		}
	}

	return this._puppeteer;
});

/**
 * Load/launch the browser
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @return   {Promise<{browser: Object, page: Object}>}
 */
BrowserHelper.setMethod(async function load() {

	if (this.browser) {
		return { browser: this.browser, page: this.page };
	}

	let puppeteer = this.getPuppeteer();

	if (this.options.connect) {
		// Connect to existing browser (development mode)
		this.browser = await puppeteer.connect({
			browserURL: this.options.browser_url,
			defaultViewport: {
				width: this.options.viewport_width,
				height: this.options.viewport_height,
			},
			devtools: this.options.devtools,
		});
	} else {
		// Launch new browser
		this.browser = await puppeteer.launch({
			headless: this.options.headless,
		});
	}

	this.page = await this.browser.newPage();

	// Set up console message handler
	this._setupConsoleHandler();

	return { browser: this.browser, page: this.page };
});

/**
 * Set up console message handler
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 */
BrowserHelper.setMethod(function _setupConsoleHandler() {

	if (!this.page) {
		return;
	}

	// Store console errors for debugging
	this._console_errors = [];

	// Capture page errors
	this.page.on('pageerror', (err) => {
		this._console_errors.push('PageError: ' + err.message + ' | Stack: ' + (err.stack || 'no stack'));
	});

	this.page.on('console', (msg) => {

		// Always capture errors (including console.error with stack traces)
		if (msg.type() === 'error') {
			let text = msg.text();
			this._console_errors.push(text);
			// Also log immediately for debugging
			console.log('[BROWSER ERROR]', text);
		}

		if (!this.options.log_console) {
			return;
		}

		let pieces = ['[BROWSER]'],
		    args = msg.args();

		for (let arg of args) {
			let remote = arg._remoteObject;

			if (remote.type == 'string') {
				pieces.push(remote.value);
			} else if (remote.subtype == 'node') {
				pieces.push('\x1b[1m\x1b[36m<' + remote.description + '>\x1b[0m');
			} else if (remote.className) {
				pieces.push('\x1b[1m\x1b[33m{' + remote.type + ' ' + remote.className + '}\x1b[0m');
			} else if (remote.value != null) {
				pieces.push(remote.value);
			} else {
				pieces.push(remote);
			}
		}

		console.log(...pieces);
	});
});

/**
 * Close the browser
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @return   {Promise}
 */
BrowserHelper.setMethod(async function close() {

	// Fetch final coverage data
	if (this.options.coverage) {
		await this.fetchCoverage();
	}

	// Don't close if we connected (development mode)
	if (this.browser && !this.options.connect) {
		await this.browser.close();
	}

	this.browser = null;
	this.page = null;
});

/**
 * Get a full URL for a path
 * Note: Uses 127.0.0.1 instead of localhost for consistency with browser tests
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   path
 *
 * @return   {string}
 */
BrowserHelper.setMethod(function getUrl(path) {

	if (!path.startsWith('/')) {
		path = '/' + path;
	}

	// Get the port from harness or alchemy settings
	let port;

	if (this.harness) {
		port = this.harness.options.port;
	} else if (typeof alchemy !== 'undefined') {
		port = alchemy.settings.network.port;
	} else {
		port = 3470;
	}

	// Use 127.0.0.1 for consistency with browser tests (not localhost)
	return 'http://127.0.0.1:' + port + path;
});

/**
 * Fetch browser-side coverage data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @return   {Promise<Array>}
 */
BrowserHelper.setMethod(async function fetchCoverage() {

	if (!this.page) {
		return this._coverages;
	}

	let temp = await this.page.evaluate(function getCoverage() {

		if (typeof window.__Protoblast == 'undefined') {
			return false;
		}

		return window.__coverage__;
	});

	if (temp) {
		this._coverages.push(temp);
	} else if (temp !== false) {
		console.log('Failed to get coverage from browser');
	}

	return this._coverages;
});

/**
 * Get all collected coverage data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @return   {Array}
 */
BrowserHelper.setMethod(function getCoverages() {
	return this._coverages;
});

/**
 * Get the number of navigations
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @return   {number}
 */
BrowserHelper.setMethod(function getNavigationCount() {
	return this._navigations;
});

/**
 * Navigate to a path (full page navigation)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   path
 *
 * @return   {Promise<Object>}
 */
BrowserHelper.setMethod(async function goto(path) {

	if (!this.page) {
		await this.load();
	}

	// Collect coverage from previous navigation
	if (this._navigations > 0 && this.options.coverage) {
		await this.fetchCoverage();
	}

	this._navigations++;

	// Force exposing defaults (routes may be added on-the-fly during testing)
	if (typeof alchemy !== 'undefined') {
		alchemy.exposeDefaultStaticVariables();
	}

	let url;

	if (path.indexOf('http') === -1) {
		url = this.getUrl(path);
	} else {
		url = path;
	}

	let resource = await this.page.goto(url);
	let status = await resource.status();

	if (status >= 400) {
		throw new Error('Received a ' + status + ' error response for "' + path + '"');
	}

	return resource;
});

/**
 * Navigate using Hawkejs client-side navigation (SPA-style)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   path
 *
 * @return   {Promise<Object>}
 */
BrowserHelper.setMethod(async function openUrl(path) {

	if (!this.page) {
		throw new Error('Browser not loaded. Call load() or goto() first.');
	}

	// Check if hawkejs is available before trying to use it
	let check = await this.page.evaluate(function() {
		return typeof hawkejs !== 'undefined';
	});

	if (!check) {
		let errors = this._console_errors || [];
		throw new Error('hawkejs is not defined in browser. Console errors: ' + errors.join(' | '));
	}

	await this.page.evaluate(function(path) {
		return hawkejs.scene.openUrl(path);
	}, path);

	let result = await this.page.evaluate(function() {
		return {
			location: document.location.pathname,
		};
	});

	return result;
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
BrowserHelper.setMethod(function evaluate(fn, ...args) {

	if (!this.page) {
		throw new Error('Browser not loaded. Call load() or goto() first.');
	}

	return this.page.evaluate(fn, ...args);
});

/**
 * Get the full document HTML
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @return   {Promise<string>}
 */
BrowserHelper.setMethod(async function getDocumentHtml() {
	return this.evaluate(function() {
		return document.documentElement.outerHTML;
	});
});

/**
 * Get the body innerHTML
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @return   {Promise<string>}
 */
BrowserHelper.setMethod(async function getBodyHtml() {
	return this.evaluate(function() {
		return document.body.innerHTML;
	});
});

/**
 * Get an element handle (for file uploads, etc.)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   selector
 *
 * @return   {Promise<ElementHandle|null>}
 */
BrowserHelper.setMethod(function getElementHandle(selector) {

	if (!this.page) {
		throw new Error('Browser not loaded. Call load() or goto() first.');
	}

	return this.page.$(selector);
});

/**
 * Query an element and get its data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   selector
 *
 * @return   {Promise<Object|false>}
 */
BrowserHelper.setMethod(async function queryElement(selector) {

	return this.evaluate(function(sel) {
		let element = document.querySelector(sel);

		if (!element) {
			return false;
		}

		return {
			html: element.outerHTML,
			text: element.textContent,
			location: document.location.pathname,
			scroll_top: document.scrollingElement.scrollTop,
		};
	}, selector);
});

/**
 * Click an element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   selector
 *
 * @return   {Promise<boolean>}
 */
BrowserHelper.setMethod(async function click(selector) {

	return this.evaluate(function(sel) {
		let element = document.querySelector(sel);

		if (!element) {
			return false;
		}

		element.click();
		return true;
	}, selector);
});

/**
 * Check if an element exists in the DOM
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   selector
 *
 * @return   {Promise<boolean>}
 */
BrowserHelper.setMethod(async function hasElement(selector) {

	return this.evaluate(function(sel) {
		return !!document.querySelector(sel);
	}, selector);
});

/**
 * Get the current page URL pathname
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @return   {Promise<string>}
 */
BrowserHelper.setMethod(async function getCurrentUrl() {

	return this.evaluate(function() {
		return window.location.pathname;
	});
});

/**
 * Click an element and wait for navigation to complete
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}          selector
 * @param    {Object|string}   options    Navigation options, or expected URL path
 *
 * @return   {Promise<string>}   The new URL pathname
 */
BrowserHelper.setMethod(async function clickAndWait(selector, options) {

	if (!this.page) {
		throw new Error('Browser not loaded. Call load() or goto() first.');
	}

	let expectedUrl = null;
	let timeout = 5000;

	// Allow passing just a URL string as second argument
	if (typeof options === 'string') {
		expectedUrl = options;
		options = {};
	} else if (options?.url) {
		expectedUrl = options.url;
		timeout = options.timeout || timeout;
	}

	// Start navigation wait before clicking
	const navigationPromise = this.page.waitForNavigation(options).catch(() => {
		// Navigation might not happen (e.g., validation error)
	});

	const clicked = await this.click(selector);

	if (clicked) {
		await navigationPromise;

		// If an expected URL was provided, wait for it
		if (expectedUrl) {
			await this.waitForUrl(expectedUrl, timeout);
		}
	}

	return this.getCurrentUrl();
});

/**
 * Wait for the URL to match an expected path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   expectedUrl   The expected pathname
 * @param    {number}   timeout       Max wait time in ms (default: 5000)
 *
 * @return   {Promise<boolean>}
 */
BrowserHelper.setMethod(async function waitForUrl(expectedUrl, timeout = 5000) {

	if (!this.page) {
		throw new Error('Browser not loaded. Call load() or goto() first.');
	}

	// Use Puppeteer's waitForFunction - efficient, no manual polling
	try {
		await this.page.waitForFunction(
			(expected) => window.location.pathname === expected,
			{ timeout },
			expectedUrl
		);
		return true;
	} catch (err) {
		return false;
	}
});

/**
 * Set a form element's value
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
BrowserHelper.setMethod(async function setValue(selector, value) {

	return this.evaluate(function(sel, val) {
		let element = document.querySelector(sel);

		if (!element) {
			return false;
		}

		element.value = val;

		return {
			html: element.outerHTML,
			text: element.textContent,
			location: document.location.pathname,
			scroll_top: document.scrollingElement.scrollTop,
			value: element.value,
		};
	}, selector, value);
});

/**
 * Set element value or throw an error if not found/value doesn't match
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   selector
 * @param    {*}        value
 *
 * @return   {Promise<Object>}
 */
BrowserHelper.setMethod(async function setValueOrThrow(selector, value) {

	let result = await this.setValue(selector, value);

	if (!result) {
		throw new Error('Failed to find the `' + selector + '` element, unable to set value to "' + value + '"');
	}

	if (result.value != value) {
		throw new Error('The `' + selector + '` element has the value "' + result.value + '", but "' + value + '" was expected');
	}

	return result;
});

/**
 * Upload a file to a file input using a filesystem path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   selector
 * @param    {string}   file_path
 *
 * @return   {Promise<boolean>}
 */
BrowserHelper.setMethod(async function uploadFile(selector, file_path) {

	let handle = await this.getElementHandle(selector);

	if (!handle) {
		return false;
	}

	return handle.uploadFile(file_path);
});

/**
 * Set a file input's value with a blob (in-memory content)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   selector
 * @param    {string}   content
 * @param    {string}   filename   Optional filename (default: 'test.txt')
 * @param    {string}   mimetype   Optional mimetype (default: 'text/plain')
 *
 * @return   {Promise<Object|false>}
 */
BrowserHelper.setMethod(async function setFileBlob(selector, content, filename, mimetype) {

	if (filename == null) {
		filename = 'test.txt';
	}

	if (mimetype == null) {
		mimetype = 'text/plain';
	}

	return this.evaluate(function(sel, content, filename, mimetype) {
		let element = document.querySelector(sel);

		if (!element) {
			return false;
		}

		element.files = [new File([new Blob([content], { type: mimetype })], filename, { type: mimetype })];

		return {
			html: element.outerHTML,
			text: element.textContent,
			location: document.location.pathname,
			scroll_top: document.scrollingElement.scrollTop,
			value: element.value,
		};
	}, selector, content, filename, mimetype);
});

/**
 * Wait for a specific amount of time
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {number}   ms
 *
 * @return   {Promise}
 */
BrowserHelper.setMethod(function wait(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
});

/**
 * Wait for a selector to appear in the DOM
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   selector
 * @param    {Object}   options    Puppeteer waitForSelector options
 *
 * @return   {Promise<ElementHandle|null>}
 */
BrowserHelper.setMethod(async function waitForSelector(selector, options) {

	if (!this.page) {
		throw new Error('Browser not loaded. Call load() or goto() first.');
	}

	return this.page.waitForSelector(selector, options);
});

/**
 * Wait for navigation to complete
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {Object}   options    Puppeteer waitForNavigation options
 *
 * @return   {Promise}
 */
BrowserHelper.setMethod(async function waitForNavigation(options) {

	if (!this.page) {
		throw new Error('Browser not loaded. Call load() or goto() first.');
	}

	return this.page.waitForNavigation(options);
});

/**
 * Type text into an element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   selector
 * @param    {string}   text
 * @param    {Object}   options    Puppeteer type options
 *
 * @return   {Promise}
 */
BrowserHelper.setMethod(async function type(selector, text, options) {

	if (!this.page) {
		throw new Error('Browser not loaded. Call load() or goto() first.');
	}

	return this.page.type(selector, text, options);
});

/**
 * Take a screenshot
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {Object}   options    Puppeteer screenshot options
 *
 * @return   {Promise<Buffer|string>}
 */
BrowserHelper.setMethod(async function screenshot(options) {

	if (!this.page) {
		throw new Error('Browser not loaded. Call load() or goto() first.');
	}

	return this.page.screenshot(options);
});

/**
 * Write collected coverage data to files for NYC/Istanbul
 * This should be called before closing the browser if coverage is enabled
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   output_dir   Directory to write files (default: './.nyc_output')
 * @param    {string}   prefix       Filename prefix (default: 'alchemy_')
 *
 * @return   {Promise<number>}   Number of coverage files written
 */
BrowserHelper.setMethod(async function writeCoverageFiles(output_dir, prefix) {

	if (output_dir == null) {
		output_dir = './.nyc_output';
	}

	if (prefix == null) {
		prefix = 'alchemy_';
	}

	// Fetch final coverage data
	let coverages = await this.fetchCoverage();

	if (!coverages || coverages.length === 0) {
		return 0;
	}

	// Lazy load fs
	let fs = require('fs');

	// Write each coverage snapshot to a file
	for (let i = 0; i < coverages.length; i++) {
		let filepath = output_dir + '/' + prefix + i + '.json';
		fs.writeFileSync(filepath, JSON.stringify(coverages[i]));
	}

	return coverages.length;
});

/**
 * Wait for the Hawkejs scene to be ready.
 * This is important when testing pages with custom elements or client-side rendering.
 *
 * The scene is ready when:
 * - The hawkejs object exists
 * - The scene has been initialized
 * - The general_renderer is available
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {number}   timeout   Maximum time to wait in ms (default: 5000)
 *
 * @return   {Promise<boolean>}
 */
BrowserHelper.setMethod(async function waitForSceneReady(timeout = 5000) {

	if (!this.page) {
		throw new Error('Browser not loaded. Call load() or goto() first.');
	}

	return this.evaluate((timeout) => {
		return new Promise((resolve) => {

			const isReady = () => {
				return typeof hawkejs !== 'undefined' &&
				       hawkejs.scene &&
				       hawkejs.scene.general_renderer;
			};

			if (isReady()) {
				return resolve(true);
			}

			const start = Date.now();

			const check = () => {
				if (isReady()) {
					return resolve(true);
				}

				if (Date.now() - start > timeout) {
					return resolve(false);
				}

				setTimeout(check, 50);
			};

			check();
		});
	}, timeout);
});

/**
 * Wait for an element to appear in the DOM using MutationObserver.
 * This is the proper way to wait for Alchemy custom elements that render asynchronously.
 *
 * Unlike Puppeteer's waitForSelector, this:
 * - Uses MutationObserver (efficient, no polling)
 * - Returns element info, not an ElementHandle
 * - Supports multiple selectors with "any" mode
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string|string[]}   selector   CSS selector(s) to wait for
 * @param    {Object}            options
 * @param    {number}            options.timeout   Max wait time in ms (default: 5000)
 * @param    {boolean}           options.visible   Wait for element to be visible (default: false)
 *
 * @return   {Promise<Object|false>}   Element info or false if timeout
 */
BrowserHelper.setMethod(async function waitForElement(selector, options = {}) {

	const timeout = options.timeout || 5000;
	const visible = options.visible || false;

	if (!this.page) {
		throw new Error('Browser not loaded. Call load() or goto() first.');
	}

	const selectors = Array.isArray(selector) ? selector : [selector];

	return this.evaluate((selectors, timeout, visible) => {
		return new Promise((resolve) => {

			const isVisible = (el) => {
				if (!visible) return true;
				const rect = el.getBoundingClientRect();
				return rect.width > 0 && rect.height > 0;
			};

			const findElement = () => {
				for (let selector of selectors) {
					const el = document.querySelector(selector);
					if (el && isVisible(el)) {
						return el;
					}
				}
				return null;
			};

			const createResult = (el) => ({
				found: true,
				selector: selectors.find(s => document.querySelector(s)),
				tagName: el.tagName.toLowerCase(),
				text: el.textContent
			});

			const found = findElement();
			if (found) {
				return resolve(createResult(found));
			}

			const observer = new MutationObserver(() => {
				const el = findElement();
				if (el) {
					observer.disconnect();
					resolve(createResult(el));
				}
			});

			observer.observe(document.body, {
				childList: true,
				subtree: true,
				attributes: visible
			});

			setTimeout(() => {
				observer.disconnect();
				const el = findElement();
				resolve(el ? createResult(el) : false);
			}, timeout);
		});
	}, selectors, timeout, visible);
});

/**
 * Wait for all pending AJAX/fetch requests to complete.
 * This is useful after clicking buttons that trigger API calls.
 *
 * Uses the browser's performance API to track pending requests.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {number}   timeout       Max wait time in ms (default: 5000)
 * @param    {number}   settle_time   Time with no requests to consider settled (default: 200)
 *
 * @return   {Promise<boolean>}
 */
BrowserHelper.setMethod(async function waitForAjaxComplete(timeout = 5000, settle_time = 200) {

	if (!this.page) {
		throw new Error('Browser not loaded. Call load() or goto() first.');
	}

	return this.evaluate((timeout, settle_time) => {
		return new Promise((resolve) => {
			const start = Date.now();
			let lastActivity = Date.now();

			const checkSettled = () => {
				const now = Date.now();

				const entries = performance.getEntriesByType('resource');
				const pending = entries.filter(e => {
					return e.startTime > (performance.now() - settle_time) &&
					       (e.initiatorType === 'fetch' || e.initiatorType === 'xmlhttprequest');
				});

				if (pending.length > 0) {
					lastActivity = now;
				}

				if (now - lastActivity >= settle_time) {
					return resolve(true);
				}

				if (now - start > timeout) {
					return resolve(false);
				}

				setTimeout(checkSettled, 50);
			};

			checkSettled();
		});
	}, timeout, settle_time);
});

/**
 * Wait for client-side navigation to complete.
 * This handles both full page navigations and Hawkejs SPA-style navigations.
 *
 * For Hawkejs navigations, it waits for:
 * - The scene to finish rendering
 * - Any pending AJAX requests to settle
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {number}   timeout   Max wait time in ms (default: 5000)
 *
 * @return   {Promise<boolean>}
 */
BrowserHelper.setMethod(async function waitForClientNavigation(timeout = 5000) {

	if (!this.page) {
		throw new Error('Browser not loaded. Call load() or goto() first.');
	}

	return this.evaluate((timeout) => {
		return new Promise((resolve) => {
			const start = Date.now();

			const checkReady = () => {
				const now = Date.now();

				if (now - start > timeout) {
					return resolve(false);
				}

				if (typeof hawkejs !== 'undefined' && hawkejs.scene) {
					const renderer = hawkejs.scene.general_renderer;
					
					if (renderer && !renderer.rendering && document.readyState === 'complete') {
						setTimeout(() => resolve(true), 100);
						return;
					}
				} else if (document.readyState === 'complete') {
					setTimeout(() => resolve(true), 100);
					return;
				}

				setTimeout(checkReady, 50);
			};

			checkReady();
		});
	}, timeout);
});

// Export the BrowserHelper class
module.exports = BrowserHelper;
