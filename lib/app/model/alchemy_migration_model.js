/**
 * The Alchemy Migration Model class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.0
 * @version  1.2.0
 */
const AlchemyMigration = Function.inherits('Alchemy.Model.App', 'AlchemyMigration');

/**
 * Constitute the class wide schema
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.0
 * @version  1.2.0
 */
AlchemyMigration.constitute(function addTaskFields() {

	// The name of the migration
	this.addField('name', 'String');

	// The full path of the file
	this.addField('path', 'String');

	// When the migration ended
	this.addField('ended', 'Datetime');

	// Was there an error?
	this.addField('error', 'String');

});