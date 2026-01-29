/**
 * The Password Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.2.3
 */
const Password = Function.inherits('Alchemy.Field', 'Password');

if (Blast.isBrowser) {
	return true;
}

const bcrypt = alchemy.use('bcrypt'),
      regex  = /^\$2[ayb]\$/;

/**
 * Make sure the password is hashed before storing it
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.4.0
 * @version  1.4.1
 *
 * @param    {Alchemy.OperationalContext.SaveFieldToDatasource}   context
 * @param    {*} value
 *
 * @return   {Pledge<*>|*}
 */
Password.setMethod(function _toDatasource(context, value) {

	if (regex.test(value)) {
		return value;
	}

	let pledge = new Pledge.Swift();

	let salt_rounds = this.options.salt_rounds || 10;

	bcrypt.hash(value, salt_rounds, pledge.getResolverFunction());

	return pledge;
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Password.setDatatype('string');

/**
 * Augment the JSON Schema with password-specific properties
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   schema   The schema object to augment
 */
Password.setMethod(function augmentJsonSchema(schema) {
	// Mark as write-only (should not be read back)
	schema.writeOnly = true;
	schema.format = 'password';
});