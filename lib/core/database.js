var async = require('async'),
    aliasAssociations = {},
    associations = {},
    server = {},
    state = {};

/**
 * A pr print function for on the mongo server
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   message   The data to output
 * @param   {Boolean}  lines     Show lines around the message or not
 */
server.pr = function pr(message, lines) {

	if (lines) {
		print('\n');
		print('>>>>>>>>');
	}

	print(JSON.stringify(message, undefined, 4));

	if (lines) {
		print('<<<<<<<');
		print('\n');
	}
};

/**
 * See if an object is empty
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   obj    The object to check
 */
server.isEmpty = function isEmpty(obj) {
	var key;

	for (key in obj) {
		return false;
	}

	return true;
};

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
					
					var e = '';

					for (key in server) {
						e += 'db.system.js.save({_id:"' + key + '", value: ' + String(server[key]) + '});';
					}
					
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

	var a, aliases, aName, e, par, name, parfunc, modelName, modelInstance, entry, i;
	
	for (modelName in alchemy.models) {

		// Get the instance of this model
		modelInstance = Model.get(modelName);

		a = {};
		aliases = {};
		
		for (aName in modelInstance.associations) {

			entry = alchemy.cloneSafe(modelInstance.associations[aName]);

			for (i = 0; i < entry.length; i++) {
				entry[i].table = entry[i].modelName.tableize();
			}

			a[aName.tableize()] = entry;
		}

		for (aName in modelInstance.aliasAssociations) {
			entry = alchemy.cloneSafe(modelInstance.aliasAssociations[aName]);
			entry.table = entry.modelName.tableize();
			aliases[aName] = entry;
		}

		aliasAssociations[modelName.tableize()] = aliases;
		associations[modelName.tableize()] = a;
	}

	e = 'db.system.js.save({_id:"associations", value: ' + JSON.stringify(associations) + '});';
	e = 'db.system.js.save({_id:"aliasAssociations", value: ' + JSON.stringify(aliasAssociations) + '});';
	
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

/**
 * Perform a find on the given table
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   self        The context
 * @param   {Object}   conditions  The conditions object
 * @param   {String}   table       The table name
 * @param   {String}   alias       The alias
 */
server.doFind = function doFind(self, conditions, table, alias) {
	
	var cursor,
	    options = self.options,
	    queryFields;

	if (alias && self.queryFields) {
		queryFields = self.queryFields[alias];
	}

	cursor = db[table].find(conditions, queryFields);

	
	// If a valid sort object is given, apply it to the cursor
	// @todo: allow sorting associated data?
	if (typeof self.options.sort == 'object' && self.options.sort[alias]) {
		cursor.sort(self.options.sort[alias]);
	}

	// @todo: improve this by using cursors later on
	// now we do it this way to get the speed up
	if (isEmpty(conditions) && table == self.main && !self.orconditions) {

		self.emptyMain = true;

		// Count how many items would be available
		self.available = cursor.count();

		// If the offset has been set, skip them already
		if (options.offset) {
			cursor.skip(options.offset);

			// Make sure we don't offset later on again
			options.offset = 0;
		}

		if (options.limit > 0) {
			cursor.limit(options.limit);
		}
	}

	cursor = cursor.toArray();

	return cursor;
};

/**
 * The function to start executing a query on the mongo server
 * Runs server-side on mongoDB
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   options   The options object
 */
server.transmuteQuery = function transmuteQuery(settings) {

	var groups = {next: settings.conditions},
	    self   = settings,
	    conditions,
	    results;

	// Do all the AND groups until we reach an OR group
	while (groups.next) {

		// Shift to the next group
		groups = groups.next;
		conditions = groups.conditions;

		doGroup(self, groups);
	}

	// Now we have to merge the results
	mergePreliminaries(self);

	// Now we can process the $or data
	doMergedGroup(self, settings.orconditions);

	// Apply options (offset & limiting)
	applyOptions(self);

	// Finalize the data (get all associated data not yet fetched)
	finalizeData(self);

	return self.retval;
};

/**
 * Evaluate the first, main, $and conditions.
 * This will fetch the preliminary data we'll merge later.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   self        The context
 * @param   {Object}   group       The grouped conditions to use
 *
 * @return  {undefined}
 */
server.doGroup = function doGroup(self, group) {

	var condition,
	    compiled,
	    assoc,
	    alias,
	    i;

	self.current = group;

	for (alias in group.models) {

		assoc = group.models[alias];
		compiled = {};

		// Convert the conditions
		for (i = 0; i < assoc.conditions.length; i++) {
			condition = assoc.conditions[i];

			if (Array.isArray(condition.value)) {
				compiled[condition.field] = {$in: condition.value};
			} else {
				compiled[condition.field] = condition.value;
			}
		}

		doCondition(self, assoc, compiled);
	}

	delete self.current;
};

