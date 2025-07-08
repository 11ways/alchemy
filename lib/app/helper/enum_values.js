/**
 * The EnumValues class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.2.1
 */
const EnumMap = Function.inherits('Alchemy.Map.Backed', 'Enum');

/**
 * Get a value by it's name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.2.1
 *
 * @param    {string}   name
 *
 * @return   {Mixed}
 */
EnumMap.setMethod(function get(name) {

	if (this.local.has(name)) {
		return this.local.get(name);
	}

	let value = get.super.call(this, name);

	if (value) {
		value = this.set(name, value);
	}

	return value;
});

/**
 * Set a value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.4.0
 *
 * @param    {string}   name
 * @param    {*}        value
 *
 * @return   {*}
 */
EnumMap.setMethod(function set(name, value) {

	if (value == null) {
		return;
	}

	if (value.is_enumified) {
		this.local.set(name, value);
		return value;
	}

	let result;

	if (typeof value == 'string') {
		result = {
			name  : value,
			title : value,
		};
	} else {
		if (typeof value == 'function') {
			result = {
				name  : value.name,
				title : value.title,
				short_title : value.short_title,
			};
		} else {
			result = {
				name  : value.name,
				title : value.title || value.name,
				short_title : value.short_title,
			};

			if (value.icon) {
				result.icon = value.icon;
			}

			if (value.icon_style) {
				result.icon_style = value.icon_style;
			}

			if (value.color) {
				result.color = value.color;
			}

			if (value.text_color) {
				result.text_color = value.text_color;
			}
		}

		if (value.enum_info) {
			Object.assign(result, value.enum_info);
		}
	}

	result.number = this.local.size + 1;
	result.value = value;
	result.is_enumified = true;

	this.local.set(name, result);

	return result;
});


/**
 * Simplify the object for Hawkejs
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.1
 * @version  1.4.0
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Enum}
 */
EnumMap.setMethod(function toHawkejs(wm) {

	let result = toHawkejs.super.call(this, wm),
	    original_entry,
		cloned_entry,
	    keys = this.keys(),
		key;
	
	for (key of keys) {
		original_entry = this.get(key);
		cloned_entry = result.get(key);

		if (original_entry.value) {

			let val = original_entry.value;

			if (typeof val == 'function') {
				cloned_entry.type = 'function';
			}

			// Always add the `schema` property if it's there
			if (val.schema) {
				cloned_entry.schema = JSON.clone(val.schema, 'toHawkejs', wm);
			}

			let field_key,
			    field_val;

			// Now we need to look for other `Schema`-like instances
			// and add those too
			for (field_key in val) {

				if (field_key == 'schema') {
					continue;
				}

				field_val = val[field_key];

				if (field_val) {
					const SchemaClass = Blast.isBrowser ? Classes.Alchemy.Client.Schema : Classes.Alchemy.Schema;

					if (field_val instanceof SchemaClass) {
						cloned_entry[field_key] = JSON.clone(field_val, 'toHawkejs', wm);
					}
				}
			}
		}
	}

	return result;
});