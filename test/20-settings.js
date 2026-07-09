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

		it('should recover an object config value on an object-TYPE leaf declared later', function() {

			// The regression: a config file / early setSetting supplies a
			// nested object for a setting whose real definition (declared
			// later, in bootstrap) is an object-TYPE LEAF. The orphan loader
			// groupifies the object, then rebuildLeaf saw a group-value on a
			// leaf and DROPPED it ("...is a leaf but received a group override
			// value; ignoring it") - which silently killed Arcana's
			// google.credentials (Gmail + Calendar) on live. It must be
			// recovered as the leaf's object value instead.
			alchemy.setSetting('object_leaf_group.credentials', {
				client_email : 'svc@example.com',
				private_key  : '-----BEGIN PRIVATE KEY-----\nX\n-----END PRIVATE KEY-----\n',
			});

			let group = Classes.Alchemy.Setting.SYSTEM.createGroup('object_leaf_group');

			group.addSetting('credentials', {
				type        : 'object',
				description : 'An opaque object blob (e.g. service-account JSON)',
			});

			let value = alchemy.settings.object_leaf_group?.credentials;

			assert.ok(value && typeof value === 'object', 'the object value survived the leaf rebuild');
			assert.strictEqual(value.client_email, 'svc@example.com', 'its keys are intact');
			assert.ok(/BEGIN PRIVATE KEY/.test(value.private_key || ''), 'the private_key resolves');
		});

		it('should still drop an object override on a genuine SCALAR leaf', function() {

			// The recovery must NOT extend to scalar leaves: an object landing
			// on a string/boolean leaf is genuinely malformed and stays dropped.
			alchemy.setSetting('scalar_leaf_group.name', {unexpected: 'object'});

			let group = Classes.Alchemy.Setting.SYSTEM.createGroup('scalar_leaf_group');
			group.addSetting('name', {type: 'string', default: 'fallback'});

			// Assert the authoritative setting value (the static alchemy.settings
			// snapshot is separately known to lag an ad-hoc drop).
			let value = alchemy.system_settings.getPath('scalar_leaf_group.name')?.get();
			assert.strictEqual(value, 'fallback', 'the malformed object override was dropped, default stands');
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

	describe('GroupValue#rebuildSubGroup(name, group, hardcoded_defaults)', function() {

		it('should keep hardcoded defaults over untouched generated values (the usePlugin options case)', function() {

			// Since the addSetting/createGroup retro-add, registering the
			// definitions materialises a fully-generated value tree - all
			// leaves at their definition default. This is exactly what a
			// plugin's config/settings.js does.
			let group = Classes.Alchemy.Setting.SYSTEM.createGroup('plugin_defaults_test');

			group.addSetting('icon_url', {
				type    : 'string',
				default : null,
			});

			group.addSetting('max_width', {
				type    : 'integer',
				default : null,
			});

			group.addSetting('overridden', {
				type    : 'string',
				default : 'the-default',
			});

			// One value IS explicitly set (like a local.js config override)
			alchemy.setSetting('plugin_defaults_test.overridden', 'from-config');

			// What Plugin#loadSettingDefinitions does with the usePlugin()
			// options: rebuild the sub-group with the hardcoded defaults.
			// The replay of the pre-existing generated tree must NOT let the
			// untouched all-default leaves overwrite those hardcoded defaults
			// (this regression nulled out every usePlugin() option, e.g. the
			// media plugin's fontawesome_pro URL).
			alchemy.system_settings.rebuildSubGroup('plugin_defaults_test', group, {
				icon_url  : 'https://example.com/icons.css',
				max_width : 1600,
			});

			alchemy.refreshSettingsObject();

			assert.strictEqual(alchemy.settings.plugin_defaults_test.icon_url, 'https://example.com/icons.css', 'the hardcoded default must survive the replay');
			assert.strictEqual(alchemy.settings.plugin_defaults_test.max_width, 1600);
			assert.strictEqual(alchemy.settings.plugin_defaults_test.overridden, 'from-config', 'explicitly-set values still win over hardcoded defaults');

			// The untouched leaf keeps counting as a default, so a LATER
			// default-application may still adjust it
			let live = alchemy.system_settings.getPath('plugin_defaults_test.icon_url');
			assert.strictEqual(live.has_default_value, true, 'a hardcoded default still counts as a default value');
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