/**
 * Evaluator for $and conditions,
 * used in doGroup for fetching main data
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   self        The context
 * @param   {Object}   assoc       Info object on the association
 * @param   {Object}   compiled    The compiled condition
 *
 * @return  {undefined}
 */
server.doCondition = function doCondition(self, assoc, compiled) {

	var cursor;

	// See if we have to query this model a first time
	if (!self.results[assoc.alias]) {
		self.results[assoc.alias] = doFind(self, compiled, assoc.table, assoc.alias);
	} else {

		self.results[assoc.alias].filter(function(record) {

			var condition,
			    result,
			    temp,
			    i;

			// Depending on an OR or an AND,
			// the default result is different.
			if (self.current.type == '$or') {
				result = false;
			} else {
				result = true;
			}

			// Compare every condition using our own functions
			for (i = 0; i < assoc.conditions; i++) {
				condition = assoc.conditions[i];
				temp = compareValues(record[condition.field], condition.value);

				if (self.current.type == '$or') {
					result = result || temp;
				} else {
					result = result && temp;
				}
			}

			return result;
		});
	}
};


/**
 * Apply certain find options, like offset and limit
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   self   The context
 */
server.applyOptions = function applyOptions(self) {

	var results = self.merged,
	    available = 0;

	self.retval = {};

	if (results) {
		// Set the available count before doing anything to the data
		available = results.length;

		// If an offset has been given, remove the records before it
		if (self.options.offset > -1) {
			results = results.slice(self.options.offset);
		}

		// If a limit has been given, remove everything after it
		if (self.options.limit > -1) {
			results = results.slice(0, self.options.limit);
		}
	} else {
		results = [];
	}

	// @todo: remove this later on, when cursor stuff is implemented
	if (self.emptyMain && 'available' in self) {
		available = self.available;
	}

	self.retval.available = available;
	self.retval.results = results;
};

/**
 * Make sure we looked for data in the main model.
 * If we only added conditions for related models,
 * those results will be used to look for the main data
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   self   The context
 */
server.ensureMainData = function ensureMainData(self) {

	var results = self.results,
	    assocAlias,
	    condition;

	if (!results[self.mainAlias]) {

		// See if we already queried associated data,
		// and use the smallest recordset
		assocAlias = getSmallestAssociatedData(self);

		// Get a new condition out of this
		condition = extractMainIdCondition(self, assocAlias);

		// Execute that condition
		results[self.mainAlias] = doFind(self, condition, self.main, self.mainAlias);
	}

	return results[self.mainAlias];
};

/**
 * Return the alias name of the smallest already-found associated data.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   self        The context
 *
 * @return  {String}   The alias of the associated data
 */
server.getSmallestAssociatedData = function getSmallestAssociatedData(self) {

	var resultName,
	    alias,
	    count;

	// We start with infinity
	count = Infinity;

	for (alias in self.results) {
		if (alias == self.mainAlias) {
			continue;
		}

		if (self.results[alias] && self.results[alias].length < count) {
			resultName = alias;
			count = self.results[alias].length;
		}
	}

	return resultName;
};

/**
 * Create a condition object (that will be used to query the main data table)
 * with ids extracted from already found associated data.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   self        The context
 * @param   {String}   assocAlias  The alias name of the associated data
 *
 * @param   {Object}   The conditions to use for querying the main table
 */
server.extractMainIdCondition = function extractMainIdCondition(self, assocAlias) {

	var records    = self.results[assocAlias],
	    assocInfo  = aliasAssociations[self.main][assocAlias],
	    ids        = [],
	    condition  = {},
	    refField,
	    i;

	// If no records are available, we'll have to search for everything
	if (!records) {
		return condition;
	}

	for (i = 0; i < records.length; i++) {

		switch (assocInfo.type) {

			case 'belongsTo':
			case 'hasOneParent':
			case 'hasAndBelongsToMany':
				ids.push(records[i]._id);
				break;

			case 'hasMany':
			case 'hasOneChild':
				ids.push(records[i][assocInfo.foreignKey]);
				break;

			default:
				pr('ExtractMainId: ' + assocInfo.type + ' not implemented!');
				break;
		}
	}

	switch (assocInfo.type) {

		case 'belongsTo':
		case 'hasOneParent':
		case 'hasAndBelongsToMany':
			condition[assocInfo.foreignKey] = {$in: ids};
			break;

		case 'hasMany':
		case 'hasOneChild':
			condition._id = {$in: ids};
			break;

		default:
			pr('ExtractMainId: ' + assocInfo.type + ' not implemented!');
			break;
	}

	return condition;
};

