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
 * @version  1.4.0
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

	bcrypt.hash(value, 10, pledge.getResolverFunction());

	return pledge;
});