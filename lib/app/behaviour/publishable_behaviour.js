/**
 * The Publishable Behaviour class
 *
 * @constructor
 * @extends       alchemy.classes.Behaviour
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.1.0
 * @version       1.0.0
 */
var Publish = Function.inherits('Behaviour', function PublishableBehaviour(model, options) {
	PublishableBehaviour.super.call(this, model, options);
});

/**
 * Set publish options
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.0.0
 */
Publish.setMethod(function beforeFind(options) {

	var date_condition;

	if (options.publish_date) {

		if (Date.isDate(options.publish_date)) {
			date_condition = options.publish_date;
		} else {
			date_condition = new Date();
		}

		if (!options.conditions) {
			options.conditions = {};
		}

		if (!options.conditions.$and) {
			options.conditions.$and = [];
		} else if (!Array.isArray(options.conditions.$and)) {
			options.conditions.$and = [options.conditions.$and];
		}

		options.conditions.$and.push({
			$or: [
				// Or the publish date is lower than the given date
				{publish_date: {$lt: date_condition}},
				// Or no publish date is set
				{publish_date: {$exists: false}}
			]
		});
	}
});