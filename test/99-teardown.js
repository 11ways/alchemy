var assert = require('assert'),
    fs = require('fs');

describe('Teardown', function() {
	it('should stop the services', async function() {
		MongoUnit.stop();
		alchemy.stop();

		if (global.__coverage__) {
			let coverages = await fetchCoverage();

			if (!coverages || coverages.length == 0) {
				throw new Error('The browser-side coverage object was empty');
			}

			let i;

			for (i = 0; i < coverages.length; i++) {
				fs.writeFileSync('./.nyc_output/alchemy_' + i + '.json', JSON.stringify(coverages[i]));
			}

			await Pledge.after(500);
		}

	});
});