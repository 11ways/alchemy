/**
 * The FieldConfig class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 */
const FieldConfig = Fn.inherits('Alchemy.Base', 'Alchemy.Criteria', function FieldConfig(name, options) {
	this.name = name;
	this.options = options || {};
});

/**
 * unDry an object
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @param    {Object}   obj
 *
 * @return   {Alchemy.Form.FieldConfig}
 */
FieldConfig.setStatic(function unDry(obj) {
	let set = new FieldConfig(obj.name, obj.options);
	return set;
});

/**
 * Return an object for json-drying this list
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @return   {Object}
 */
FieldConfig.setMethod(function toDry() {
	return {
		value: {
			name      : this.name,
			options   : this.options,
		}
	};
});

/**
 * Get the title of this field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @type     {String}
 */
FieldConfig.setProperty(function title() {

	let title = this.options.title;

	if (!title) {
		title = this.name.titleize();
	}

	return title;
});