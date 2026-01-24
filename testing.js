/**
 * Test Harness Entry Point
 *
 * This is the entry point for the Alchemy test harness.
 * Import via: require('alchemymvc/testing')
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 */
'use strict';

// Load Protoblast first (modifies native prototypes, same as Alchemy does)
require('protoblast')(true);

module.exports = require('./lib/testing/harness');
