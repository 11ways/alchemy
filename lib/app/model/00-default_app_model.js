/**
 * The default App model class.
 * The main app can use this to extend from and add custom functionality.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const App = Function.inherits('Alchemy.Model', 'App');

/**
 * Mark this class as being abstract
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
App.makeAbstractClass();