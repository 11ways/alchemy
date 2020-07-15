/**
 * Class that holds a value, its field and its full path
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Field}   field    The field definition
 * @param    {String}  path     The full path to the value (includes indexes)
 * @param    {*}       value
 */
const FieldValue = Function.inherits(null, 'Alchemy', function FieldValue(field, path, value) {
	this.field = field;
	this.path = path;
	this.value = value;
	this.translated = false;
	this.expanded = false;
});

/**
 * Get the translated values, if possible
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {FieldValue[]}
 */
FieldValue.setMethod(function getTranslatedValues() {

	if (this.translated || !this.field.is_translatable) {
		return [this];
	}

	let prefixes = alchemy.getPrefixes(),
	    result = [],
	    prefix,
	    path,
	    val,
	    fv;

	for (prefix in prefixes) {

		if (!this.value) {
			val = undefined;
		} else {
			val = this.value[prefix];
		}

		path = this.path + '.' + prefix;
		fv = new FieldValue(this.field, path, val);
		fv.translated = true;
		result.push(fv);
	}

	return result;
});

/**
 * Get the array values, if possible
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {FieldValue[]}
 */
FieldValue.setMethod(function unwind() {

	if (this.expanded) {
		return [this];
	}

	let result = this.getTranslatedValues();

	if (!this.field.is_array) {
		return result;
	}

	let start = result.slice(0),
	    path,
	    temp,
	    val,
	    fv,
	    i,
	    j;

	// Clear out the current field values,
	// the array entries will be added here
	result = [];

	// Iterate over all the expanded translations
	// (If there were no translations, this will be an array with `this` only)
	for (i = 0; i < start.length; i++) {
		fv = start[i];

		if (!fv.value || !Array.isArray(fv.value)) {
			fv.expanded = true;
			result.push(fv);
			continue;
		}

		for (j = 0; j < fv.value.length; j++) {
			val = fv.value[j];

			path = fv.path + '.' + j;

			temp = new FieldValue(fv.field, path, val);
			temp.translated = fv.translated;
			temp.expanded = true;
			result.push(temp);
		}
	}

	return result;
});

/**
 * Refine the values
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Field[]}        A chain of fields
 *
 * @return   {FieldValue[]}
 */
FieldValue.setMethod(function refine(fields) {

	let result = this.unwind();

	// If there is nothing to refine, return ourselves in an array
	if (!fields || !fields.length) {
		return result;
	}

	let field,
	    temp,
	    i,
	    j;

	for (i = 0; i < fields.length; i++) {
		field = fields[i];
		temp = [];

		for (j = 0; j < result.length; j++) {
			temp.include(result[j].getSubfieldValues(field));
		}

		result = temp;
	}

	return result;
});

/**
 * Get subfield values
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Field[]}
 *
 * @return   {FieldValue[]}
 */
FieldValue.setMethod(function getSubfieldValues(field) {

	if (!this.value) {
		return [];
	}

	let result = [],
	    path,
	    temp,
	    fvs = [this],
	    val,
	    fv,
	    i;

	if (this.field.is_translatable && !this.translated) {

		let prefixes = alchemy.getPrefixes(),
		    prefix,
		    start = fvs.slice(0),
		    j;

		// Clear out the current field values,
		// the translatable entries will be added here
		fvs = [];

		// Iterate over all the expanded translations
		// (This will always be only 1 entry in case of translations)
		for (i = 0; i < start.length; i++) {
			fv = start[i];

			if (!fv.value || typeof fv.value != 'object') {
				continue;
			}

			for (prefix in prefixes) {
				val = fv.value[prefix];

				if (!val) {
					continue;
				}

				path = fv.path + '.' + prefix;
				temp = new FieldValue(fv.field, path, val);
				fvs.push(temp);
			}
		}
	}

	if (this.field.is_array) {

		let start = fvs.slice(0),
		    j;

		// Clear out the current field values,
		// the array entries will be added here
		fvs = [];

		// Iterate over all the expanded translations
		// (If there were no translations, this will be an array with `this` only)
		for (i = 0; i < start.length; i++) {
			fv = start[i];

			// Has this already been expanded?
			if (fv.expanded) {
				fvs.push(fv);
				continue;
			}

			if (!fv.value || !Array.isArray(fv.value)) {
				continue;
			}

			for (j = 0; j < fv.value.length; j++) {
				val = fv.value[j];

				if (!val) {
					continue;
				}

				path = fv.path + '.' + j;

				temp = new FieldValue(fv.field, path, val);
				fvs.push(temp);
			}
		}
	}

	for (i = 0; i < fvs.length; i++) {
		fv = fvs[i];

		// If the value is falsy, no sub-values exist
		// and it should be ignored
		if (!fv.value) {
			continue;
		}

		val = fv.value[field.name];
		path = fv.path + '.' + field.name;

		// Create a new FieldValue instance
		// (In this case: we WANT empty values)
		temp = new FieldValue(fv.field, path, val);
		result.push(temp);
	}

	return result;
});