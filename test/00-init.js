var assert = require('assert'),
    MongoUnit = require('mongo-unit'),
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
			assert.strictEqual(alchemy.pathResolve('/a', 'b', 'c'), '/a/b/c');
			assert.strictEqual(alchemy.pathResolve('/a'), '/a');
		});
	});

	describe('#addViewDirectory(path, weight = 10)', function() {
		it('adds a new view directory', function() {
			let test_views = alchemy.pathResolve(__filename, '..', 'view');
			alchemy.addViewDirectory(test_views);
		});
	});
});