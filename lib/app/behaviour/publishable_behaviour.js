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

			if (!options.conditions.$and) {
				options.conditions.$and = [];
			} else if (!Array.isArray(options.conditions.$and)) {
				options.conditions.$and = [options.conditions.$and];
			}

			options.conditions.$and.push({
				$or: [
					// Or the publish date is lower than the given date
					{publish_date: {$lt: dateCondition}},
					// Or no publish date is set
					{publish_date: {$exists: false}}
				]
			});
		}

		next();
	};

});