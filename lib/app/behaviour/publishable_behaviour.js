/**
 * The Publishable Behaviour class
 *
 * @constructor
 * @extends       alchemy.classes.Behaviour
 *
 * @author        Jelle De Loecker   <jelle@codedor.be>
 * @since         0.1.0
 * @version       0.1.0
 */
Behaviour.extend(function PublishableBehaviour (){

	/**
	 * Set publish options
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 */
	this.beforeFind = function beforeFind(next, options) {

		var dateCondition;

		if (options.publishableDate) {

			if (Date.isDate(options.publishableDate)) {
				dateCondition = options.publishableDate;
			} else {
				dateCondition = new Date();
			}

			options.conditions.publish_date = {$lt: dateCondition};
		}

		next();
	};

});