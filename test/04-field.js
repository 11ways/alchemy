var assert = require('assert');
const { cp } = require('fs');

function sameContents(a, b, message) {

	if (!a && a !== b) {
		throw new Error(message);
	}

	let i;

	for (i = 0; i < a.length; i++) {
		assert.strictEqual(a[i], b[i], message + ' (array length: ' + a.length + ')');
	}

	for (i = 0; i < b.length; i++) {
		assert.strictEqual(a[i], b[i], message + ' (array length: ' + a.length + ')');
	}
}

describe('Field', function() {

	describe('translatable fields', function() {

		it('handles translatable fields', async function() {

			var model = Model.get('WithTranslation'),
			    doc = model.createDocument();

			doc.name = 'name';
			doc.title = 'title';

			await doc.save();

			let saved_doc = await model.find('first');

			assert.strictEqual(typeof saved_doc.title, 'object');
			assert.strictEqual(saved_doc.title.__, 'title', 'Should have saved the title under the __ prefix');

			// @TODO: should have overwritten the saved doc
			//assert.strictEqual(doc.title.__, saved_doc.title.__);
		});

		it('translates fields when needed', async function() {

			var model = Model.get('WithTranslation'),
			    doc = model.createDocument();

			doc.name = 'with-translations';

			doc.title = {
				en: 'title',
				nl: 'titel'
			};

			doc.items = [
				{
					foobar: {
						en: 'one',
						nl: 'een'
					}
				},
				{
					foobar: {
						en: 'two',
						nl: 'twee'
					}
				}
			];

			await doc.save();

			doc = await model.findByValues({
				name : 'with-translations'
			});

			assert.strictEqual(doc.name, 'with-translations');

			assert.deepStrictEqual(doc.title, {
				en: 'title',
				nl: 'titel'
			});

			assert.deepStrictEqual(doc.items, [
				{
					foobar: {
						en: 'one',
						nl: 'een'
					}
				},
				{
					foobar: {
						en: 'two',
						nl: 'twee'
					}
				}
			]);

			let crit = model.find();
			crit.setOption('locale', 'nl');
			crit.where('name').equals('with-translations');

			let nl = await model.find('first', crit);

			assert.strictEqual(nl.title, 'titel');

			assert.deepStrictEqual(nl.items, [
				{
				  foobar: 'een',
				  _prefix_foobar: 'nl',
				  '$translated_fields': { foobar: 'nl' }
				},
				{
				  foobar: 'twee',
				  _prefix_foobar: 'nl',
				  '$translated_fields': { foobar: 'nl' }
				}
			]);

			crit = model.find();
			crit.setOption('locale', 'en');
			crit.where('name').equals('with-translations');

			let en = await model.find('first', crit);

			assert.strictEqual(en.title, 'title');

			assert.deepStrictEqual(en.items, [
				{
					foobar: 'one',
					_prefix_foobar: 'en',
					'$translated_fields': { foobar: 'en' }
				},
				{
					foobar: 'two',
					_prefix_foobar: 'en',
					'$translated_fields': { foobar: 'en' }
				}
			]);

		});
	});

	describe('#path', function() {
		it('gets the path in the main document', async function() {

			let WithSchema = Model.get('WithSchemaField');

			let name_field = WithSchema.getField('name');
			assert.strictEqual(name_field.path, 'name');

			let subschema_field = WithSchema.getField('subschema');
			assert.strictEqual(subschema_field.path, 'subschema');

			let subname_field = WithSchema.getField('subschema.subname');
			assert.strictEqual(subname_field.path, 'subschema.subname');

			let entryname_in_arr_field = WithSchema.getField('entries.entryname');
			assert.strictEqual(entryname_in_arr_field.path, 'entries.entryname');

			let sub_sub_field = WithSchema.getField('entries.sub_sub');
			assert.strictEqual(sub_sub_field.path, 'entries.sub_sub');

			let sub_sub_lorem_field = WithSchema.getField('entries.sub_sub.lorem');
			assert.strictEqual(sub_sub_lorem_field.path, 'entries.sub_sub.lorem');

			let sub_nip_test = WithSchema.getField('entries.sub_nip.test');
			assert.strictEqual(sub_nip_test.path, 'entries.sub_nip.test');
		});
	});

	describe('#getFieldChain()', function() {
		it('should return the current field and all its ancestors', function() {

			let WithSchema = Model.get('WithSchemaField');

			let name_field = WithSchema.getField('name');
			let entries_field = WithSchema.getField('entries');
			let sub_sub_field = WithSchema.getField('entries.sub_sub');
			let lorem_field = WithSchema.getField('entries.sub_sub.lorem');

			sameContents(name_field.getFieldChain(), [name_field], 'Expected an array with the "name" field');
			sameContents(entries_field.getFieldChain(), [entries_field], 'Expected an array with the "entries" field');
			sameContents(sub_sub_field.getFieldChain(), [entries_field, sub_sub_field], 'Expected an array with the "entries" and "sub_sub" field');
			sameContents(lorem_field.getFieldChain(), [entries_field, sub_sub_field, lorem_field], 'Expected an array with the "entries", "sub_sub" and "lorem" field');
		});
	});

	describe('#getFieldValues(document)', function() {
		it('should return all the values of this field in the document', async function() {

			let WithSchema = Model.get('WithSchemaField'),
			    doc = WithSchema.createDocument();

			let name_field = WithSchema.getField('name');
			let entries_field = WithSchema.getField('entries');
			let sub_sub_field = WithSchema.getField('entries.sub_sub');
			let lorem_field = WithSchema.getField('entries.sub_sub.lorem');

			let values = name_field.getDocumentValues(doc);

			assert.strictEqual(values.length, 1, 'Even when the value is undefined, it should be returned');
			assert.strictEqual(values[0].value, undefined);

			doc.name = 'Jelle';

			values = name_field.getDocumentValues(doc);

			assert.strictEqual(values.length, 1, 'Only 1 result is expected for the "name" field');

			assert.strictEqual(values[0].field.name, 'name');
			assert.strictEqual(values[0].value, 'Jelle');
			assert.strictEqual(values[0].path, 'name');

			doc.entries = [];

			values = entries_field.getDocumentValues(doc);

			assert.strictEqual(values.length, 1, 'Even empty array fields should return at least 1 undefined value');
			assert.strictEqual(values[0].value, undefined);

			doc.entries = [
				{
					sub_sub: [
						{lorem: 0},
						{lorem: 1},
						{lorem: 2}
					]
				}, {
					sub_sub: [
						{lorem: 3}
					]
				}
			];

			values = lorem_field.getDocumentValues(doc);

			assert.strictEqual(values[0].field.name, 'lorem');
			assert.strictEqual(values[0].value, 0);
			assert.strictEqual(values[0].path,  'entries.0.sub_sub.0.lorem');

			assert.strictEqual(values[1].field.name, 'lorem');
			assert.strictEqual(values[1].value, 1);
			assert.strictEqual(values[1].path,  'entries.0.sub_sub.1.lorem');

			assert.strictEqual(values[2].field.name, 'lorem');
			assert.strictEqual(values[2].value, 2);
			assert.strictEqual(values[2].path,  'entries.0.sub_sub.2.lorem');

			assert.strictEqual(values[3].field.name, 'lorem');
			assert.strictEqual(values[3].value, 3);
			assert.strictEqual(values[3].path,  'entries.1.sub_sub.0.lorem');

			doc.translatable_schema = {
				en: {
					name: 'en'
				},
				nl: {
					name: 'nl'
				}
			};

			let translatable_schema_name_field = WithSchema.getField('translatable_schema.name');

			values = translatable_schema_name_field.getDocumentValues(doc);

			// Sort the result by the prefix
			values.sortByPath(1, 'path');

			assert.strictEqual(values.length, 2, 'Expected 2 translated names, but got ' + values.length);

			assert.strictEqual(values[0].field.name, 'name');
			assert.strictEqual(values[0].value, 'en');
			assert.strictEqual(values[0].path, 'translatable_schema.en.name');

			assert.strictEqual(values[1].field.name, 'name');
			assert.strictEqual(values[1].value, 'nl');
			assert.strictEqual(values[1].path, 'translatable_schema.nl.name');

			doc.description = {
				en: 'english',
				nl: 'dutch'
			}

			let description_field = WithSchema.getField('description');

			values = description_field.getDocumentValues(doc);

			// Sort the result by the prefix
			values.sortByPath(1, 'path');

			assert.strictEqual(values.length, 2, 'Expected 2 description values, but got ' + values.length);

			assert.strictEqual(values[0].field.name, 'description');
			assert.strictEqual(values[0].value, 'english');
			assert.strictEqual(values[0].path, 'description.en');

			assert.strictEqual(values[1].field.name, 'description');
			assert.strictEqual(values[1].value, 'dutch');
			assert.strictEqual(values[1].path, 'description.nl');

			doc.translatable_tags = {
				en: ['en0', 'en1'],
				nl: ['nl0', 'nl1']
			};

			let translatable_tags_field = WithSchema.getField('translatable_tags');
			values = translatable_tags_field.getDocumentValues(doc);

			// Sort the result by the prefix
			values.sortByPath(1, 'path');

			assert.strictEqual(values.length, 4, 'Expected 4 tags, but got ' + values.length);

			assert.strictEqual(values[0].field.name, 'translatable_tags');
			assert.strictEqual(values[0].value, 'en0');
			assert.strictEqual(values[0].path,  'translatable_tags.en.0');

			assert.strictEqual(values[1].value, 'en1');
			assert.strictEqual(values[1].path,  'translatable_tags.en.1');

			assert.strictEqual(values[2].value, 'nl0');
			assert.strictEqual(values[2].path,  'translatable_tags.nl.0');

			assert.strictEqual(values[3].value, 'nl1');
			assert.strictEqual(values[3].path,  'translatable_tags.nl.1');

			await doc.save();

			values = translatable_tags_field.getDocumentValues(doc);

			// Sort the result by the prefix
			values.sortByPath(1, 'path');

			assert.strictEqual(values.length, 4, 'Expected 4 tags, but got ' + values.length + ', something happend while saving');
		});
	});

});

