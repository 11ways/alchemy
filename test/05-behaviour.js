var assert = require('assert');

describe('RevisionBehaviour', function() {
	var alpha_record,
	    Bird;

	before(function(next) {
		next = Function.regulate(next);

		Bird = Function.inherits('Alchemy.Model', function Bird(options) {
			Bird.super.call(this, options);
		});

		Bird.constitute(function addFields() {
			this.addField('name', 'String');
			this.addField('age',  'Number');
			this.addField('colours', 'String', {array: true});

			this.addBehaviour('revision');

			next();
		});
	});

	describe('.attached(schema, new_options)', function() {
		it('should add a new __r field to the attached model', function() {

			let __r = Bird.schema.getField('__r');

			assert.strictEqual(__r instanceof Classes.Alchemy.FieldType, true);
			assert.strictEqual(__r.title, 'Revision');
		});

		it('should create a new Model for this revision data', function() {

			let bird = Model.get('Bird'),
			    behaviours = bird.behaviours,
			    rev_model = bird.getBehaviour('revision').revision_model;

			assert.strictEqual(rev_model.name, 'BirdDataRevision');
		});
	});

	describe('#afterSave(record, options, created)', function() {
		var bird;

		it('should add a revision number to each saved record of the attached model', async function() {

			bird = Model.get('Bird');

			let records = await bird.save({name: 'alpha', age: 3});
			let record = records[0];
			alpha_record = record;

			assert.strictEqual(record.$main.__r, 0, 'A new record should have a revision property of 0');
			assert.strictEqual(record.__r, 0, 'A getter should be set for the __r property');
		});

		it('should increment the revision number on each save', async function() {

			alpha_record.age = 4;
			let record = await alpha_record.save();

			assert.strictEqual(record.__r, 1, 'The saved record should have an increased __r revision');
			assert.strictEqual(alpha_record.__r, 1, 'The original record should also have the increased revision');
		});
	});

	describe('#revision_model', function() {
		var bird_dr,
		    bird;

		it('should contain revision data', async function() {

			bird = Model.get('Bird');
			bird_dr = Model.get('BirdDataRevision');

			let records = await bird_dr.find('all');

			assert.strictEqual(records.length, 2, 'There should be 2 revision records already: one for the create & one for the update');

			let created_revision = records[0];
			let updated_revision = records[1];

			assert.strictEqual(String(created_revision.record_id).isObjectId(), true);
			assert.strictEqual(String(updated_revision.record_id).isObjectId(), true);

			assert.strictEqual(String(created_revision.record_id), String(alpha_record._id));
			assert.strictEqual(String(updated_revision.record_id), String(alpha_record._id));

			let created_delta = created_revision.delta;
			let updated_delta = updated_revision.delta;

			for (let key in created_delta) {
				assert.strictEqual(created_delta[key].length, 1, 'The delta arrays for the created save should have only 1 entry');
			}

			assert.strictEqual(String(created_delta._id[0]), String(created_revision.record_id));
			assert.strictEqual(String(created_delta.created[0]), String(alpha_record.created));

			assert.strictEqual(created_delta.name[0], 'alpha');
			assert.strictEqual(created_delta.age[0], 3);
			assert.strictEqual(created_delta.__r[0], 0);

			// Now the updated revision
			assert.deepStrictEqual(Object.keys(updated_delta), ['updated', 'age', '__r'], 'Only these 3 fields should have changed');

			assert.deepStrictEqual(updated_delta.age, [3, 4]);
			assert.deepStrictEqual(updated_delta.__r, [0, 1]);
		});
	});
});