var assert = require('assert'),
    fs = require('fs');

describe('Teardown', function() {
	it('should stop the services', async function() {
		MongoUnit.stop();
		alchemy.stop();

		if (global.__coverage__) {
			let coverage = await fetchCoverage();
			fs.writeFileSync('./.nyc_output/alchemy-client-file.json', JSON.stringify(coverage));
		}

	});
});