/**
 * Function to define global constants
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.4.0
 * @version  1.4.0
 *
 * @type     {Function}
 */
function DEFINE(name, value) {

	if (typeof name == 'function') {
		value = name;
		name = value.name;
	}

	Object.defineProperty(globalThis, name, {value: value});
}

/**
 * Use DEFINE for itself
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.4.0
 * @version  0.4.0
 *
 * @type     {Function}
 */
DEFINE('DEFINE', DEFINE);

/**
 * Create a global to __Protoblast
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @type     {Informer}
 */
DEFINE('Blast', __Protoblast);

/**
 * All classes will be collected here
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @type     {Object}
 */
DEFINE('Classes', Blast.Classes);

/**
 * Available types
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @type     {Object}
 */
DEFINE('Types', Blast.Types);

/**
 * The new Local Date/Time classes
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 */
DEFINE('LocalDateTime', Classes.Develry.LocalDateTime);
DEFINE('LocalDate', Classes.Develry.LocalDate);
DEFINE('LocalTime', Classes.Develry.LocalTime);

/**
 * The new Decimal classes
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 */
DEFINE('Decimal', Classes.Develry.Decimal);
DEFINE('MutableDecimal', Classes.Develry.MutableDecimal);
DEFINE('FixedDecimal', Classes.Develry.FixedDecimal);
DEFINE('MutableFixedDecimal', Classes.Develry.MutableFixedDecimal);
