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
 * Function to define global constants
 * and have them inside Hawkejs views too
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Function}
 */
function DEFINE_CLIENT(name, value) {
	DEFINE(name, value);
	Classes.Hawkejs.setGlobal(name, value);
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
DEFINE_CLIENT('Blast', __Protoblast);

/**
 * All classes will be collected here
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @type     {Object}
 */
DEFINE_CLIENT('Classes', Blast.Classes);

/**
 * Available types
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @type     {Object}
 */
DEFINE_CLIENT('Types', Blast.Types);

/**
 * The new Local Date/Time classes
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 */
DEFINE_CLIENT('LocalDateTime', Classes.Develry.LocalDateTime);
DEFINE_CLIENT('LocalDate', Classes.Develry.LocalDate);
DEFINE_CLIENT('LocalTime', Classes.Develry.LocalTime);

/**
 * The new Decimal classes
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 */
DEFINE_CLIENT('Decimal', Classes.Develry.Decimal);
DEFINE_CLIENT('MutableDecimal', Classes.Develry.MutableDecimal);
DEFINE_CLIENT('FixedDecimal', Classes.Develry.FixedDecimal);
DEFINE_CLIENT('MutableFixedDecimal', Classes.Develry.MutableFixedDecimal);

/**
 * The Trail class:
 * A class that represents a path in an object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
DEFINE_CLIENT('Trail', Classes.Develry.Trail);

/**
 * The Swift class:
 * The "Swift" version of the promise-like Pledge class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
DEFINE_CLIENT('Swift', Classes.Pledge.Swift);