var assert = require('assert');

describe('Teardown', function() {
	it('should stop the services', async function() {

		// Handle coverage first (before stopping services)
		if (global.__coverage__) {
			let count = await browserHelper.writeCoverageFiles();

			if (count === 0) {
				throw new Error('The browser-side coverage object was empty');
			}

			await Pledge.after(500);
		}

		// Use the harness to stop everything
		await harness.stop();
	});
});
