/**
 * The App custom element.
 * The main app can use this to extend from and add custom functionality.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const App = Function.inherits('Alchemy.Element', 'App');

/**
 * Mark this as an "abstract" class
 * This will make sure this isn't registered as an `<al-app>` element
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
App.makeAbstractClass(true);