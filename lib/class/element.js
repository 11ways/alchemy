/**
 * Custom alchemy elements
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var Element = Function.inherits('Hawkejs.Element', 'Alchemy.Element', function Element() {
	return Element.super.call(this);
});

/**
 * The default element prefix (when element contains no hyphen) is "al"
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Function.getNamespace('Alchemy.Element').setStatic('default_element_prefix', 'al');
