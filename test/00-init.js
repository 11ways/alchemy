/* istanbul ignore file */
const MongoUnit = require('mongo-unit'),
      puppeteer = require('puppeteer'),
      libpath   = require('path'),
      assert    = require('assert'),
      fs        = require('fs');

let mongo_uri;

let test_script_path = libpath.resolve(__dirname, 'assets', 'scripts', 'test.js');

let navigations = 0,
    coverages = [];

// Make sure janeway doesn't start
process.env.DISABLE_JANEWAY = 1;

// Make MongoUnit a global
global.MongoUnit = MongoUnit;

global.do_coverage = !!global.__coverage__;

// Do not log load warnings
process.env.NO_ALCHEMY_LOAD_WARNING = 1;

process.env.PATH_ROOT = libpath.resolve(__dirname, 'test_root');

// Require alchemymvc
require('../index.js');

let connect = false;

async function loadBrowser() {

	if (connect) {
		global.browser = await puppeteer.connect({
			'browserURL': 'http://127.0.0.1:9333/',
			defaultViewport: {
				width: 1680,
				height: 1050,
			},
			devtools: true,
		});
	} else {
		global.browser = await puppeteer.launch({
			headless: 'new',
		});
	}

	global.page = await browser.newPage();

	page.on('console', function(msg) {

		// Only needed when writing new tests
		return;

		let pieces = ['[BROWSER]'],
		    args = msg.args();

		for (arg of args) {
			let remote = arg._remoteObject;

			if (remote.type == 'string') {
				pieces.push(remote.value);
			} else if (remote.subtype == 'node') {
				pieces.push('\x1b[1m\x1b[36m<' + remote.description + '>\x1b[0m');
				//console.log(remote.preview);
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
}

let console_log = console.log;
let console_error = console.error;

global.restoreConsole = function restoreConsole() {
	console.log = console_log;
	console.error = console_error;
};

global.silenceConsole = function silenceConsole() {
	console.log = () => {};
	console.error = () => {};
}

global.fetchCoverage = async function fetchCoverage() {

	if (!global.page) {
		return;
	}

	let temp = await page.evaluate(function getCoverage() {

		if (typeof window.__Protoblast == 'undefined') {
			return false;
		}

		return window.__coverage__;
	});

	if (temp) {
		coverages.push(temp);
	} else if (temp !== false) {
		console.log('Failed to get coverage from browser');
	}

	return coverages;
};

global.setLocation = async function setLocation(path) {

	let url;

	if (!global.page) {
		await loadBrowser();
	}

	if (navigations && do_coverage) {
		await fetchCoverage();
	}

	navigations++;

	if (alchemy) {
		// Force exposing the defaults each time,
		// because we add routes on-the-fly during testing
		alchemy.exposeDefaultStaticVariables();
	}

	if (path.indexOf('http') == -1) {
		url = 'http://127.0.0.1:' + alchemy.settings.network.port + path;
	} else {
		url = path;
	}

	let resource = await page.goto(url);

	let status = await resource.status();

	if (status >= 400) {
		throw new Error('Received a ' + status + ' error response for "' + path + '"')
	}
};

global.getDocumentHTML = async function getDocumentHTML() {
	return await evalPage(function() {
		return document.documentElement.outerHTML;
	});
};

global.evalPage = function evalPage(fnc, ...args) {
	return page.evaluate(fnc, ...args);
};

global.getElementHandle = function getElementHandle(query) {
	return page.$(query);
};

global.despace = function despace(text) {
	return text.trim().replace(/\n/g, ' ').replace(/\s\s+/g, ' ');
};

global.getRouteUrl = function getRouteUrl(route, options) {

	let url = Router.getUrl(route, options);

	url.host = 'localhost';
	url.protocol = 'http';
	url.port = alchemy.settings.network.port;

	return String(url);
};

global.queryElementData = async function queryElementData(query) {

	let result = await evalPage(function(query) {
		let block = document.querySelector(query);

		if (!block) {
			return false;
		}

		let result = {
			html       : block.outerHTML,
			text       : block.textContent,
			location   : document.location.pathname,
			scroll_top : document.scrollingElement.scrollTop,
		};

		return result;
	}, query);

	return result;
};

global.openHeUrl = async function openHeUrl(path) {

	await evalPage(function(path) {
		return hawkejs.scene.openUrl(path);
	}, path);

	let result = await evalPage(function() {
		return {
			location : document.location.pathname,
		}
	});

	return result;
};

global.getBodyHtml = function getBodyHtml() {
	return global.evalPage(function() {
		return document.body.innerHTML;
	});
};

global.createModel = function createModel(creator) {

	let name = creator.name,
	    pledge = new Classes.Pledge();

	let fnc = Function.create(name, function model(options) {
		model.wrapper.super.call(this, options);
	});

	Function.inherits('Alchemy.Model', fnc);

	fnc.constitute(function() {
		creator.call(this);
		pledge.resolve();
	});

	return pledge;
};

global.setElementValue = async function setElementValue(query, value) {

	let result = await evalPage(function(query, value) {
		let element = document.querySelector(query);

		if (!element) {
			return false;
		}

		element.value = value;

		let result = {
			html       : element.outerHTML,
			text       : element.textContent,
			location   : document.location.pathname,
			scroll_top : document.scrollingElement.scrollTop,
			value      : element.value,
		};

		return result;
	}, query, value);

	return result;
};

global.setFileInputPath = async function setFileInputPath(query, path) {

	let handle = await getElementHandle(query);

	if (!handle) {
		return false;
	}

	return handle.uploadFile(path);
};

global.setFileInputBlob = async function setFileInputBlob(query, content) {

	let result = await evalPage(function(query, content) {
		let element = document.querySelector(query);

		if (!element) {
			return false;
		}

		element.files = [new File([new Blob([content], {type: 'text/plain'})], 'test.txt', {type: 'text/plain'})];

		let result = {
			html       : element.outerHTML,
			text       : element.textContent,
			location   : document.location.pathname,
			scroll_top : document.scrollingElement.scrollTop,
			value      : element.value,
		};

		return result;
	}, query, content);

	return result;

};

global.setElementValueOrThrow = async function setElementValueOrThrow(query, value) {

	let result = await setElementValue(query, value);

	if (!result) {
		throw new Error('Failed to find the `' + query + '` element, unable to set value to "' + value + '"');
	}

	if (result.value != value) {
		throw new Error('The `' + query + '` element has the value "' + result.value + '", but "' + value + '" was expected');
	}

	return result;
};

global.clickElement = async function clickElement(query) {

	let result = await evalPage(function(query) {
		let element = document.querySelector(query);

		if (!element) {
			return false;
		}

		element.click();

		return true;
	}, query);

	return result;
};

describe('require(\'alchemymvc\')', function() {
	it('should create the global STAGES instance', function() {
		assert.equal('object', typeof STAGES);
	});
});

describe('Mongo-unit setup', function() {
	this.timeout(150000)

	it('should create in-memory mongodb instance first', async function() {

		var url = await MongoUnit.start({verbose: false});

		mongo_uri = url;

		if (!url) {
			throw new Error('Failed to create mongo-unit instance');
		}
	});
});

describe('Alchemy', function() {

	describe('#start(callback)', function() {
		it('should start the server', function(done) {

			alchemy.setSetting('network.port', 3470);
			alchemy.setSetting('performance.postpone_requests_on_overload', false);

			STAGES.getStage('datasource').addPostTask(() => {
				Datasource.create('mongo', 'default', {uri: mongo_uri});
			});

			STAGES.getStage('load_core').addPostTask(async () => {

				let pledge = alchemy.start({silent: true}, function started() {
					done();
				});
			});
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

		it('is the middleware that compiles & serves CSS, LESS & SCSS files', function(done) {
			var url = 'http://localhost:' + alchemy.settings.network.port + '/stylesheets/alchemy-info.css';

			Blast.fetch(url, function gotResponse(err, res, body) {

				if (err) {
					return done(err);
				}

				assert.strictEqual(res.statusCode, 200);
				assert.strictEqual(res.headers['content-type'], 'text/css; charset=utf-8');
				assert.strictEqual(body.length > 100, true);
				done();
			});
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

		// @TODO: There no longer is a simple alchemy.js script file,
		// should test with something else
		it('is the middleware that serves script files', function(done) {

			var url = 'http://localhost:' + alchemy.settings.network.port + '/scripts/test.js';

			Blast.fetch(url, function gotResponse(err, res, body) {

				if (err) {
					return done(err);
				}

				assert.strictEqual(res.statusCode, 200);
				assert.strictEqual(res.headers['content-type'], 'text/javascript; charset=utf-8');
				assert.strictEqual(body.length > 20, true);
				done();
			});
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

			var url = 'http://localhost:' + alchemy.settings.network.port + '/scripts/test.js';

			let file = await alchemy.download(url);

			assert.strictEqual(file.name, 'test.js');
			assert.strictEqual(await file.getMimetype(), 'text/javascript');
			
			let result = await file.readString('utf8');

			if (result.indexOf('This is a test script') == -1) {
				throw new Error('Test script file does not contain expected content');
			}
		});

		it('should return a 404 error when downloading non-existing path', function(done) {
			alchemy.downloadFile('http://localhost:' + alchemy.settings.network.port + '/scripts/does_not_exist.js', function downloaded(err, filepath, name) {

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
				// @TODO: Sole this in some way?
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
	if (global.browser && !connect) {
		await browser.close();
	}
});