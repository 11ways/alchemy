var async = require('async');
var state = {};
var associations = {};

/**
 * Add datasource connections
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {object}   datasources   An object containing datasource options
 */
alchemy.addDatasources = function addDatasources (datasources) {
	
	if (state.added) {
		log.error('Trying to add datasources after init');
		return false;
	}
	
	var mongoose = alchemy.use('mongoose');
	
	var d;
	var uri;
	
	// Make sure the db connections object exists
	if (typeof alchemy._db_connections == 'undefined') alchemy._db_connections = {};
	
	// Create a reference to that object
	var db_connections = alchemy._db_connections;
	
	// Use for parallel task flow
	var parallel = {};
	
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
		
		// Timeout after 3 seconds
		uri += '?connectTimeoutMS=3000';
		
		// Create the connection
		(function (name) {
			
			parallel[name] = function _createParallelConnection (callback) {
				
				db_connections[name] = mongoose.createConnection(uri);
				
				db_connections[name].on('error', function error_callback (err) {
					log.error('Database ' + name + ' connection error: ' + err);
				});
				
				db_connections[name].once('open', function open_callback () {
					
					var message = 'Database connection to ' + name + ' has been made';
					
					// Database connection has been made
					log.info(message.green);
					
					var e = 'db.system.js.save({_id:"transmuteQuery", value: ' + String(transmuteQuery) + '});';
					e += 'db.system.js.save({_id:"queryLevel", value: ' + String(queryLevel) + '});';
					e += 'db.system.js.save({_id:"searchHaystack", value: ' + String(searchHaystack) + '});';
					e += 'db.system.js.save({_id:"compareValues", value: ' + String(compareValues) + '});';
					
					// Store the procedures on the server
					// This is the first function that runs once a connection has been made,
					// and since we use db.eval, it'll lock the database by default.
					// No other functions will run while these are being created
					// Which only happens on server startup
					db_connections[name].db.eval(e, function() {
						
						log.info('Stored procedures on MongoDB server ' + name.bold);
						
						callback(null);
						
					});
					
				});
			}
			
		})(name);
		
	}
	
	log.info('Going to create connection to datasources'.yellow);
	
	// Create all the connections, once they've been made emit the
	// datasourcesConnected event
	async.parallel(parallel, function _allConnectionsCreated (err) {

		if (err) {
			log.error('New error >>>');
			log.error(err);
			throw new Error('Failed to create connection!')
		} else {
			log.info('Created connection to all datasources');
			alchemy.emit('datasourcesConnected');
		}
		
	});
	
	// Indicate we've added the datasources,
	// next time this function runs it'll do nothing but
	// log an error (it won't throw it, though)
	state.added = true;
	
	return true;
}

/**
 * Register models & associations in the database,
 * needed for queries later
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.registerModels = function registerModels () {

	var a;
	
	for (var modelName in alchemy.models) {
		
		a = {};
		
		for (var aName in alchemy.models[modelName].associations) {
			a[aName.tableize()] = alchemy.models[modelName].associations[aName];
		}
		
		associations[modelName.tableize()] = a;
	}
	
	var e = 'db.system.js.save({_id:"associations", value: ' + JSON.stringify(associations) + '});';
	
	var par = [];
	
	// @todo: use async
	for (var name in alchemy._db_connections) {
		
		var parfunc = (function(name) {
			return function parfunccallback (cb) {
				alchemy._db_connections[name].db.eval(e, function() {
					cb();
				});
			}
		})(name);
		
		par.push(parfunc);
	}
	
	async.parallel(par, function associationsCreatedParResult (err, result) {
		log.info('Associations have been saved in the database');
		alchemy.emit('associationsCreated');
	});
	
}

/** _conditions Example **/
var example = {
	info: { models: [ 'users', 'news' ],
    submodels: [],
    //joins: {news: { type: 'hasMany', foreignKey: 'author_id', alias: 'News' }},
    findScope: '$and',
    level: 0,
    subqueries: []
	},
	conditions: [
		{ model: 'users', conditions: [{field: 'name', value: /jelle/ }]},
		{ model: 'news', conditions: [{field: 'name', value: /newsname/ }]}
	]
};

/**
 * The function to start executing a query on the mongo server
 * Runs server-side on mongoDB
 *
 * @param   {object}   options   The options object
 */
var transmuteQuery = function transmuteQuery (options) {
	
	// The 'compiled' query, coming from the node.js app
	var q = options._conditions;
	
	// The 'main' model
	var currentModel = options._currentModel;
	
	var result = queryLevel(q, currentModel);
	
	return result;

	return options._currentModel;
	return q[1];
}

