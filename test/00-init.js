/* istanbul ignore file */
const TestHarness = require('../testing'),
      BrowserHelper = TestHarness.BrowserHelper,
      libpath     = require('path'),
      assert      = require('assert'),
      fs          = require('fs');

// Create the test harness
const harness = new TestHarness({
	path_root   : libpath.resolve(__dirname, 'test_root'),
	environment : 'dev',  // AlchemyMVC core tests use 'dev' environment
	port        : 3470,
});

// Create browser helper with coverage enabled if coverage is active
const browserHelper = new BrowserHelper(harness, {
	coverage: !!global.__coverage__,
	connect: false,  // Set to true for development (connects to existing browser)
	log_console: false,  // Set to true when writing new tests
});

// Export harness and browser helper for use in other test files
global.harness = harness;
global.browserHelper = browserHelper;

// Legacy coverage flag
global.do_coverage = !!global.__coverage__;

// Make MongoUnit globally available (for 99-teardown.js compatibility)
global.MongoUnit = harness.getMongoUnit();

// Test asset path
let test_script_path = libpath.resolve(__dirname, 'assets', 'scripts', 'test.js');

// Console helpers - delegate to harness
global.silenceConsole = function silenceConsole() {
	harness.silenceConsole();
};

global.restoreConsole = function restoreConsole() {
	harness.restoreConsole();
};

// ============================================================================
// Legacy global functions - delegate to BrowserHelper
// These are kept for backward compatibility with existing tests
// ============================================================================

/**
 * Fetch browser-side coverage data
 */
global.fetchCoverage = function fetchCoverage() {
	return browserHelper.fetchCoverage();
};

/**
 * Navigate browser to a path
 */
global.setLocation = async function setLocation(path) {
	return browserHelper.goto(path);
};

/**
 * Get full document HTML from browser
 */
global.getDocumentHTML = function getDocumentHTML() {
	return browserHelper.getDocumentHtml();
};

/**
 * Evaluate code in browser page
 */
global.evalPage = function evalPage(fnc, ...args) {
	return browserHelper.evaluate(fnc, ...args);
};

/**
 * Get element handle from browser
 */
global.getElementHandle = function getElementHandle(query) {
	return browserHelper.getElementHandle(query);
};

/**
 * Clean up whitespace in text
 */
global.despace = function despace(text) {
	return TestHarness.despace(text);
};

/**
 * Get a full URL for a named route
 */
global.getRouteUrl = function getRouteUrl(route, options) {
	return harness.getRouteUrl(route, options);
};

/**
 * Query an element and get its data
 */
global.queryElementData = function queryElementData(query) {
	return browserHelper.queryElement(query);
};

/**
 * Open a URL using Hawkejs client-side navigation
 */
global.openHeUrl = function openHeUrl(path) {
	return browserHelper.openUrl(path);
};

/**
 * Get body innerHTML from browser
 */
global.getBodyHtml = function getBodyHtml() {
	return browserHelper.getBodyHtml();
};

/**
 * Create a model dynamically in tests
 */
global.createModel = function createModel(creator) {
	return harness.createModel(creator);
};

/**
 * Set a form element's value
 */
global.setElementValue = function setElementValue(query, value) {
	return browserHelper.setValue(query, value);
};

/**
 * Upload a file to a file input
 */
global.setFileInputPath = function setFileInputPath(query, path) {
	return browserHelper.uploadFile(query, path);
};

/**
 * Set a file input's value with a blob
 */
global.setFileInputBlob = function setFileInputBlob(query, content) {
	return browserHelper.setFileBlob(query, content);
};

/**
 * Set element value or throw error
 */
global.setElementValueOrThrow = function setElementValueOrThrow(query, value) {
	return browserHelper.setValueOrThrow(query, value);
};

/**
 * Click an element in the browser
 */
global.clickElement = function clickElement(query) {
	return browserHelper.click(query);
};

// =============================================================================
// Test Setup
// =============================================================================

describe('require(\'alchemymvc\')', function() {
	this.timeout(150000);

	it('should start in-memory MongoDB', async function() {
		await harness.startMongo();
	});

	it('should create the global STAGES instance', function() {
		harness.requireAlchemy();
		assert.equal('object', typeof STAGES);
	});
});

