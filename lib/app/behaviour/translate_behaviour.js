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
	
	this.afterFind = function afterFind(next, err, results, primary, alias) {

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

		// If translations have been disabled, do nothing
		if (this.model.disableTranslations || !render) {
			return next();
		}

		for (i = 0; i < results.length; i++) {

			collection = results[i][alias];

			// Turn the record into an array
			if (!Array.isArray(collection)) {
				collection = [collection];
			}

			for (j = 0; j < collection.length; j++) {

				record = collection[j];

				for (fieldName in that.fields) {

					if (record[fieldName] && render) {

						found = alchemy.pickTranslation(render.prefix, record[fieldName], true);

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