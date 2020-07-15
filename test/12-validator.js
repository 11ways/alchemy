var assert = require('assert'),
    House;

describe('Validator.NotEmpty', function() {

	it('should be added to a Model', function(done) {

		House = Function.inherits('Alchemy.Model', function House(options) {
			House.super.call(this, options);
		});

		House.constitute(function addFields() {

			this.addField('street', 'String');

			let inhabitant = new Classes.Alchemy.Schema(this);

			inhabitant.addField('firstname', 'String');
			inhabitant.addField('lastname', 'String');
			inhabitant.addField('languages', 'String', {array: true});

			this.addField('inhabitants', inhabitant, {array: true});

			this.addRule('NotEmpty', {fields: [
				'street',
				'inhabitants.firstname',
				'inhabitants.languages'
			]});

			done();
		});
	});

	it('should work with nested structures', async function() {

		let house = Model.get('House').createDocument(),
		    caught_err,
		    violation,
		    prev_err;

		try {
			await house.save();
		} catch (err) {
			caught_err = err;
		}

		assert.strictEqual(!!caught_err, true, 'An error should have been thrown while trying to save this record');
		assert.strictEqual(caught_err instanceof Blast.Classes.Alchemy.Error.Validation.Violations, true, 'A `Violations` error should have been thrown');
		assert.strictEqual(caught_err.length, 1, 'The `Violations` error should contain 1 violation');

		violation = caught_err.violations[0];

		assert.strictEqual(violation.field_name, 'street', 'The error should have been thrown for the "street" field');
		assert.strictEqual(violation.path, 'street', 'The error should have been thrown for the "street" path');

		// This should fix the validation error for the "street" field
		house.street = 'Onderstraat';

		// And this should create 2 new validation errors!
		house.inhabitants = [
			{
				lastname: 'De Loecker'
			}
		];

		prev_err = caught_err;
		caught_err = null;

		try {
			await house.save();
		} catch (err) {
			caught_err = err;
		}

		assert.notStrictEqual(caught_err, prev_err, 'The "street" error should not have been thrown again');
		violation = caught_err.violations[0];

		assert.notStrictEqual(violation.field_name, 'street', 'The "street" error should have been fixed');

		assert.strictEqual(!!caught_err, true, 'An error should have been thrown while trying to save this record');
		assert.strictEqual(caught_err instanceof Blast.Classes.Alchemy.Error.Validation.Violations, true, 'A `Violations` error should have been thrown');
		assert.strictEqual(caught_err.length, 2, 'The `Violations` error should contain 2 violations');

		violation = caught_err.violations[0];

		assert.strictEqual(violation.path, 'inhabitants.0.firstname');
		assert.strictEqual(violation.field_name, 'firstname');
		assert.strictEqual(violation.value, undefined);

		violation = caught_err.violations[1];

		assert.strictEqual(violation.path, 'inhabitants.0.languages');
		assert.strictEqual(violation.field_name, 'languages');
		assert.strictEqual(violation.value, undefined);

		house.inhabitants[0].firstname = 'Jelle';

		caught_err = null;

		try {
			await house.save();
		} catch (err) {
			caught_err = err;
		}

		violation = caught_err.violations[0];

		assert.strictEqual(!!caught_err, true, 'An error should have been thrown while trying to save this record');
		assert.strictEqual(caught_err instanceof Blast.Classes.Alchemy.Error.Validation.Violations, true, 'A `Violations` error should have been thrown');
		assert.strictEqual(caught_err.length, 1, 'The `Violations` error should contain 1 violation');

		assert.strictEqual(violation.path, 'inhabitants.0.languages');
		assert.strictEqual(violation.field_name, 'languages');
		assert.strictEqual(violation.value, undefined);

		// Add an empty string as a language
		// This should actually NOT throw an error because the field (an array)
		// is no longer empty
		house.inhabitants[0].languages = [''];

		caught_err = null;

		try {
			await house.save();
		} catch (err) {
			caught_err = err;
		}

		assert.strictEqual(!!caught_err, false, 'No error should have been thrown');
	});


});