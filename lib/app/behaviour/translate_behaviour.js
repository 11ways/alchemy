/**
 * The Translate Behaviour class
 *
 * @constructor
 * @extends       alchemy.classes.Behaviour
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.2.0
 */
var TranslateBehaviour = Behaviour.extend(function TranslateBehaviour(model, options) {

	// Set default options
	this.options = {
		fields: false,
		translate: true
	};

	Behaviour.call(this, model, options);
});

/**
 * Disable translations
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.2.0
 */
TranslateBehaviour.setMethod(function disable() {
	// Disable translations
	this.options.translate = false;
});

/**
 * Enable translations
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.2.0
 * @version  0.2.0
 */
TranslateBehaviour.setMethod(function enable() {
	// Enable translations
	this.options.translate = true;
});

/**
 * Translate after every find
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.2.0
 */
TranslateBehaviour.setMethod(function afterFind(next, err, results, primary, alias, payload) {

	return;

	var render = this.model.render,
	    model  = this.model,
	    that   = this,
	    collection,
	    fieldName,
	    prefix,
	    record,
	    found,
	    lang,
	    nr,
	    i, j;

	// If translations have been disabled, do nothing,
	// except if a locale is specifically set in the find options
	if (!payload.options.locale && (this.model.disableTranslations || !render)) {
		return next();
	}

	if (payload.options.locale) {
		prefix = Array.cast(payload.options.locale).concat(Array.cast(render.prefix))
	} else {
		prefix = render.prefix;
	}

	for (i = 0; i < results.length; i++) {

		collection = Array.cast(results[i][alias]);

		for (j = 0; j < collection.length; j++) {

			record = collection[j];

			for (fieldName in that.fields) {

				if (record[fieldName] && render) {

					found = alchemy.pickTranslation(prefix, record[fieldName], true);

					// Empty strings are not valid translations
					if (typeof found === 'undefined' || found === '') {
						found = alchemy.pickTranslation(render.fallback, record[fieldName], true);
					}

					// Use the final result, if we found something or not
					record[fieldName] = found;
				}
			}
		}
	}

	next();
});
