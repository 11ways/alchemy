var assert = require('assert');

describe('DocumentList', function() {

	describe('#clone()', function() {
		it('should clone the list and all the documents', function() {

			var clone = two_person_list.clone();

			// These should be equal
			assert.strictEqual(clone[0].firstname, two_person_list[0].firstname);
			assert.strictEqual(clone[1].firstname, two_person_list[1].firstname);

			clone[0].firstname = 'first_firstname';

			assert.notStrictEqual(clone[0].firstname, two_person_list[0].firstname);
			assert.strictEqual(clone[1].firstname, two_person_list[1].firstname);
		});
	});

});