describe('Alchemy', function() {

	describe('#start(callback)', function() {
		it('should start the server', async function() {
			this.timeout(60000);
			await harness.startServer();
		});
	});

	describe('#pathResolve(...path_to_dirs)', function() {
		it('resolves all arguments to a directory', function() {

			if (process.platform == 'win32') {
				assert.strictEqual(alchemy.pathResolve('/a', 'b', 'c'), 'C:\\a\\b\\c');
			} else {
				assert.strictEqual(alchemy.pathResolve('/a', 'b', 'c'), '/a/b/c');
				assert.strictEqual(alchemy.pathResolve('/a'), '/a');
			}
		});
	});

	describe('#addViewDirectory(path, weight = 10)', function() {
		it('adds a new view directory', function() {
			let test_views = alchemy.pathResolve(__filename, '..', 'view');
			alchemy.addViewDirectory(test_views);
			alchemy.hawkejs.load(__dirname + '/element/my_button.js');
			alchemy.hawkejs.load(__dirname + '/element/my_document_list.js');
		});
	});

	describe('#styleMiddleware(req, res, next)', function() {

		if (process.platform == 'win32') {
			// @TODO: Fix!
			return;
		}

		it('is the middleware that compiles & serves CSS, LESS & SCSS files', async function() {

			let { response, body } = await harness.fetch('/stylesheets/alchemy-info.css');

			assert.strictEqual(response.statusCode, 200);
			assert.strictEqual(response.headers['content-type'], 'text/css; charset=utf-8');
			assert.strictEqual(body.length > 100, true);
		});
	});

	describe('#scriptMiddleware(req, res, next)', function() {

		if (process.platform == 'win32') {
			// @TODO: Fix!
			return;
		}

		before(function() {
			// Add a new script directory
			alchemy.addScriptDirectory(libpath.resolve(__dirname, 'assets', 'scripts'));
		});

		it('is the middleware that serves script files', async function() {

			let { response, body } = await harness.fetch('/scripts/test.js');

			assert.strictEqual(response.statusCode, 200);
			assert.strictEqual(response.headers['content-type'], 'text/javascript; charset=utf-8');
			assert.strictEqual(body.length > 20, true);
		});
	});

	describe('#getFileInfo(path, options, callback)', function() {
		it('should lookup file info', function(done) {

			alchemy.getFileInfo(test_script_path, function gotInfo(err, info) {

				if (err) {
					return done(err);
				}

				try {
					assert.strictEqual(info.hash, '0f6813d0c0164e3625d1a83f07a442882c1d06f2');
					assert.strictEqual(info.mimetype, 'text/javascript');
					assert.strictEqual(info.size, 77);
					assert.strictEqual(info.name, 'test');
					assert.strictEqual(info.filename, 'test.js');
				} catch (err) {
					done(err);
					return;
				}

				done();
			});
		});
	});

	describe('#copyFile(source, path, callback)', function() {
		it('should copy a file', function(done) {
			var target_path = libpath.resolve(PATH_TEMP, '__test' + Date.now() + '.js');

			alchemy.copyFile(test_script_path, target_path, function copied(err) {

				if (err) {
					return done(err);
				}

				done();
			});
		});

		it('should return an error when the source does not exist', function(done) {

			var target_path = libpath.resolve(PATH_TEMP, '__test' + Date.now() + '.js');

			alchemy.copyFile(libpath.resolve(__dirname, 'does_not_exist.js'), target_path, function copied(err) {

				if (!err) {
					return done(new Error('Expected an error'));
				}

				done();
			});
		});
	});

	describe('#downloadFile(url, options, callback)', function() {
		it('should download the file and return the filepath', async function() {

			var url = harness.getUrl('/scripts/test.js');

			let file = await alchemy.download(url);

			assert.strictEqual(file.name, 'test.js');
			assert.strictEqual(await file.getMimetype(), 'text/javascript');

			let result = await file.readString('utf8');

			if (result.indexOf('This is a test script') == -1) {
				throw new Error('Test script file does not contain expected content');
			}
		});

		it('should return a 404 error when downloading non-existing path', function(done) {
			alchemy.downloadFile(harness.getUrl('/scripts/does_not_exist.js'), function downloaded(err, filepath, name) {

				assert.strictEqual(filepath, undefined);
				assert.strictEqual(name, undefined);
				assert.strictEqual(err.number, 404);
				done();
			});
		});
	});

	describe('#findPathToBinarySync(name)', function() {
		it('should find the path of a wanted binary', function() {

			var wanted,
			    result,
			    second;

			if (process.platform == 'win32') {
				// @TODO: Solve this in some way?
				return;
			} else {
				wanted = 'ls';
			}

			result = alchemy.findPathToBinarySync('ls');

			assert.notStrictEqual(result, false, 'The `ls` command was not found');

			// Look for the preferred path first, but it should not be found now
			second = alchemy.findPathToBinarySync('ls', '/non/existing/binary/ls');

			assert.strictEqual(second, result);
		});
	});
});

// This will run after ALL the files have executed (not just this file)
after(async function() {
	await browserHelper.close();
});