var queryLevel = function queryLevel (queryOptions, currentModel, haystack) {
	
	var info = queryOptions.info, result = false, i;
	var condition = queryOptions.conditions;
	
	// Indicate the next query can be executed
	var doQueries = true;

	// Seperately found items will be stored here
	info._items = {};
	
	// Prepared items
	if (typeof haystack == 'undefined') haystack = {};
	
	// The evaluation will be decided based on the info.found
	info.evaluation = null;
	
	if (info.findScope == '$and') {
		info.found = true;
	} else if (info.findScope == '$or') {
		info.found = false;
	} else if (info.findScope == '$not') {
		info.found = true;
	}
	
	for (i = 0; i < condition.length; i++) {
		
		// If doQueries is false, a previous required condition turned out to be
		// false, and we don't need to perform any more queries, since the result
		// is false!
		if (!doQueries) {
			modelConditions.found = false;
			modelConditions.items = [];
			break;
		}
		
		var modelConditions = condition[i];
		
		var query = {};
		
		// Perform the query, either on already found items or by querying the db
		var r = searchHaystack(haystack, modelConditions);
		
		// Store the resultset
		haystack[modelConditions.model] = r;
		
		// Have we found items?
		modelConditions.found = !!r.length;
		
		// Store the result
		info._items[modelConditions.model] = r;
		
		if (info.findScope == '$and') {
			info.found = info.found && modelConditions.found;
			doQueries = info.found;
		} else if (info.findScope == '$or') {
			// Since this is an $or query, we have to do every query
			doQueries = true;
			info.found = info.found || modelConditions.found;
		}
		
	}
	
	// The evaluation is mostly equal to the found
	info.evaluation = info.found;
	
	// Unless it's a $not, of course!
	if (info.findScope == '$not') {
		info.evaluation = !info.found;
	}
	
	var results = [];

	var assocs = associations[currentModel];
	
	// Now it's time to start merging all the result sets!
	// We start with the items from the active model
	for (var nr in info._items[currentModel]) {
		
		// Indicate if this record can be added to the result
		var addRecord = true;
		
		var record = {};
		record[currentModel] = info._items[currentModel][nr];
		
		for (var table in assocs) {

			// If contain is false, or the table is defined in the contain, continue)
			if (!queryOptions.contain || queryOptions.contain[table]) {
				
				var subQuery = {};
				var joinOptions =  assocs[table];
				subQuery.model = table;
				
				if (joinOptions.type == 'hasMany' || joinOptions.type == 'hasOne') {
					subQuery.conditions = [{field: joinOptions.foreignKey, value: record[currentModel]._id}];
				} else {
					// @todo: should _id be association foreign key?
					subQuery.conditions = [{field: '_id', value: record[currentModel][joinOptions.foreignKey]}];
				}
				
				var joinStack = {};
				
				if (queryOptions.filterJoins) joinStack = haystack;
				
				var joinResult = searchHaystack(joinStack, subQuery, true, joinOptions);
				
				// If we did not perform a db query for this join, and the resultset is
				// empty, that means an earlier condition did not validate
				// So we do not add this record at all
				// @todo: See what kind of impact filterJoins has on this!
				if (!joinResult.performedDb && joinResult.results.length == 0) {
					addRecord = false;
				} else {
					record[table] = joinResult.results;
				}
			}
		}
		
		if (addRecord) results.push(record);
	}
	
	return results;
}

/**
 * Look in the haystack for a single condition,
 * or in the db if no search was performed yet
 *
 * @returns   {array}
 */
var searchHaystack = function searchHaystack (haystack, modelConditions, joining, options) {
	
	if (typeof options == 'undefined') options = {};
	if (typeof joining == 'undefined') joining = false;
	
	if (typeof options.fnc == 'undefined') options.fnc = 'find';
	
	// The table name
	var table = modelConditions.model;
	
	// The results
	var results = [];
	
	// Store the query in here, should we have to perform one
	var query = {};
	
	// Look in the haystack or not?
	var hay = (typeof haystack[table] != 'undefined');
	
	//if (!hay) haystack[table] = false;
	
	// Create the resultstack
	var resultstack;
	
	var performedDb = false;
	
	// Temporary alias
	var tableRecords;
	
	for (var x in modelConditions.conditions) {
		
		var singleCondition = modelConditions.conditions[x];
		
		// If there is no entry in the haystack, prepare the query
		if (!hay) {
			
			// If the field is null, then query for everything
			if (singleCondition.field != null) {
				
				if (singleCondition.value instanceof Array) {
					query[singleCondition.field] = {$in: singleCondition.value};
					//return query;
				} else {
					query[singleCondition.field] = singleCondition.value;
				}
			}
			continue;
		}
		
		// If there is an entry in the resultstack, use that one
		if (resultstack && resultstack.length) {
			tableRecords = resultstack;
		} else {
			tableRecords = haystack[table];
		}
		
		// Now clean out the resultstack so we can add new items
		resultstack = [];
		
		
		// Go over every record in the haystack
		for (var nr in tableRecords) {
			
			var record = tableRecords[nr];

			var checkValue = record[singleCondition.field];
			
			if (compareValues(checkValue, singleCondition.value)){
				resultstack.push(record);
			}
			
		}
	}
	
	if (!hay) {
		
		// @todo: this undefined _id shouldn't be here in the first place!
		if (('_id' in query) && typeof query._id == 'undefined') query = {};
		
		if (options.fnc == 'find') {
			// Query the database for a result, using find
			results = db[modelConditions.model].find(query).toArray();
		} else {
			results = db[modelConditions.model].findOne(query);
		}
		performedDb = true;
	} else {
		results = resultstack;
	}
	
	if (joining) {
		return {performedDb: performedDb, results: results};
	} else {
		return results;
	}
}

/**
 * See if values match
 */
var compareValues = function compareValues (givenValue, conditionValue) {
	
	var temp;
	
	// If we're checking against an objectid, turn it into a string
	if (givenValue instanceof ObjectId) givenValue = givenValue.toString();
	
	// An array is actually an 'OR', any of these conditions will do
	if (conditionValue instanceof Array) {
		for (var i = 0; i < conditionValue.length; i++) {
			temp = compareValues(givenValue, conditionValue[i]);
			
			if (temp) return true;
		}
		
		return false;
	}
	
	// If the condition is a regex, execute it
	if (conditionValue instanceof RegExp) {
		return !!conditionValue.exec(givenValue);
	} else {
		return (givenValue == conditionValue);
	}
	
	return false;
}