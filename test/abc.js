var assert = require('assert');

// Make sure janeway doesn't start
process.env.DISABLE_JANEWAY = 1;

// Require alchemymvc
require('../index.js');

describe('Alchemy Init', function() {

	it('require("alchemy") should create the global alchemy object', function() {
		assert.equal('object', typeof alchemy);
	});

	it('should have returned bound functions', function(done) {
		alchemy.start({silent: true}, function started() {
			done();
		});
	});
});
