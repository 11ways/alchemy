var assert = require('assert');

describe('Teardown', function() {
	it('should stop the services', function() {
		MongoUnit.stop();
		alchemy.stop();
	});
});