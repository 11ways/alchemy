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

	var that = this;

	this.fields = false;
	this.modelName = false;

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
	
	this.afterFind = function afterFind(next, err, results, primary) {

		var i, record, fieldName;

		for (i = 0; i < results.length; i++) {
			record = results[i][that.modelName];

			for (fieldName in that.fields) {
				if (record[fieldName]) {
					record[fieldName].use = record[fieldName]['nl'];
				}
			}
		}
		pr(results)
		next();
	};
	
});