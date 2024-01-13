/**
 * My-button custom element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.5
 * @version  1.1.5
 */
const MyButton = Blast.Bound.Function.inherits('Hawkejs.Element', 'MyButton');

/**
 * The template to use for the content of this element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.5
 * @version  1.1.5
 */
MyButton.setTemplateFile('elements/my_button');

/**
 * The text attribute
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.5
 * @version  1.1.5
 */
MyButton.setAttribute('text');

/**
 * Assigned value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.5
 * @version  1.1.5
 */
MyButton.setAssignedProperty('value');