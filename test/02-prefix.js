var assert = require('assert');

describe('Prefix', function() {

	describe('.all()', function() {
		it('should return an empty object when no prefixes have been added', function() {
			assert.deepStrictEqual(Prefix.all(), {});
		});
	});

	describe('.add()', function() {

		it('should add prefixes', function() {

			Prefix.add('nl', {
				locale: 'nl',
				fallback: ['en']
			});

			Prefix.add('en', {
				locale: 'en',
				fallback: false
			});

			let all = Prefix.all();

			assert.strictEqual(Object.keys(all).length, 2, 'Two prefixes should have been added');
		});
	});
});