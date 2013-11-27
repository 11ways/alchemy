/**
 * The Translate Behaviour class
 *
 * @constructor
 * @extends       alchemy.classes.Component
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

		pr(this.fields, true)
		this.zever = "ZEVER";

		this.modelName = model.modelName;
	};

	this.disable = function disable(value) {

		if (typeof value === 'undefined') value = true;

		// Disable translations in this augmented model
		this.model.disableTranslations = true;
	};
	
	this.afterFind = function afterFind(next, err, results, primary) {

		var render = this.model.render,
		    model  = this.model,
		    that   = this,
		    collection,
		    fieldName,
		    record,
		    found,
		    lang,
		    nr,
		    i, j;

		pr(results);
		pr('Translating ' + this.model.name);
		pr('Disabled: ' + this.model.disableTranslations);
		pr('Augment level: ' + this.model.__augmentLevel);

		// If translations have been disabled, do nothing
		if (this.model.disableTranslations) {
			return next();
		}

		for (i = 0; i < results.length; i++) {

			collection = results[i][that.modelName];

			// Turn the record into an array
			if (!Array.isArray(collection)) {
				collection = [collection];
			}

			for (j = 0; j < collection.length; j++) {

				record = collection[j];

				for (fieldName in that.fields) {

					if (record[fieldName] && render) {

						found = this.pickTranslation(render.prefix, record[fieldName]);

						if (typeof found === 'undefined') {
							found = this.pickTranslation(render.fallback, record[fieldName]);
						}

						// Use the final result, if we found something or not
						record[fieldName] = found;
					}
				}
			}
		}

		pr(results);
		pr('Did the results for ' + that.modelName);

		next();
	};

	/**
	 * Pick and return a translation
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String|Array}    prefix    The prefix to get
	 * @param    {Object}          choices   The available choices
	 */
	this.pickTranslation = function pickTranslation(prefix, choices) {

		var i, result;

		if (Array.isArray(prefix)) {
			for (i = 0; i < prefix.length; i++) {
				result = this.pickTranslation(prefix[i], choices);

				// If the result has been found, don't look any further
				if (typeof result !== 'undefined') {
					break;
				}
			}
		} else {
			result = choices[prefix];
		}

		return result;
	};

});