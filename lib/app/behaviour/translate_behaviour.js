/**
 * The Translate Behaviour class
 *
 * @constructor
 * @extends       alchemy.classes.Behaviour
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
Behaviour.extend(function TranslateBehaviour (){

	/**
	 * The preInit constructor
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.preInit = function preInit() {

		// Call the parent preInit function
		this.parent('preInit');

		this.fields = false;
		this.modelName = false;
		this.expose = true;
	};

	/**
	 * The behaviour constructor
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Model}     model    Model instance
	 * @param    {Object}    options  Bhaviour options
	 *
	 * @return   {undefined}
	 */
	this.init = function init(model, options) {

		// Call the parent init function
		this.parent('init');

		if (options.fields) {
			this.fields = options.fields;
		}

		this.modelName = model.modelName;
	};

	this.disable = function disable(value) {

		if (typeof value === 'undefined') value = true;

		// Disable translations in this augmented model
		this.model.disableTranslations = true;
	};

	this.afterFind = function afterFind(next, err, results, primary, alias, payload) {

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
	};

});