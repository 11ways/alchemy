/**
 * The ForeignKey Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const ForeignKey = Function.inherits('Alchemy.Field.ObjectId', 'ForeignKey');

/**
 * Indicate this is a foreign key field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {boolean}
 */
ForeignKey.setProperty('is_foreign_key', true);

/**
 * Get the association
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {Object}
 */
ForeignKey.setMethod(function getAssociation() {

	if (!this.schema) {
		return false;
	}

	return this.schema.getAssociation(this.options.alias);
});
