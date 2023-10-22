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

describe('Field.BigInt', function() {

	let BigIntModel;

	before(function(next) {
		next = Function.regulate(next);

		BigIntModel = Function.inherits('Alchemy.Model', 'BigInt');

		BigIntModel.constitute(function addFields() {
			this.addField('name', 'String');
			this.addField('big_int', 'BigInt');
			next();
		});
	});

	it('should store & revive big integers', async function() {

		let BigInt = Model.get('BigInt');
		let doc = BigInt.createDocument();

		doc.name = 'first';
		doc.big_int = 1234567867890n;

		await doc.save();

		let output_doc = await BigInt.find('first');

		assert.strictEqual(output_doc.name, 'first');
		assert.strictEqual(output_doc.big_int, 1234567867890n);
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

describe('Field.LocalTemporal', function() {

	let LocalDtf,
	    first_input_doc,
	    first_output_doc;

	before(function(next) {
		next = Function.regulate(next);

		LocalDtf = Function.inherits('Alchemy.Model', 'LocalDtf');

		LocalDtf.constitute(function addFields() {
			this.addField('name', 'String');
			this.addField('datetime', 'LocalDateTime');
			this.addField('date', 'LocalDate');
			this.addField('time', 'LocalTime');
			next();
		});
	});

	it('should store Local Date & Time fields in the database', async function() {

		let LocalDtf = Model.get('LocalDtf');

		first_input_doc = LocalDtf.createDocument();

		let date_time = new Classes.Develry.LocalDateTime('2023-10-22 13:08:14');
		let date = new Classes.Develry.LocalDate('2023-10-24');
		let time = new Classes.Develry.LocalTime('11:14:23');

		first_input_doc.name = 'first';
		first_input_doc.datetime = date_time.clone();
		first_input_doc.date = date.clone();
		first_input_doc.time = time.clone();

		await first_input_doc.save();

		assert.strictEqual(String(first_input_doc._id).isObjectId(), true);
	});

	it('should revive Local Date & Time fields in the database', async function() {

		let LocalDtf = Model.get('LocalDtf');

		first_output_doc = await LocalDtf.find('first');

		assert.strictEqual(first_output_doc.name, 'first');
		assert.strictEqual(Number(first_output_doc.datetime), Number(first_input_doc.datetime));
		assert.strictEqual(Number(first_output_doc.date), Number(first_input_doc.date));
		assert.strictEqual(Number(first_output_doc.time), Number(first_input_doc.time));

		assert.strictEqual(first_output_doc.datetime.constructor.name, 'LocalDateTime');
		assert.strictEqual(first_output_doc.date.constructor.name, 'LocalDate');
		assert.strictEqual(first_output_doc.time.constructor.name, 'LocalTime');
	});

	it('should be possible to query LocalDateTime fields', async function() {

		let LocalDtf = Model.get('LocalDtf');

		// Create another doc
		let input_doc = LocalDtf.createDocument();

		let date_time = new Classes.Develry.LocalDateTime('2022-09-11 14:11:23');
		let date = new Classes.Develry.LocalDate('2022-09-11');
		let time = new Classes.Develry.LocalTime('14:12:11');

		input_doc.name = 'second';
		input_doc.datetime = date_time.clone();
		input_doc.date = date.clone();
		input_doc.time = time.clone();

		await input_doc.save();

		input_doc = LocalDtf.createDocument();
		input_doc.name = 'third';
		input_doc.datetime = '1999-06-14 14:22:31';

		await input_doc.save();

		let crit = LocalDtf.find();
		crit.sort({datetime: 1});

		let all_docs = await LocalDtf.find('all', crit);
		assert.strictEqual(all_docs.length, 3);
		assert.strictEqual(all_docs[0].name, 'third');
		assert.strictEqual(all_docs[1].name, 'second');
		assert.strictEqual(all_docs[2].name, 'first');

		crit = LocalDtf.find();
		crit.where('datetime').equals(date_time);

		let found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 1);
		assert.strictEqual(found[0].name, 'second');

		crit = LocalDtf.find();
		crit.where('datetime').gte('2022-11-01');
		crit.sort({datetime: -1});

		found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 1);
		assert.strictEqual(found[0].name, 'first');

		crit = LocalDtf.find();
		crit.where('datetime').lte('2022-11-01');
		crit.sort({datetime: 1});

		found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 2);
		assert.strictEqual(found[0].name, 'third');
		assert.strictEqual(found[1].name, 'second');

		crit = LocalDtf.find();
		crit.where('datetime').lte(new Classes.Develry.LocalDateTime('2022-11-01'));
		crit.sort({datetime: -1});

		found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 2);
		assert.strictEqual(found[0].name, 'second');
		assert.strictEqual(found[1].name, 'third');
	});

	it('should be possible to query LocalDate fields', async function() {

		let LocalDtf = Model.get('LocalDtf');

		let crit = LocalDtf.find();
		crit.sort({date: 1});
		crit.where('date').not().isEmpty();

		let found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 2);
		assert.strictEqual(found[0].name, 'second');
		assert.strictEqual(found[1].name, 'first');

		crit = LocalDtf.find();
		crit.sort({date: 1});
		crit.where('date').equals('2022-09-11');

		found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 1);
		assert.strictEqual(found[0].name, 'second');

		crit = LocalDtf.find();
		crit.sort({date: 1});
		crit.where('date').gt('2022-09-11');

		found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 1);
		assert.strictEqual(found[0].name, 'first');
		assert.strictEqual(found[0].date.toString(), '2023-10-24');

		crit = LocalDtf.find();
		crit.sort({date: 1});
		crit.where('date').gte('2022-09-11');

		found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 2);
		assert.strictEqual(found[0].name, 'second');
		assert.strictEqual(found[0].date.toString(), '2022-09-11');
		assert.strictEqual(found[1].name, 'first');
		assert.strictEqual(found[1].date.toString(), '2023-10-24');
	});

	it('should be possible to query LocalTime fields', async function() {

		let LocalDtf = Model.get('LocalDtf');

		let crit = LocalDtf.find();
		crit.sort({time: 1});
		crit.where('time').not().isEmpty();

		let found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 2);
		assert.strictEqual(found[0].name, 'first');
		assert.strictEqual(found[1].name, 'second');

		crit = LocalDtf.find();
		crit.sort({time: 1});
		crit.where('time').equals('14:12:11');

		found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 1);
		assert.strictEqual(found[0].name, 'second');

		crit = LocalDtf.find();
		crit.sort({time: 1});
		crit.where('time').lte('12:00:00');

		found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 1);
		assert.strictEqual(found[0].name, 'first');
	});
});

