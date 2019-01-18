var bcrypt = alchemy.use('bcrypt'),
    regex  = /^\$2[ayb]\$/;

/**
 * The Password Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
var Password = Function.inherits('Alchemy.Field', function Password(schema, name, options) {
	Password.super.call(this, schema, name, options);
});

/**
 * Make sure the password is hashed before storing it
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.0
 * @version  0.4.0
 *
 * @param    {String}      value        Value of field
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