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

const libpath = require('path');

// Load Protoblast first (modifies native prototypes, same as Alchemy does)
// The return value is the Blast instance
const Blast = require('protoblast')(true);

// The testing lib path
const testingLibPath = libpath.resolve(__dirname, 'lib', 'testing');

// Use Blast.require to load the testing modules
// This ensures they have access to Blast, Classes, and other Protoblast globals
const TestHarness = Blast.require('harness', {
	pwd: testingLibPath,
	client: false,
});

const BrowserHelper = Blast.require('browser', {
	pwd: testingLibPath,
	client: false,
});

// Make BrowserHelper available as a property of TestHarness
TestHarness.BrowserHelper = BrowserHelper;

module.exports = TestHarness;
