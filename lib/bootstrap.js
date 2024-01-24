'use strict';
const libpath = require('path');

/**
 * Load Protoblast in the prototype-modifying mode.
 * This is the backbone of Alchemy.
 */
const Protoblast = require('protoblast')(true);

/**
 * Define shared global constants and require methods
 */
Protoblast.require(libpath.resolve(__dirname, 'scripts', 'create_shared_constants'));

/**
 * Define global constants and require methods
 */
Protoblast.require(libpath.resolve(__dirname, 'scripts', 'create_constants'), {client: false});

/**
 * Alchemy's Base class (from which all other classes inherit)
 */
requireCorePath('core', 'base');

/**
 * Alchemy's Client Base class
 */
requireCorePath('core', 'client_base');

/**
 * Load the stages classes
 */
requireCorePath('core', 'stage.js');

/**
 * Define the Stages instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
DEFINE('STAGES', new Classes.Alchemy.Stages.Stage('root'));

/**
 * Start the stages script
 */
requireCorePath('scripts', 'create_stages.js');

module.exports = STAGES;