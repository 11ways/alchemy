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
	
	this.afterFind = function afterFind(next, err, results, primary, self) {

		var i, record, fieldNameentry, lang, nr, found, that = this;

		if (this.render) {
			pr('>>>>>>>>>>>>>>>>')
			pr(this.render.locale, true);
			pr(this.render.languages)
		}

		for (i = 0; i < results.length; i++) {
			record = results[i][that.modelName];

			for (fieldName in self.fields) {

				if (record[fieldName] && this.render) {

					// Indicate we haven't found the wanted language yet
					found = false;

					for (nr = 0; nr < this.render.languages.length; nr++) {
						entry = this.render.languages[nr];
						lang = entry.lang;

						// If the wanted language entry exists, use it and break
						if (record[fieldName][lang]) {
							record[fieldName].use = record[fieldName][lang];
							found = true;
							break;
						}
					}

					// No translation found, use the first entry
					if (!found) {
						for (nr in record[fieldName]) {
							record[fieldName].use = record[fieldName][nr];
							break;
						}
					}
				}
			}
		}

		pr(results);
		pr('Did the results for ' + that.modelName);

		next();
	};
	
});