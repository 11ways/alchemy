var assert = require('assert');

describe('StringFieldType', function() {

	var schema,
	    field;

	before(function() {
		schema = new Classes.Alchemy.Schema();
		field = new Classes.Alchemy.StringFieldType(schema, 'test');
	});

	describe('#cast(value)', function() {
		it('should cast the given value to a string', function() {
			assert.strictEqual(field.cast(1), '1');
			assert.strictEqual(field.cast('a'), 'a');
		});
	});

});