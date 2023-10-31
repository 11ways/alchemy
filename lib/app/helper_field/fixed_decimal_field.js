/**
 * The FixedDecimal Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 */
const FixedDecimalField = Function.inherits('Alchemy.Field.Decimal', function FixedDecimal(schema, name, options) {

	if (options?.scale == null) {
		throw new Error('FixedDecimal fields require a scale option');
	}

	FixedDecimal.super.call(this, schema, name, options);
});

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {Mixed}   value
 *
 * @return   {Decimal}
 */
FixedDecimalField.setMethod(function cast(value) {

	// Allow null
	if (value == null) {
		return value;
	}

	if (value instanceof Classes.Develry.Decimal) {
		value = value.toImmutable().toScale(this.options.scale);
	} else {
		value = new Classes.Develry.FixedDecimal(value, this.options.scale);
	}

	return value;
});
