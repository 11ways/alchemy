var assert = require('assert');

/**
 * Regression tests for the 1.4.7 audit fixes. Each test pins a defect that
 * existed in 1.4.6: see CHANGELOG.md for the full descriptions.
 */
describe('Audit regressions (1.4.7)', function() {

	this.timeout(30000);

	describe('Model#saveRecord()', function() {

		it('invokes beforeSave hooks exactly once per save, with `creating`', async function() {

			let calls = [];

			await createModel(function AuditHookCounter() {
				this.addField('name', 'String');
			});

			let Counter = Model.get('AuditHookCounter');

			Counter.constructor.setMethod(function beforeSave(doc, options, creating) {
				calls.push({name: doc.name, creating});
			});

			let doc = (await Counter.save({name: 'one'}))[0];

			assert.strictEqual(calls.length, 1, 'beforeSave must fire once per create (it used to fire twice)');
			assert.strictEqual(calls[0].creating, true, 'the create must pass creating=true');

			calls.length = 0;
			doc.name = 'two';
			await doc.save();

			assert.strictEqual(calls.length, 1, 'beforeSave must fire once per update');
			assert.strictEqual(calls[0].creating, false, 'the update must pass creating=false');
		});

		it('stamps the foreign key on each child of a populated plural association', async function() {

			await createModel(function AuditFkParent() {
				this.addField('name', 'String');
			});

			await createModel(function AuditFkChild() {
				this.addField('name', 'String');
				this.belongsTo('AuditFkParent');
			});

			const Parent = Model.get('AuditFkParent'),
			      Child = Model.get('AuditFkChild');

			// Added after both models exist (inline hasMany would need the
			// child class during the parent's constitution)
			Parent.schema.hasMany('Children', 'AuditFkChild');

			let parent = (await Parent.save({name: 'papa'}))[0];

			let found = await Parent.findByPk(parent._id, {recursive: 1});

			let new_child = Child.createDocument();
			new_child.name = 'kiddo';

			// The shape a populated hasMany list has at save time
			found.$record.Children = [new_child];
			found.name = 'papa2';

			await Parent.save(found);

			let saved_child = await Child.find('first', {conditions: {name: 'kiddo'}});

			assert.strictEqual(String(saved_child.audit_fk_parent_id), String(parent._id),
				'the new child must receive its parent foreign key (it used to be stamped on the LIST object)');
		});
	});

	describe('Model#eachRecord()', function() {

		it('does not mutate the caller conditions object', async function() {

			await createModel(function AuditEachRecord() {
				this.addField('nr', 'Number');
			});

			const M = Model.get('AuditEachRecord');

			for (let nr of [1, 2, 3, 4, 5]) {
				await M.save({nr});
			}

			let conditions = {},
			    options = {conditions, limit: 2},
			    seen = 0;

			await M.eachRecord(options, (record, index, next) => {
				seen++;
				next();
			});

			assert.strictEqual(seen, 5, 'all records should be iterated');
			assert.strictEqual(Object.keys(conditions).length, 0,
				'the pagination condition must not be written into the caller conditions');
		});
	});

	describe('Document dry/undry', function() {

		it('preserves the dirty state of a server document', async function() {

			await createModel(function AuditUndry() {
				this.addField('name', 'String');
			});

			const M = Model.get('AuditUndry');

			let doc = (await M.save({name: 'v1'}))[0];
			doc.name = 'v2';

			assert.strictEqual(doc.hasChanged('name'), true, 'sanity: the source doc is changed');

			let revived = JSON.undry(JSON.dry(doc));

			assert.strictEqual(!!revived.$attributes.original_record, true,
				'the original_record must survive the round-trip (unDry used to read the wrong key)');
			assert.strictEqual(revived.hasChanged('name'), true,
				'the changed state must survive (setDataRecord used to re-snapshot the changed $main)');
			assert.strictEqual(revived.name, 'v2');
		});
	});

	describe('HasAndBelongsToMany conditions', function() {

		it('matches elements of multi-element arrays with equals() and in()', async function() {

			await createModel(function AuditHabtmMember() {
				this.addField('name', 'String');
			});

			await createModel(function AuditHabtmTeam() {
				this.addField('name', 'String');
				this.addField('members_id', 'HasAndBelongsToMany');
			});

			const Member = Model.get('AuditHabtmMember'),
			      Team = Model.get('AuditHabtmTeam');

			let m1 = (await Member.save({name: 'm1'}))[0],
			    m2 = (await Member.save({name: 'm2'}))[0];

			await Team.save({name: 'the-team', members_id: [m1._id, m2._id]});

			let crit = Team.find();
			crit.where('members_id').equals(m1._id);
			let found = await Team.find('all', crit);
			assert.strictEqual(found.length, 1, 'equals(id) must match an array containing that id');

			crit = Team.find();
			crit.where('members_id').in([m1._id, m2._id]);
			found = await Team.find('all', crit);
			assert.strictEqual(found.length, 1, 'in([ids]) must match by containment, not exact-array equality');
		});
	});

	describe('Datetime store_units conditions', function() {

		it('converts BOTH bounds of a chained range', async function() {

			await createModel(function AuditUnitsDate() {
				this.addField('name', 'String');
				this.addField('happened_at', 'Datetime', {store_units: true});
			});

			const M = Model.get('AuditUnitsDate');

			await M.save({name: 'inside', happened_at: new Date('2024-06-15T12:00:00Z')});
			await M.save({name: 'outside', happened_at: new Date('2024-09-15T12:00:00Z')});

			let crit = M.find();
			crit.where('happened_at').gte(new Date('2024-06-01')).lte(new Date('2024-07-01'));

			let found = await M.find('all', crit);

			assert.strictEqual(found.length, 1,
				'the second chained bound must be converted too (it used to stay a raw Date and match nothing)');
			assert.strictEqual(found[0].name, 'inside');
		});
	});

	describe('AQL group handling', function() {

		it('keeps sibling parenthesized groups', function() {

			let compiled = Classes.Alchemy.Datasource.Nosql.convertAQLToConditions('(a = 1) and (b = 2)');
			let str = JSON.stringify(compiled);

			assert.strictEqual(str.includes('"a"'), true, 'the first group must survive (it used to be dropped)');
			assert.strictEqual(str.includes('"b"'), true, 'the second group must survive');
		});
	});

	describe('applyConditions $regex', function() {

		it('treats a string $regex as a pattern and tolerates $options-first key order', async function() {

			await createModel(function AuditRegex() {
				this.addField('name', 'String');
			});

			const M = Model.get('AuditRegex');
			await M.save({name: 'Eve'});
			await M.save({name: 'Adam'});

			// Pattern semantics (used to be escaped into a literal match)
			let found = await M.find('all', {conditions: {name: {$regex: '^E.e$'}}});
			assert.strictEqual(found.length, 1, 'a string $regex must be compiled as a PATTERN');
			assert.strictEqual(found[0].name, 'Eve');

			// $options iterated before $regex (used to throw)
			found = await M.find('all', {conditions: {name: {$options: 'i', $regex: 'eve'}}});
			assert.strictEqual(found.length, 1, '$options-first key order must not throw');
		});
	});

	describe('Criteria or()/and() shorthand', function() {

		it('keeps the association of the active expression', async function() {

			await createModel(function AuditOrEmp() {
				this.addField('name', 'String');
				this.belongsTo('Boss', 'AuditOrEmp');
			});

			const M = Model.get('AuditOrEmp');

			let alpha = (await M.save({name: 'Alpha'}))[0];
			let beta = (await M.save({name: 'Beta'}))[0];
			await M.save({name: 'Eve', boss_id: alpha._id});
			await M.save({name: 'Adam', boss_id: beta._id});

			let crit = M.find();
			crit.where('Boss.name').equals('Nonexistent').or('Alpha');

			let found = await M.find('all', crit);

			assert.strictEqual(found.length, 1, 'the or() branch must stay on Boss.name');
			assert.strictEqual(found[0].name, 'Eve',
				'or(value) used to drop the association and match the ROOT name field');
		});

		it('allows selecting an own-model-prefixed field', async function() {

			await createModel(function AuditOwnSelect() {
				this.addField('name', 'String');
				this.addField('nr', 'Number');
			});

			const M = Model.get('AuditOwnSelect');
			await M.save({name: 'x', nr: 42});

			let crit = M.find();
			crit.select('AuditOwnSelect.name');

			// This used to create a bogus association and reject the find
			let record = await M.find('first', crit);

			assert.strictEqual(record.name, 'x');
			assert.strictEqual(record.nr, null, 'only the selected field should be present');
		});
	});

	describe('Criteria async iterator', function() {

		it('respects a pre-set limit and skip', async function() {

			await createModel(function AuditIter() {
				this.addField('nr', 'Number');
			});

			const M = Model.get('AuditIter');

			for (let nr of [1, 2, 3, 4, 5]) {
				await M.save({nr});
			}

			let crit = M.find();
			crit.sort({nr: 1});
			crit.skip(1);
			crit.limit(2);

			let seen = [];

			for await (let record of crit) {
				seen.push(record.nr);
			}

			assert.deepStrictEqual(seen, [2, 3],
				'iteration must start at the given skip and stop at the limit');
		});
	});

	describe('Mongo aggregate projection', function() {

		it('applies the field selection on the $lookup path', async function() {

			await createModel(function AuditProjBoss() {
				this.addField('name', 'String');
			});

			await createModel(function AuditProjEmp() {
				this.addField('name', 'String');
				this.addField('nr', 'Number');
				this.belongsTo('Boss', 'AuditProjBoss');
			});

			const Boss = Model.get('AuditProjBoss'),
			      Emp = Model.get('AuditProjEmp');

			let boss = (await Boss.save({name: 'boss'}))[0];
			await Emp.save({name: 'emp', nr: 7, boss_id: boss._id});

			let crit = Emp.find();
			crit.select('name');
			crit.select('Boss');
			crit.where('Boss.name').equals('boss');

			let record = await Emp.find('first', crit);

			assert.strictEqual(record.name, 'emp');
			assert.strictEqual(record.nr, null,
				'unselected fields must be projected away on the aggregate path too');
			assert.strictEqual(record.Boss?.name, 'boss', 'the association must stay selected');
		});
	});

	describe('Translatable array fields', function() {

		it('does not split a primitive translation value into characters', async function() {

			await createModel(function AuditTransArr() {
				this.addField('labels', 'String', {translatable: true, array: true});
			});

			const M = Model.get('AuditTransArr');

			let doc = M.createDocument();
			doc.labels = {en: 'foo'};
			await doc.save();

			let found = await M.find('first');

			assert.deepStrictEqual(JSON.clone(found.$main.labels), {en: ['foo']},
				'a primitive translation must be wrapped, not iterated character by character');
		});
	});

	describe('Task#stop()', function() {

		it('stops a PAUSED task instead of deadlocking', async function() {

			const TestTask = Function.inherits('Alchemy.Task', function AuditPausableTask() {
				AuditPausableTask.super.call(this);
			});

			TestTask.setMethod(async function executor() {

				let rounds = 0;

				while (rounds++ < 100) {

					if (this.is_paused) {
						await this.waitUntilResumed();
					}

					if (this.has_stopped) {
						return 'stopped';
					}

					await Classes.Pledge.after(5);
				}
			});

			let task = new TestTask();
			let start_promise = task.start();

			await Classes.Pledge.after(20);
			task.pause();
			await Classes.Pledge.after(20);

			// This used to leave the executor parked on the pause pledge
			// forever (and the task's cron schedule permanently wedged)
			await task.stop();

			let result = await Promise.race([
				start_promise,
				Classes.Pledge.after(2000).then(() => 'TIMED OUT'),
			]);

			assert.notStrictEqual(result, 'TIMED OUT', 'the start promise must settle after stop()');
			assert.strictEqual(task.has_stopped, true);
		});
	});
});
