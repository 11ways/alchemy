/**
 * Browser Helper Entry Point
 *
 * This is the entry point for the Alchemy browser testing helper.
 * Import via: require('alchemymvc/testing/browser')
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 */
'use strict';

const libpath = require('path');

// Load Protoblast first (modifies native prototypes, same as Alchemy does)
const Blast = require('protoblast')(true);

// The testing lib path
const testingLibPath = libpath.resolve(__dirname, '..', 'lib', 'testing');

// Use Blast.require to load the browser module
const BrowserHelper = Blast.require('browser', {
	pwd: testingLibPath,
});

module.exports = BrowserHelper;
