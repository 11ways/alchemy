var assert = require('assert');

describe('RevisionBehaviour', function() {
	var alpha_second_version,
	    alpha_record,
	    Bird,
	    bird;

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

			bird = Model.get('Bird');

			let behaviours = bird.behaviours,
			    rev_model = bird.getBehaviour('revision').revision_model;

			assert.strictEqual(rev_model.name, 'BirdDataRevision');
		});
	});

	describe('#afterSave(record, options, created)', function() {

		it('should add a revision number to each saved record of the attached model', async function() {

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

	describe('#revision_model_class', function() {
		it('returns a class constructor of the revision data model for the attached model', function() {

			var bird_a = Model.get('Bird'),
			    bird_b = Model.get('Bird');

			assert.strictEqual(bird_a.getBehaviour('revision'), bird_a.getBehaviour('Revision'), 'An instance should return the same behaviour instance');
			assert.notStrictEqual(bird_a.getBehaviour('revision'), bird_b.getBehaviour('revision'), 'Two different instances should return different behaviour instances');

			let class_a = bird_a.getBehaviour('revision').revision_model_class,
			    class_b = bird_b.getBehaviour('revision').revision_model_class;

			assert.strictEqual(class_a, class_b);
		});
	});

	describe('#revision_model', function() {
		var bird_dr;

		it('should contain revision data', async function() {

			bird_dr = Model.get('BirdDataRevision');

			let records = await bird_dr.find('all');

			assert.strictEqual(records.length, 2, 'There should be 2 revision records already: one for the create & one for the update');

			let created_revision = records[0];
			let updated_revision = records[1];

			assert.strictEqual(String(created_revision.record_id).isObjectId(), true);
			assert.strictEqual(String(updated_revision.record_id).isObjectId(), true);

			assert.strictEqual(String(created_revision.record_id), String(alpha_record._id));
			assert.strictEqual(String(updated_revision.record_id), String(alpha_record._id));

			assert.strictEqual(created_revision.revision, 0);
			assert.strictEqual(updated_revision.revision, 1);

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

			alpha_second_version = await bird.find('first');
		});
	});

	describe('Document#revert(revisions)', function() {
		it('should revert an amount of versions', async function() {

			let record = await bird.find('first');
			let alpha_third_version = await bird.find('first');

			alpha_third_version.name = 'alpha_three';
			alpha_third_version.age = 5;
			await alpha_third_version.save();

			let to_revert = await bird.find('first');

			assert.strictEqual(alpha_second_version.name, 'alpha');
			assert.strictEqual(to_revert.name, 'alpha_three');
			assert.strictEqual(to_revert.age, 5);
			assert.strictEqual(to_revert.__r, 2);

			// Revert 2 versions
			await to_revert.revert(2);

			assert.strictEqual(to_revert.name, 'alpha');
			assert.strictEqual(to_revert.age, 3);
			assert.strictEqual(to_revert.__r, 0);
		});

		it('should default to 1 revert', async function() {

			let to_revert = await bird.find('first');

			// Should still be the latest version
			assert.strictEqual(alpha_second_version.name, 'alpha');
			assert.strictEqual(to_revert.name, 'alpha_three');
			assert.strictEqual(to_revert.age, 5);
			assert.strictEqual(to_revert.__r, 2);

			// Revert 1 revision
			await to_revert.revert();

			assert.strictEqual(to_revert.name, 'alpha');
			assert.strictEqual(to_revert.age, 4);
			assert.strictEqual(to_revert.__r, 1);
		});
	});
});

describe('PublishableBehaviour', function() {
	var PublishablePost,
	    PreparedPost;

	before(function(next) {
		next = Function.regulate(next);

		Function.parallel(function(next) {

			PublishablePost = Function.inherits('Alchemy.Model', function PublishablePost(options) {
				PublishablePost.super.call(this, options);
			});

			PublishablePost.constitute(function addFields() {
				this.addField('name', 'String');
				this.addField('body', 'Text');

				this.addBehaviour('publishable');

				next();
			});
		}, function(next) {

			PreparedPost = Function.inherits('Alchemy.Model', function PreparedPost(options) {
				PreparedPost.super.call(this, options);
			});

			PreparedPost.constitute(function addFields() {
				this.addField('name', 'String');
				this.addField('body', 'Text');
				this.addField('publish_date', 'Datetime', {title: 'My publish date'});

				this.addBehaviour('publishable');

				next();
			});
		}, next);
	});

	describe('.attached(schema, new_options)', function() {
		it('should add a publish_date field if it does not yet exist', function() {

			let pd_field = PublishablePost.schema.getField('publish_date');

			assert.strictEqual(pd_field instanceof Classes.Alchemy.FieldType, true);
			assert.strictEqual(pd_field.title, 'Publish date');
		});

		it('should use the existing publish_date field if already added', function() {

			let pd_field = PreparedPost.schema.getField('publish_date');

			assert.strictEqual(pd_field instanceof Classes.Alchemy.FieldType, true);
			assert.strictEqual(pd_field.title, 'My publish date');
		});
	});

	describe('#beforeFind(options)', function() {

		var no_pd_doc,
		    future_doc,
		    PP;

		it('needs some documents first', async function() {

			PP = Model.get('PublishablePost');

			let doc = PP.createDocument();

			doc.name = 'No publish date';
			doc.body = 'body';

			await doc.save();

			no_pd_doc = await PP.findById(doc._id);

			assert.strictEqual(String(no_pd_doc._id), String(doc._id));

			doc = PP.createDocument();
			doc.name = 'Future';
			doc.body = 'future';

			let future_date = new Date();
			future_date.add(1, 'week');

			doc.publish_date = future_date;

			await doc.save();

			future_doc = await PP.findById(doc._id);

			assert.strictEqual(String(future_doc.publish_date), String(doc.publish_date));
		});

		it('should find all documents by default', async function() {

			let records = await PP.find('all');

			assert.strictEqual(records.length, 2);
		});

		it('should only find currently publishable documents when the `publish_date` option is true', async function() {

			let records = await PP.find('all', {publish_date: true});

			assert.strictEqual(records.length, 1, 'Only 1 document should have been returned');
			assert.strictEqual(String(records[0]._id), String(no_pd_doc._id), 'The returned document should have been the one without a date');
		});

		it('should find all documents published at the given `publish_date`', async function() {

			let records,
			    date;

			date = new Date();
			date.add(2, 'weeks');

			records = await PP.find('all', {publish_date: date});

			assert.strictEqual(records.length, 2);
		});

		it('should work when conditions are already given', async function() {

			let records = await PP.find('all', {
				publish_date: true,
				conditions: {
					$and: {
						body: 'body'
					}
				}
			});

			assert.strictEqual(records.length, 1);

			records = await PP.find('all', {
				publish_date: true,
				conditions: {
					$and: [{
						body: 'body'
					}]
				}
			});

			assert.strictEqual(records.length, 1);
		});
	});
});

describe('SluggableBehaviour', function() {
	var SlugPost,
	    SlugPostOther,
	    SlugPostExisting;

	before(function(next) {
		next = Function.regulate(next);

		Function.parallel(function(next) {

			SlugPost = Function.inherits('Alchemy.Model', function SlugPost(options) {
				SlugPost.super.call(this, options);
			});

			SlugPost.constitute(function addFields() {
				this.addField('name', 'String');
				this.addField('body', 'Text');

				this.addBehaviour('sluggable');

				next();
			});
		}, function(next) {

			SlugPostOther = Function.inherits('Alchemy.Model', function SlugPostOther(options) {
				SlugPostOther.super.call(this, options);
			});

			SlugPostOther.constitute(function addFields() {
				this.addField('name', 'String');
				this.addField('body', 'Text');

				this.addBehaviour('sluggable');

				next();
			});
		}, function(next) {
			SlugPostExisting = Function.inherits('Alchemy.Model', function SlugPostExisting(options) {
				SlugPostExisting.super.call(this, options);
			});

			SlugPostExisting.constitute(function addFields() {
				this.addField('name', 'String');
				this.addField('body', 'Text');
				this.addField('slug', 'String', {title: 'Sluggish'})

				this.addBehaviour('sluggable');

				next();
			});
		}, next);
	});

	describe('.attached(schema, new_options)', function() {
		it('should add a slug field if it does not yet exist', function() {

			let slug_field = SlugPost.schema.getField('slug');

			assert.strictEqual(slug_field instanceof Classes.Alchemy.FieldType, true);
			assert.strictEqual(slug_field.title, 'Slug');
		});

		it('should use the existing slug field if already added', function() {

			let slug_field = SlugPostExisting.schema.getField('slug');

			assert.strictEqual(slug_field instanceof Classes.Alchemy.FieldType, true);
			assert.strictEqual(slug_field.title, 'Sluggish');
		});
	});

	describe('#beforeSave(date, options, creating)', function() {

		var sp_model;

		before(function() {
			sp_model = new SlugPost();
		});

		it('should have generated a slug for new records', async function() {

			var doc = sp_model.createDocument();

			doc.name = 'This is a document';
			doc.body = 'This is the body';

			await doc.save();

			assert.strictEqual(doc.slug, 'this-is-a-document');
			assert.strictEqual(String(doc._id).isObjectId(), true);
		});

		it('should have generated a different slug for a record with the same name', async function() {

			var doc = sp_model.createDocument();

			doc.name = 'This is a document';
			doc.body = 'This is the body of the other document';

			await doc.save();

			assert.strictEqual(doc.slug, 'this-is-a-document-2');
			assert.strictEqual(String(doc._id).isObjectId(), true);

			doc = sp_model.createDocument();
			doc.name = 'This is a document';
			doc.body = 'This is the body of the third document with the same name';

			await doc.save();

			assert.strictEqual(doc.slug, 'this-is-a-document-3');
			assert.strictEqual(String(doc._id).isObjectId(), true);
		});

	});

});