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
 * @version  0.4.0
 *
 * @param    {string}      value        Value of field
 * @param    {Object}      data         The data object containing `value`
 * @param    {Datasource}  datasource   The destination datasource
 */
Password.setMethod(function _toDatasource(value, data, datasource, callback) {

	if (regex.test(value)) {
		return setImmediate(function alreadyHashedPassword() {
			callback(null, value);
		});
	}

	bcrypt.hash(value, 10, callback)
});