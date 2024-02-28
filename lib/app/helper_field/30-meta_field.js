/**
 * The Abstract Meta Field class
 * These fields are not actually in the database.
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const MetaField = Function.inherits('Alchemy.Field', 'Meta');

/**
 * Make this an abtract class
 */
MetaField.makeAbstractClass();

/**
 * Indicate this is a meta field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {Boolean}
 */
MetaField.setProperty('is_meta_field', true);