describe('Field.String', function() {

	var schema,
	    field;

	before(function() {
		schema = new Classes.Alchemy.Schema();
		field = new Classes.Alchemy.Field.String(schema, 'test');
	});

	describe('#cast(value)', function() {
		it('should cast the given value to a string', function() {
			assert.strictEqual(field.cast(1), '1');
			assert.strictEqual(field.cast('a'), 'a');
		});
	});

});

describe('Field.DateTime', function() {

	var dtf_model,
	    Dtf;

	before(function(next) {
		next = Function.regulate(next);

		Dtf = Function.inherits('Alchemy.Model', function Dtf(options) {
			Dtf.super.call(this, options);
		});

		Dtf.constitute(function addFields() {
			this.addField('name', 'String');
			this.addField('datetime_with_units', 'Datetime', {store_units: true});
			next();
		});
	});

	it('should store & revive dates in the database with `store_units: true` option', async function() {

		dtf_model = Model.get('Dtf');

		var input_doc = dtf_model.createDocument(),
		    output_doc;

		input_doc.name = 'first';
		input_doc.datetime_with_units = new Date();

		await input_doc.save();

		assert.strictEqual(String(input_doc._id).isObjectId(), true);

		output_doc = await dtf_model.find('first');

		assert.strictEqual(output_doc.name, 'first');
		assert.strictEqual(Number(output_doc.datetime_with_units), Number(input_doc.datetime_with_units));
		assert.strictEqual(Date.isDate(output_doc.datetime_with_units), true);
	});

	it('should be possible to query for those separate units', async function() {

		// Create another doc
		input_doc = dtf_model.createDocument();
		input_doc.name = 'second';
		input_doc.datetime_with_units = Date.create('2017-09-01T21:00:00+02:00');

		await input_doc.save();

		let all_docs = await dtf_model.find('all');

		assert.strictEqual(all_docs.length, 2);

		let unit_query_result = await dtf_model.find('all', {
			conditions: {
				'datetime_with_units.year' : 2017,
				'datetime_with_units.date' : 1
			}
		});

		assert.strictEqual(unit_query_result.length, 1);

		unit_query_result = await dtf_model.find('all', {
			conditions: {
				'datetime_with_units.year' : 2017,
				'datetime_with_units.date' : 2
			}
		});

		assert.strictEqual(unit_query_result.length, 0);
	});

});