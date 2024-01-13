/**
 * Custom alchemy helpers
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Hawkejs.ViewRender}   view
 */
var Helper = Function.inherits('Hawkejs.Helper', 'Alchemy.Helper', function Helper(view) {
	return Helper.super.call(this, view);
});

/**
 * Add an error to the given element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Element}   element
 * @param    {string}    error
 */
Helper.setMethod(function markElementError(element, error) {
	element.setAttribute('data-alchemy-error', error);
});
