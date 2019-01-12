var assert = require('assert'),
    MongoUnit = require('mongo-unit'),
    libpath = require('path'),
    fs = require('fs'),
    mongo_uri;

// Make sure janeway doesn't start
process.env.DISABLE_JANEWAY = 1;

// Make MongoUnit a global
global.MongoUnit = MongoUnit;

// Require alchemymvc
require('../index.js');

describe('require(\'alchemymvc\')', function() {
	it('should create the global alchemy object', function() {
		assert.equal('object', typeof alchemy);
	});
});

describe('Mongo-unit setup', function() {
	this.timeout(70000)

	it('should create in-memory mongodb instance first', async function() {

		var url = await MongoUnit.start();

		mongo_uri = url;

		if (!url) {
			throw new Error('Failed to create mongo-unit instance');
		}
	});
});

describe('Alchemy', function() {

	describe('#start(callback)', function() {
		it('should start the server', function(done) {
			alchemy.start({silent: true}, function started() {
				done();
			});

			// Also create the mongodb datasource
			Datasource.create('mongo', 'default', {uri: mongo_uri});
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
		});
	});

	describe('#styleMiddleware(req, res, next)', function() {

		if (process.platform == 'win32') {
			// @TODO: Fix!
			return;
		}

		it('is the middleware that compiles & serves CSS, LESS & SCSS files', function(done) {
			var url = 'http://localhost:' + alchemy.settings.port + '/stylesheets/alchemy-info.css';

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

			var url = 'http://localhost:' + alchemy.settings.port + '/scripts/test.js';

			Blast.fetch(url, function gotResponse(err, res, body) {

				if (err) {
					return done(err);
				}

				assert.strictEqual(res.statusCode, 200);
				assert.strictEqual(res.headers['content-type'], 'application/javascript; charset=utf-8');
				assert.strictEqual(body.length > 20, true);
				done();
			});
		});
	});

	describe('#downloadFile(url, options, callback)', function() {
		it('should download the file and return the filepath', function(done) {

			var url = 'http://localhost:' + alchemy.settings.port + '/scripts/test.js';

			alchemy.downloadFile(url, function downloaded(err, filepath, name) {

				if (err) {
					throw err;
				}

				if (!filepath) {
					throw new Error('File does not seem to have downloaded');
				}

				assert.strictEqual(name, 'test.js');

				var fs_path = libpath.resolve(__dirname, 'assets', 'scripts', 'test.js'),
				    result = fs.readFileSync(fs_path, 'utf8');

				if (result.indexOf('This is a test script') == -1) {
					throw new Error('Test script file does not contain expected content');
				}

				done();
			});
		});

		it('should return a 404 error when downloading non-existing path', function(done) {
			alchemy.downloadFile('http://localhost:' + alchemy.settings.port + '/scripts/does_not_exist.js', function downloaded(err, filepath, name) {

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