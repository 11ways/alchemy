'use strict';

/**
 * Load Protoblast in the prototype-modifying mode.
 * This is the backbone of Alchemy.
 */
require('protoblast')(true);

/**
 * Define global constants and require methods
 */
require('./init_scripts/constants');

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
requireCorePath('core', 'stages.js');

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
requireCorePath('init_scripts', 'stages.js');

module.exports = STAGES;