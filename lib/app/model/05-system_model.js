/**
 * The base System model class.
 * Models meant for the Alchemy system.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const System = Function.inherits('Alchemy.Model.App', 'Alchemy.Model.System', 'System');

/**
 * Mark this class as being abstract
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
System.makeAbstractClass();

/**
 * Use the `alchemy` prefix for the table name
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
System.setTablePrefix('alchemy');