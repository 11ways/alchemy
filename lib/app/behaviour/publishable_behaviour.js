/**
 * The Publishable Behaviour class
 *
 * @constructor
 * @extends       Alchemy.Behaviour
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.3.0
 */
var Publish = Function.inherits('Alchemy.Behaviour', function PublishableBehaviour(model, options) {
	PublishableBehaviour.super.call(this, model, options);
});

/**
 * Listen to attachments to schema's
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.3
 * @version  1.0.3
 *
 * @param    {Schema}    schema
 * @param    {Object}    options
 */
Publish.setStatic(function attached(schema, options) {

	var context = schema.model_class;

	if (schema.getField('publish_date')) {
		return;
	}

	// Add the publish_date
	context.addField('publish_date', 'Datetime');
});

/**
 * Set publish options
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.1.0
 * @version  1.1.0
 *
 * @param    {Criteria}   criteria
 */
Publish.setMethod(function beforeFind(criteria) {

	var date_condition;

	if (criteria.options.publish_date) {

		if (Date.isDate(criteria.options.publish_date)) {
			date_condition = criteria.options.publish_date;
		} else {
			date_condition = new Date();
		}

		criteria.where('publish_date').lt(date_condition).or().exists(false);
	}
});