/**
 * Merge the already-found data of the first AND group.
 * This will ensure main data is added.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   self        The context
 *
 * @return  {String}   The alias of the associated data
 */
server.mergePreliminaries = function mergePreliminaries(self) {

	var associations = aliasAssociations[self.main],
	    results      = self.results,
	    assocData,
	    stringId,
	    assocRec,
	    mainData,
	    record,
	    alias,
	    assoc,
	    skip,
	    data,
	    i,
	    j,
	    k;

	self.merged = [];
	mainData = results[self.mainAlias];

	mainData = ensureMainData(self);

	// Remove the main data from the resultset,
	// as we'll be iterating over them as associations
	delete results[self.mainAlias];

	// If we got records from the main model
	if (mainData) {

		for (i = 0; i < mainData.length; i++) {

			// Skip this record, false by default
			skip = false;

			// Get the current record
			record = mainData[i];

			// Create a new object to store all data in
			data = {};
			data[self.mainAlias] = record;

			// Go over all the already available association results
			// (Found with AND conditions, so they have to match)
			for (alias in results) {

				// Create the entry
				data[alias] = false;

				assocData = results[alias];

				// Get the association info for the current alias
				assocInfo = associations[alias];

				switch (assocInfo.type) {

					case 'hasOneChild':

						for (j = 0; j < assocData.length; j++) {
							assocRec = assocData[j];
							stringId = ''+assocRec[assocInfo.foreignKey];

							// If the ids match, this record can be associated
							if (stringId == record._id) {
								data[alias] = assocRec;

								// Also remove this record from the array,
								// as it can't be a child to anything else
								assocData.splice(j, 1);
								break;
							}
						}

						skip = !data[alias];
						break;

					case 'belongsTo':
					case 'hasOneParent':

						for (j = 0; j < assocData.length; j++) {
							assocRec = assocData[j];
							stringId = ''+assocRec._id;

							// If the ids match, this record can be associated
							if (stringId == record[assocInfo.foreignKey]) {
								data[alias] = assocRec;

								if (assocInfo.type == 'hasOneParent') {
									// Also remove this record from the array,
									// as it can't be a child to anything else
									assocData.splice(j, 1);
								}
								break;
							}
						}

						skip = !data[alias];
						break;

					// HABTM data is not stored in an extra table,
					// but inside an array in the origin record
					case 'hasAndBelongsToMany':
						for (j = 0; j < assocData.length; j++) {
							assocRec = assocData[j];
							stringId = ''+assocRec._id;

							for (k = 0; k < record[assocInfo.foreignKey].length; k++) {

								// If the ids match, this record can be associated
								if (stringId == record[assocInfo.foreignKey][k]) {

									if (!data[alias]) {
										data[alias] = [];
									}

									data[alias].push(assocRec);
								}
							}
						}

						skip = (!data[alias] && !data[alias].length);
						break;

					default:
						pr('mergePreliminaries: ' + assocInfo.type + ' NOT IMPLEMENTED!');
				}

				// Skip is true if one of the required associated data was not found
				if (skip) {
					pr('No data found for ' + alias)
					break;
				}

			}

			if (skip) {
				continue;
			}

			self.merged.push(data);
		}
	}
};

/**
 * Perform extra conditions after the initial $and search
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   self        The context
 * @param   {Object}   group       The grouped conditions to do now
 *
 * @return  {undefined}
 */
server.doMergedGroup = function doMergedGroup(self, group) {

	var condition,
	    compiled,
	    assoc,
	    alias,
	    i;

	// If no valid group has been given, do nothing
	if (!group) {
		return;
	}
	
	self.current = group;

	self.merged = self.merged.filter(function(data) {
		return doMergedCondition(self, data);
	});
};

/**
 * Finalize the data:
 * make sure all the associations are fetched
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   self        The context
 *
 * @return  {undefined}
 */
server.finalizeData = function finalizeData(self) {

	var tempAssociations = aliasAssociations[self.main],
	    associations = {},
	    foundAssociations,
	    alias,
	    i;

	if (self.queryFields) {
		// Remove unndeeded associated records
		for (alias in tempAssociations) {
			if (self.queryFields[alias]) {
				associations[alias] = tempAssociations[alias];
				foundAssociations = true;
			}
		}
	} else {
		// No query fields have been defined, so query all associated records
		associations = tempAssociations;
		foundAssociations = true;
	}

	// Go over every result 
	for (i = 0; i < self.retval.results.length; i++) {

		if (foundAssociations) {
			for (alias in associations) {
				ensureAssocData(self, self.retval.results[i], alias, associations[alias].table);
			}
		}
	}

	// @todo: remove fields that are not in the field list, but were
	// added because they were needed for querying or sorting

};

