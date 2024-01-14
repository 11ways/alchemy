/**
 * The default App Controller class:
 * The main app can use this to extend from and add custom functionality.
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Conduit}   conduit
 * @param    {Object}            options
 */
const App = Function.inherits('Alchemy.Controller', 'App');

/**
 * Mark this class as being abstract
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
App.makeAbstractClass();