var bcrypt = alchemy.use('bcrypt'),
    regex  = /^\$2[ayb]\$/;

/**
 * The PasswordFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.3.0
 */
var PasswordFieldType = FieldType.extend(function PasswordFieldType(schema, name, options) {
	FieldType.call(this, schema, name, options);
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
PasswordFieldType.setMethod(function _toDatasource(value, data, datasource, callback) {

	if (regex.test(value)) {
		return setImmediate(function alreadyHashedPassword() {
			callback(null, value);
		});
	}

	bcrypt.hash(value, 10, callback)
});