/**
 * Make sure we have looked for the specific association's data
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   self        The context
 * @param   {Object}   data        The record to add the associated data to
 * @param   {String}   alias       The alias of the associated data
 * @param   {String}   table       The table name of the associated data
 *
 * @return  {undefined}
 */
server.ensureAssocData = function ensureAssocData(self, data, alias, table) {

	var associations,
	    foreignValue,
	    queryFields,
	    conditions,
	    assocInfo,
	    result;

	// Only get associated data if it isn't available yet,
	// or if it's an array. Then we need to get the other records.
	if (typeof data[alias] == 'undefined' || Array.isArray(data[alias])) {

		associations = aliasAssociations[self.main];
		assocInfo    = associations[alias];

		if (!assocInfo) {
			return;
		}

		conditions = {};

		// Get the associated foreign data (not applicable for every type, though)
		foreignValue = data[self.mainAlias][assocInfo.foreignKey];

		switch (assocInfo.type) {

			case 'hasMany':
			case 'hasOneChild':
				conditions[assocInfo.foreignKey] = data[self.mainAlias]._id;

				// If no valid id is found, look for nothing
				if (typeof conditions[assocInfo.foreignKey] == 'undefined') {
					conditions = false;
				}
				break;

			case 'belongsTo':
			case 'hasOneParent':
				conditions['_id'] = foreignValue;

				// If no valid id is found, look for nothing
				if (typeof conditions['_id'] == 'undefined') {
					conditions = false;
				}
				break;

			case 'hasAndBelongsToMany':

				// Make sure the foreignValues are a valid array
				if (foreignValue && Array.isArray(foreignValue)) {
					conditions['_id'] = {$in: foreignValue};
				} else {
					conditions = false;
				}

				break;

			default:
				pr('ensureAssocData: ' + assocInfo.type + ' not implemented yet!');
				conditions = false;
				break;
		}

		if (conditions) {

			if (self.queryFields) {
				queryFields = self.queryFields[alias];
			}

			result = db[table][assocInfo.fnc](conditions, queryFields)

			if (assocInfo.fnc == 'findOne') {
				// findOne results return one simple object
				data[alias] = result;
			} else {
				// find results are cursors
				data[alias] = result.toArray();
			}
		} else {
			data[alias] = false;
		}
	}

};

/**
 * Perform extra conditions on the preliminary, merged results
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   self        The context
 * @param   {Object}   data        The record to apply the condition to
 *
 * @return  {Boolean}  True if this records can be used, false otherwise
 */
server.doMergedCondition = function doMergedCondition(self, data) {

	var group = self.current,
	    evaluation,
	    condition,
	    assoc,
	    alias,
	    temp,
	    i;

	// The evaluation is false by default for $or, and true by default for $and
	evaluation = (group.type != '$or');

	for (alias in group.models) {

		assoc = group.models[alias];

		// Make sure the associated data is available
		ensureAssocData(self, data, assoc.alias, assoc.table);

		for (i = 0; i < assoc.conditions.length; i++) {
			condition = assoc.conditions[i];

			temp = compareValues(data[alias][condition.field], condition.value);

			if (group.type == '$or') {
				evaluation = evaluation || temp;

				// First true or is enough
				if (evaluation) break;
			} else {
				evaluation = evaluation && temp;

				// First false and is enough
				if (!evaluation) break;
			}
		}

		// If the condition is an AND, and one failed, don't do the rest
		if (group.type != '$or' && !evaluation) {
			break;
		}

		// If the or is true, don't check the rest
		if (group.type == '$or' && evaluation) {
			break;
		}
	}

	return evaluation;
};

/**
 * See if values match
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {Object}   givenValue
 * @param   {Object}   conditionValue
 *
 * @return  {Boolean}  True if the value matches the condition, false otherwise
 */
server.compareValues = function compareValues(givenValue, conditionValue) {

	var temp, i;

	// If we're checking against an objectid, turn it into a string
	if (givenValue instanceof ObjectId) givenValue = givenValue.str;

	// An array is actually an 'OR', any of these conditions will do
	if (Array.isArray(conditionValue)) {
		for (i = 0; i < conditionValue.length; i++) {
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
};