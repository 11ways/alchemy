var async = require('async');
var state = {};
var associations = {};

/**
 * Initialize datasource connections.
 * Should only be called once.
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {object}   datasources   An object containing datasource options
 */
alchemy.initDatasources = function initDatasources (datasources) {
	
	if (state.added) {
		log.error('Trying to add datasources after init');
		return false;
	}
	
	var mongoose = alchemy.use('mongoose');
	
	var d;
	var uri;
	
	// Make sure the db connections object exists
	if (typeof alchemy._db_connections === 'undefined') alchemy._db_connections = {};
	
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
		(function (name, sputnikWaiter) {
			
			parallel[name] = function _createParallelConnection (callback) {
				
				db_connections[name] = mongoose.createConnection(uri);
				
				db_connections[name].on('error', function error_callback (err) {
					log.error('Database ' + name + ' connection error: ', {err: err});
					log.error(err, {err: err});
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
						
						// Tell sputnik this connection has been made
						sputnikWaiter();
						
					});
					
				});
			}
			
		})(name, alchemy.sputnik.wait('datasources'));
		
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
alchemy.registerModels = function registerModels() {

	var a, aName, e, par, name, parfunc, modelName, modelInstance;
	
	for (modelName in alchemy.models) {

		// Get the instance of this model
		modelInstance = Model.get(modelName);

		a = {};
		
		for (aName in modelInstance.associations) {
			a[aName.tableize()] = modelInstance.associations[aName];
		}
		
		associations[modelName.tableize()] = a;
	}
	
	e = 'db.system.js.save({_id:"associations", value: ' + JSON.stringify(associations) + '});';
	
	par = [];
	
	// @todo: use async
	for (name in alchemy._db_connections) {
		
		parfunc = (function(name) {
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
};

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

	var result = queryLevel(options, q, currentModel);
	
	return result;
}

var queryLevel = function queryLevel (options, queryOptions, currentModel, haystack) {
	
	var info         = queryOptions.info,
	    result       = false,
	    condition    = queryOptions.conditions,
	    queriedMain  = false,
	    passOptions  = false,
	    i;

	// Indicate the next query can be executed
	var doQueries = true;

	// Seperately found items will be stored here
	info._items = {};
	
	// Prepared items
	if (typeof haystack === 'undefined') haystack = {};
	
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

		passOptions = {};
		
		var modelConditions = condition[i],
		    query = {};

		// If we're querying the main model,
		// see if we need to add a limit
		if (modelConditions.model === options._currentModel) {

			if (options.sort) {
				passOptions.sort = options.sort;
			}

			if (options.limit > -1) {
				passOptions.limit = options.limit;
			}

			if (options.offset) {
				passOptions.skip = options.offset;
			}

			// Add the 'fields' option
			// @todo: These fields should be set per-model
			// with the Model.field_name notation,
			// right now only the main model gets these fields
			passOptions.fields = options.fields;
		}

		// Perform the query, either on already found items or by querying the db
		var resultData = searchHaystack(haystack, modelConditions, false, passOptions);
		var r = resultData.results;

		// If the conditions for this model equal the main model,
		// indicate we've queried it once
		if (modelConditions.model === options._currentModel) {
			queriedMain = true;
			info.available = resultData.cursorCount;
		}
		
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
	
	var results = [],
	    assocs = associations[currentModel],
	    nr,
	    table,
	    alias;
	
	// Now it's time to start merging all the result sets!
	// We start with the items from the active model
	for (nr in info._items[currentModel]) {
		
		// Indicate if this record can be added to the result
		var addRecord = true,
		    record = {};

		record[currentModel] = info._items[currentModel][nr];

		for (table in assocs) {

			if (typeof assocs[table].alias !== 'undefined') {
				alias = assocs[table].alias;
			} else {
				alias = table;
			}

			// If contain is false, or the table is defined in the contain, continue)
			if (!queryOptions.contain || queryOptions.contain[table]) {
				
				var subQuery = {};
				var joinOptions =  assocs[table];
				subQuery.model = table;
				
				if (joinOptions.type == 'hasMany' || joinOptions.type == 'hasOne') {
					subQuery.conditions = [{field: joinOptions.foreignKey, value: record[currentModel]._id}];
				} else if (joinOptions.type == 'hasAndBelongsToMany') {

					if (joinOptions.options.associationKey) {

						// The ID of the parent (current model) needs to be in
						// the array of the child
						// Because sometimes an objectid is stored, and
						// sometimes a string, we need to check for both representations
						var newValues = {
							$in: [
								record[currentModel]._id,
								''+record[currentModel]._id
							]
						};

						subQuery.conditions = [{field: joinOptions.options.associationKey, value: newValues}];
					} else {

						var foreignValues = record[currentModel][joinOptions.foreignKey],
						    newValues = [],
						    nr;

						if (Array.isArray(foreignValues)) {
							for (nr = 0; nr < foreignValues.length; nr++) {
								
								if (typeof foreignValues[nr] !== 'object' && foreignValues[nr].constructor.name !== 'ObjectId') {
									newValues.push(ObjectId(''+foreignValues[nr]));
								} else {
									newValues.push(foreignValues[nr]);
								}
							}
						}

						// The array of the child (current model) must contain the id of the parent
						subQuery.conditions = [{field: '_id', value: newValues}];
					}
					
				} else {
					// @todo: should _id be association foreign key?
					subQuery.conditions = [{field: '_id', value: record[currentModel][joinOptions.foreignKey]}];
				}

				// If the value is undefined, continue to the next association
				// (If we keep the search without conditions, it'll retrieve EVERY record)
				// (Undefined values are not permitted in a query)
				if (typeof subQuery.conditions[0].value !== 'undefined') {

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

						// If an entry already exists for this alias,
						// store it under something else
						if (typeof record[alias] !== 'undefined') {
							alias = alias + '_sub';
						}
						
						record[alias] = joinResult.results;
					}
				}
			}
		}
		
		if (addRecord) {
			results.push(record);
		}
	}
	
	return {info: info, results: results};
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

	var cursorCount, cursor;
	
	if (!hay) {
		
		// @todo: this undefined _id shouldn't be here in the first place!
		if (('_id' in query) && typeof query._id === 'undefined') query = {};

		var projection = undefined;

		if (options.fields && options.fields.length) {
			projection = {};

			for (var i = 0; i < options.fields.length; i++) {
				projection[options.fields[i]] = 1;
			}
		}

		if (options.fnc == 'find') {

			// Query the database for a result, using find
			cursor = db[modelConditions.model].find(query, projection);

			if (options.sort) {
				cursor.sort(options.sort);
			}

			if (options.skip) {
				cursor.skip(options.skip);
			}

			if (options.limit > 0) {
				cursor.limit(options.limit);
			}

			// Turn the results into an array
			results = cursor.toArray();

			// Count how many records there were (disregarding limit & offset)
			cursorCount = cursor.count();

		} else {
			results = db[modelConditions.model].findOne(query, projection);
		}
		
		performedDb = true;
	} else {
		results = resultstack;
	}
	
	if (joining) {
		return {cursorCount: cursorCount, performedDb: performedDb, results: results};
	} else {
		return {cursorCount: cursorCount, results: results};
	}
}

/**
 * See if values match
 */
var compareValues = function compareValues (givenValue, conditionValue) {
	
	var temp;

	// If we're checking against an objectid, turn it into a string
	if (givenValue instanceof ObjectId) givenValue = givenValue.str;

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