describe('Field.Schema', function() {

	before(function(next) {
		next = Function.regulate(next);

		let to_app_counter = 0;

		const FlobotonumField = Function.inherits('Alchemy.Field', 'Flobotonum');
		FlobotonumField.setDatatype('object');
		FlobotonumField.setSelfContained(true);
		FlobotonumField.setMethod(function _toApp(query, options, value, callback) {

			let result = {
				type     : 'flobotonum',
				value    : value,
				to_apped : true,
				to_app_counter : ++to_app_counter,
			};

			callback(null, result);
		});

		FlobotonumField.setMethod(function _toDatasource(value, data, datasource, callback) {
			callback(null, value.value);
		});

		let QuestComponents = alchemy.getClassGroup('all_quest_component');
		const QuestComponent = Function.inherits('Alchemy.Base', 'Alchemy.Quest.Component', 'QuestComponent');
		QuestComponent.makeAbstractClass();
		QuestComponent.startNewGroup('all_quest_component');
		QuestComponent.setProperty(function schema() {
			return this.constructor.schema;
		});
		QuestComponent.constitute(function setSchema() {
			this.schema = alchemy.createSchema();
		});

		const Sleep = Function.inherits('Alchemy.Quest.Component.QuestComponent', 'Sleep');
		Sleep.constitute(function setSchema() {
			// Set the sleep time
			this.schema.addField('duration', 'Number');
			this.schema.addField('flobotonum', 'Flobotonum');
		});

		const QuestTest = Function.inherits('Alchemy.Model', 'QuestTest');
		QuestTest.constitute(async function addFields() {

			let schema = alchemy.createSchema();

			schema.addField('type', 'Enum', {values: QuestComponents});
			schema.addField('settings', 'Schema', {schema: 'type'});

			this.addField('objectives', schema, {array: true});

			await Pledge.after(1);
			next();
		});
	});

	it('should correctly handle nested schemas', async function() {
		const Quest = Model.get('QuestTest');
		let doc = Quest.createDocument();

		doc.objectives = [
			{
				type : 'sleep',
				settings : {
					duration : 1,
					flobotonum: {
						value : {
							stuff : true
						}
					}
				}
			},
			{
				type : 'sleep',
				settings : {
					duration : 2,
					flobotonum: {
						value : {
							morestuff : true
						}
					}
				}
			}
		];

		await doc.save();

		let first,
		    second;

		assert.strictEqual(!!doc._id, true, 'The saved document should have an _id');
		assert.strictEqual(doc.objectives.length, 2, 'The saved document should have 2 objectives');

		first = doc.objectives[0];
		second = doc.objectives[1];
		
		assert.strictEqual(first.type, 'sleep');
		assert.strictEqual(first.settings?.duration, 1);
		assert.strictEqual(first.settings?.flobotonum?.to_apped, true, 'The value should have been passed through `toApp`');
		assert.strictEqual(first.settings?.flobotonum?.type, 'flobotonum', 'The value should have been passed through `toApp`');
		assert.strictEqual(first.settings?.flobotonum?.value?.stuff, true, 'The inner flobotonum value should have been saved');
		assert.strictEqual(first.settings?.flobotonum?.to_app_counter, 1, 'This should have been the first `toApp` call for this field');

		assert.strictEqual(second.type, 'sleep');
		assert.strictEqual(second.settings?.duration, 2);
		assert.strictEqual(second.settings?.flobotonum?.to_apped, true, 'The value should have been passed through `toApp`');
		assert.strictEqual(second.settings?.flobotonum?.type, 'flobotonum', 'The value should have been passed through `toApp`');
		assert.strictEqual(second.settings?.flobotonum?.value?.morestuff, true, 'The inner flobotonum value should have been saved');
		assert.strictEqual(second.settings?.flobotonum?.to_app_counter, 2, 'This should have been the second `toApp` call for this field');

		doc = await Quest.findByPk(doc._id);

		assert.strictEqual(doc.objectives.length, 2, 'The saved document should have 2 objectives');

		first = doc.objectives[0];
		second = doc.objectives[1];
		
		assert.strictEqual(first.type, 'sleep');
		assert.strictEqual(first.settings?.duration, 1);
		assert.strictEqual(first.settings?.flobotonum?.to_apped, true, 'The value should have been passed through `toApp`');
		assert.strictEqual(first.settings?.flobotonum?.type, 'flobotonum', 'The value should have been passed through `toApp`');
		assert.strictEqual(first.settings?.flobotonum?.value?.stuff, true, 'The inner flobotonum value should have been saved');
		assert.strictEqual(first.settings?.flobotonum?.to_app_counter, 3, 'This should have been the third `toApp` call for this field');

		assert.strictEqual(second.type, 'sleep');
		assert.strictEqual(second.settings?.duration, 2);
		assert.strictEqual(second.settings?.flobotonum?.to_apped, true, 'The value should have been passed through `toApp`');
		assert.strictEqual(second.settings?.flobotonum?.type, 'flobotonum', 'The value should have been passed through `toApp`');
		assert.strictEqual(second.settings?.flobotonum?.value?.morestuff, true, 'The inner flobotonum value should have been saved');
		assert.strictEqual(second.settings?.flobotonum?.to_app_counter, 4, 'This should have been the fourth `toApp` call for this field');
	});
});