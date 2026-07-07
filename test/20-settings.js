var assert = require('assert');

describe('Setting', function() {

	describe('Group#addSetting(name, config)', function() {

		it('should resolve defaults of settings defined after the value tree was generated', function() {

			// The system value tree was generated during alchemy's constructor,
			// long before this test runs - exactly like an app's bootstrap file
			let group = Classes.Alchemy.Setting.SYSTEM.createGroup('late_test_group');

			group.addSetting('with_default', {
				type    : 'string',
				default : 'the-default',
			});

			group.addSetting('with_array_default', {
				type       : 'array',
				array_type : 'string',
				default    : ['a', 'b'],
			});

			group.addSetting('without_default', {
				type : 'string',
			});

			// The defaults land in the live value tree immediately
			assert.strictEqual(alchemy.system_settings.getPath('late_test_group.with_default')?.get(), 'the-default');

			// `alchemy.settings` is a static snapshot taken during the settings
			// stage (after an app's bootstrap file ran); this test runs post-boot,
			// so refresh the snapshot the same way that stage builds it
			alchemy.refreshSettingsObject();

			assert.strictEqual(alchemy.settings.late_test_group.with_default, 'the-default');
			assert.deepStrictEqual(alchemy.settings.late_test_group.with_array_default, ['a', 'b']);
			assert.strictEqual(alchemy.settings.late_test_group.without_default, undefined);
		});

		it('should not overwrite a value that was already set explicitly', function() {

			alchemy.setSetting('late_test_group_two.pre_set', 'explicit-value');

			let group = Classes.Alchemy.Setting.SYSTEM.createGroup('late_test_group_two');

			group.addSetting('pre_set', {
				type    : 'string',
				default : 'the-default',
			});

			alchemy.refreshSettingsObject();

			assert.strictEqual(alchemy.settings.late_test_group_two.pre_set, 'explicit-value');
		});

		it('should rebind an early value to the real definition (cast + action restored)', function() {

			// A value that arrives BEFORE the setting's definition exists sits
			// on an orphan, type-less/action-less ad-hoc definition
			alchemy.setSetting('orphan_leaf_group.flag', 'false');

			let action_calls = [];

			let group = Classes.Alchemy.Setting.SYSTEM.createGroup('orphan_leaf_group');

			let definition = group.addSetting('flag', {
				type    : 'boolean',
				default : true,
				action  : (value) => action_calls.push(value),
			});

			let live = alchemy.system_settings.getPath('orphan_leaf_group.flag');

			// The retro-add must have rebound the orphan to the real definition
			assert.strictEqual(live.definition, definition, 'the live value carries the real definition');

			// ...which re-cast the truthy string 'false' to boolean false
			assert.strictEqual(live.get(), false, 'the early string value was cast by the real type');

			// ...and later writes now fire the real action
			live.setValue(true);
			assert.deepStrictEqual(action_calls, [true], 'the action fires for later writes');
		});

		it('should allow a child setting named after its (non-root) parent group', function() {

			let group = Classes.Alchemy.Setting.SYSTEM.createGroup('samename_test');

			// Before the fix, Group#get stripped the leading path piece for ANY
			// group, so `get('samename_test')` returned the group itself and
			// this threw "already exists"
			group.addSetting('samename_test', {
				type    : 'string',
				default : 'inner-value',
			});

			assert.strictEqual(alchemy.system_settings.getPath('samename_test.samename_test')?.get(), 'inner-value');
		});
	});

	describe('Alchemy#setSetting(path, value)', function() {

		it('should refresh the settings snapshot even before alchemy.started', function() {

			let group = Classes.Alchemy.Setting.SYSTEM.createGroup('stale_snapshot_test');
			group.addSetting('x', {type: 'string', default: 'old'});

			// Take a snapshot (the settings stage does this during boot)
			alchemy.refreshSettingsObject();
			assert.strictEqual(alchemy.settings.stale_snapshot_test.x, 'old');

			// Simulate the boot window: snapshot exists, server not started yet
			let original_started = alchemy.started;
			alchemy.started = false;

			try {
				alchemy.setSetting('stale_snapshot_test.x', 'new');
				assert.strictEqual(alchemy.settings.stale_snapshot_test.x, 'new',
					'the snapshot must refresh even before the server stage');
			} finally {
				alchemy.started = original_started;
			}
		});
	});

	describe('Definition#cast(value)', function() {

		it('should cast array settings: wrap scalars and cast each element', function() {

			let group = Classes.Alchemy.Setting.SYSTEM.createGroup('array_cast_test');
			group.addSetting('numbers', {type: 'array', array_type: 'number'});

			alchemy.setSetting('array_cast_test.numbers', '5');
			let live = alchemy.system_settings.getPath('array_cast_test.numbers');
			assert.deepStrictEqual(live.get(), [5], 'a scalar is wrapped and cast');

			alchemy.setSetting('array_cast_test.numbers', ['1', '2']);
			assert.deepStrictEqual(live.get(), [1, 2], 'elements are cast to the array_type');
		});

		it('should cast the boolean strings "0" and "1"', function() {

			let group = Classes.Alchemy.Setting.SYSTEM.createGroup('bool_cast_test');
			group.addSetting('flag', {type: 'boolean'});

			let live;

			alchemy.setSetting('bool_cast_test.flag', '0');
			live = alchemy.system_settings.getPath('bool_cast_test.flag');
			assert.strictEqual(live.get(), false, 'the string "0" is false');

			alchemy.setSetting('bool_cast_test.flag', '1');
			assert.strictEqual(live.get(), true, 'the string "1" is true');
		});
	});

	describe('callable defaults', function() {

		it('should resolve a function default by calling it', function() {

			let group = Classes.Alchemy.Setting.SYSTEM.createGroup('fn_default_test');

			group.addSetting('computed', {
				type    : 'string',
				default : () => 'computed-value',
			});

			let live = alchemy.system_settings.getPath('fn_default_test.computed');
			assert.strictEqual(live.get(), 'computed-value', 'the default is the function RESULT, not the function');
		});
	});
});
