var assert   = require('assert');
require('alchemymvc');

describe('Alchemy Init', function() {

	it('require("alchemy") should create the global alchemy object', function() {
		assert.equal('object', typeof alchemy);
	});

	it('should have returned bound functions', function(done) {
		alchemy.start(function() {

		});
	});
});
