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
	});
});
