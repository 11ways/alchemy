/**
 * All our external requirements
 */
var express = require('express');
var mongoose = require('mongoose');
var http = require('http');
var less = require('less');
var lessmw = require('less-middleware')
var path = require('path');
var store = new express.session.MemoryStore;
var $ = require('jquery');
var bcrypt = require('bcrypt');
var async = require('async');
var io = require('socket.io');
var util = require('util');
var randomstring = require('randomstring');
var fs = require('fs');
var mv = require('mv');
var mkdirp = require('mkdirp');
var hawkejs = require('hawkejs');

// Get the root directory
var root = path.dirname(require.main.filename);

// Set the alchemy global
var alchemy = global.alchemy || {};
global.alchemy = alchemy;

alchemy.classes = {};

// Initialize express
var app = express();
alchemy._app = app;

// Prepare the settings object
var settings = {};
alchemy._settings = settings;

// Get the local (environment) specific settings
var local = require(path.resolve(root, 'config', 'local'));
settings.environment = local.environment;

// Get the database settings
var datasources = require(path.resolve(root, 'config', settings.environment, 'database'));
settings.datasources = datasources;

// Get the config
var config = require(path.resolve(root, 'config', settings.environment, 'config'));
settings.config = config;

var db_connections = {};

// Connect to the databases
(function() {
	
	var d;
	var uri;
	
	for (var name in datasources) {
		
		// Get the current datasource settings
		d = datasources[name];
		
		// Prepare the uri string
		uri = 'mongodb://';
		
		// Add a login & password if needed
		if (d.login && d.password) {
			uri += d.login + ':' + d.password + '@';
		}
		
		// Add the host name or ip
		uri += d.host;
		
		// Add a port if set
		if (d.port) {
			uri += ':' + d.port;
		}
		
		// Add the database name
		uri += '/' + d.database;
		
		// Create the connection
		db_connections[name] = mongoose.createConnection(uri);
	}
})();

alchemy._db_connections = db_connections;

// Get the core files
require('./core/BaseClass');
require('./core/Model');

// Create the app
alchemy._server = http.createServer(app);

require('./helpers');

alchemy._server.listen(settings.config.port, function(){
	console.log('Listening on ' + settings.config.port);
});