/**
 * The Publishable Behaviour class
 *
 * @constructor
 * @extends       Alchemy.Behaviour
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.1.0
 * @version       0.3.0
 */
var Publish = Function.inherits('Alchemy.Behaviour', function PublishableBehaviour(model, options) {
	PublishableBehaviour.super.call(this, model, options);
});

/**
 * Listen to attachments to schema's
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.3
 * @version  1.0.3
 *
 * @param    {Schema}    schema
 * @param    {Object}    options
 */
Publish.setStatic(function attached(schema, options) {

	var context = schema.modelClass;

	if (schema.getField('publish_date')) {
		return;
	}

	// Add the publish_date
	context.addField('publish_date', 'Datetime');
});

/**
 * Set publish options
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.2.0
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