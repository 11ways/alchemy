var validate = require('mongoose-validator').validate;
var mongoose = require('mongoose');
alchemy._mongoose = mongoose;
var async = require('async');

/**
 * The Model class
 *
 * @constructor
 * @augments alchemy.classes.BaseClass
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
var Model = global.Model = alchemy.classes.BaseClass.extend(function Model (){
	
	/**
	 * The name of the DataSource connection that this Model uses
	 *
	 * The value must be an attribute name that you defined in `config/locale/database.js`
	 *
	 * @var string
	 */
	this.useDbConfig = 'default';

	/**
	 * Custom database table name, or null/false if no table association is desired.
	 *
	 * @var string
	 */
	this.useTable = null;
	
	/**
	 * Custom display field name.
	 *
	 * @var string
	 */
	this.displayField = null;
	
	/**
	 * Value of the primary key ID of the record that this model is currently pointing to.
	 * Automatically set after database insertions.
	 *
	 * @var mixed
	 */
	this.id = false;
	
	/**
	 * Table name for this Model.
	 *
	 * @var string
	 */
	this.table = false;
	
	/**
	 * The model name.
	 *
	 * @var string
	 */
	this.modelName = null;
	
	/**
	 * Alias name for model.
	 *
	 * @var string
	 */
	this.alias = null;

	/**
	 * The connection to use for this model.
	 * 
	 * @type {object}
	 */
	this.connection = false;
	
	/**
	 * The connection status
	 *
	 * @type {boolean}
	 */
	this.connected = false;
	
	/**
	 * hasOneChild associations
	 * 
	 * @type {Object}
	 */
	this.hasOneChild = {};
	
	/**
	 * hasOneParent associations
	 * 
	 * @type {Object}
	 */
	this.hasOneParent = {};
	
	/**
	 * hasMany associations
	 * 
	 * @type {Object}
	 */
	this.hasMany = {};
	
	/**
	 * HABTM associations
	 * 
	 * @type {Object}
	 */
	this.habtm = {};
	this.hasAndBelongsToMany = this.habtm;
	
	/**
	 * belongsTo associations
	 * 
	 * @type {Object}
	 */
	this.belongsTo = {};
	
	/**
	 * All associations
	 *
	 * @type {object}
	 */
	this.associations = {};
	
	/**
	 * Default find options
	 *
	 * @type {Object}
	 */
	this.findOptions = {
    conditions: {},
		_conditions: {}, // 'Cleaned up' conditions are stored here
		recursive: 1,
		fields: [],
		order: false,
		limit: -1,
		page: false,
		offset: false,
		callbacks: true, // Other possible values are false, 'before', 'after,
		lean: true,      // Return simple javascript objects, not mongoose docs
		filterJoins: false, // If a join is part of a condition, also filter it
		_mongoFnc: 'find'
	};
	
	this.blueprint = {};

	this.schema = {};
	this.cache = {};
	
	// Index settings per fields are stored here
	this._indexFields = {};
	
	// Indexes settings per name are stored here
	this._indexes = {};
	
	this.many = {};
	this.special = {json: {}};
	
	this._prepost = {
		pre: [],
		post: []
	};
	
	// "Hidden" properties
	this._mongoose = mongoose;
	this._validate = validate;
	this._model = {};

	/**
	 * Constructor. Binds the model's database table to the object.
	 *
	 * This is the layout of the "options" parameter:
	 * - id       - The id to start the model on.
	 * - table    - The table to use for this model.
	 * - ds       - The connection name this model is connected to.
	 * - name     - The name of the model eg. Post.
	 * - alias    - The alias of the model, this is used for registering the instance in the `ClassRegistry`.
	 *   eg. `ParentThread`
	 *
	 *
	 * @param   {Object}   options
	 */
	this.init = function init (options) {
		
		if (typeof options != 'undefined') {
			if (typeof options.id != 'undefined') this.id = options.id;
			if (typeof options.table != 'undefined') this.useTable = options.table;
			if (typeof options.ds != 'undefined') this.useDbConfig = options.ds;
			if (typeof options.name != 'undefined') this.modelName = options.name;
			if (typeof options.alias != 'undefined') this.alias = options.alias;
		}

		if (this.useTable === null) {
			if (this.modelName) this.useTable = this.modelName.tableize();
		}
		
		if (this.useTable) {
			
			var thisModel = this;
			
			// Set the connection
			this.connection = alchemy._db_connections[this.useDbConfig];
			
			// Set the initial connection state
			thisModel.connected = this.connection._hasOpened;
			
			// Set the connection status
			this.connection.on('open', function onModelConnectionOpen () {
				thisModel.connected = true;
			});
			
			this.connection.on('error', function onModelConnectionOpen () {
				thisModel.connected = false;
				log.error('Connection error!');
			});
			
			// Create the schema based on our blueprint
			this._schema = this._createSchema(this.blueprint);
			
			// Create the model based on that schema
			this._model = this._createModel(this.modelName, this._schema, this.enableCache);
		}
	}
	
	this.__extended__ = function __extended__ (parentClassName, parentClass) {

		if (!this.modelName || this.modelName == parentClass.modelName) {
			this.modelName = this.name.replace('Model', '');
		}
		
		if (this.prototype) this.prototype.modelName = this.modelName;
		
		// Store this class in the model collection
		if (this.modelName) alchemy.models[this.modelName] = this;
		
		// Reset the associations, otherwise all models share the same object
		this.associations = {};
		
		this._compileAssociation('hasMany', this.hasMany);
		this._compileAssociation('hasOneChild', this.hasOneChild, {foreignKey: this.modelName.foreign_key()}, {fnc: 'findOne'});
		this._compileAssociation('hasOneParent', this.hasOneParent, null, {fnc: 'findOne'});
		this._compileAssociation('belongsTo', this.belongsTo, null, {fnc: 'findOne'});
		
		// Add belongsTo fields to the blueprint
		for (var modelName in this.associations) {
			
			var assoc = this.associations[modelName];
			
			// hasOne fields should be unique
			// only do this if this is the child model (so: if the association is the parent)
			if (assoc.type == 'hasOneParent') {
				this.blueprint[assoc.foreignKey] = {
					type: 'ObjectId',
					index: {
						unique: true,
						order: 'asc'
					}
				};
			} else if (assoc.type == 'belongsTo') {
				this.blueprint[assoc.foreignKey] = {
					type: 'ObjectId',
					index: {
						unique: false,
						order: 'asc'
					}
				};
			}
			
		}

		if (this.prototype) this.prototype.associations = this.associations;
	}
	
	/**
	 * Compile an association
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {string}   name            The name of the association type
	 * @param    {object}   associations    The associations to compile
	 *
	 * @returns  {void}     Does not return anything, directly stores in this.associations
	 */
	this._compileAssociation = function _compileAssociation (name, associations, defaults, overrides) {
		
		if (!defaults) defaults = {};
		
		var i, modelName, assoc, foreignKey;
		
		for (i in associations) {
			
			assoc = associations[i];
			
			if (assoc.modelName) modelName = assoc.modelName
			else modelName = i;
			
			// Define the foreignkey
			if (assoc.foreignKey) {
				foreignKey = assoc.foreignKey;
			} else {
				if (defaults.foreignKey) {
					foreignKey = defaults.foreignKey;
				} else {
					foreignKey = modelName.foreign_key();
				}
			}
			
			this.associations[modelName] = {type: name, foreignKey: foreignKey, modelName: modelName, alias: i, fnc: 'find', options: assoc};
			if (overrides) alchemy.inject(this.associations[modelName], overrides);
		}
		
	}
	
	/**
	 * Do something to the database once we're connected
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {function}   one   The function to execute, or eval object
	 * @param    {function}   two   If eval, this is its callback
	 *
	 * @returns  {boolean}    True if the function is executed immediately
	 */
	this._whenConnected = function _whenConnected (one, two) {
		
		var callback, thisModel;
		
		if (typeof one == 'function') {
			callback = one;
		} else {
			thisModel = this;
			
			// eval's nolock is true by default
			if (typeof one.nolock == 'undefined') one.nolock = true;
			
			callback = function executeWhenConnected () {
				thisModel.connection.db.executeDbCommand(one, two);
			}
		}

		if (this.connected) {
			callback();
			return true;
		}
		
		this.connection.once('open', function on_ifConnected () {
			callback();
		});
		
		return false;
	}
	
	/**
	 * Create a new Mongoose schema, with certain fields auto created
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {object}   blueprint   The schema blueprint
	 * 
	 * @returns  {object}   A mongoose schema
	 */
	this._createSchema = function _createSchema (blueprint) {
		
		var thisModel = this;
		
		// Add the created & updated field
		blueprint.created = {type: 'Date', default: Date.now, fieldType: 'Date'};
		blueprint.updated = {type: 'Date', default: Date.now, fieldType: 'Date'};
		
		// Add the _id field if it doesn't exist
		if (typeof blueprint._id == 'undefined') blueprint._id = {type: 'ObjectId'};
		
		// Create a blueprint clone, one we can edit and put function references in
		var blueprintClone = alchemy.clone(blueprint);
		
		// Create an object to store the temporary schemas in
		var tempSchemas = {};
		
		// See if any of the entries are arrays
		for (var fieldname in blueprintClone) {
			var e = blueprintClone[fieldname];
			
			// If the type is a string, fetch it from the mongoose types
			if (typeof e == 'string') {
				
				e = {type: e};
				
				// Also update it in the text-only blueprint
				blueprint[fieldname] = {type: e};
			} else {
				
				// Is this field part of a database index?
				if (e.index) {
					
					// If index is just a boolean, create an object
					if (e.index === true) e.index = {unique: false};
					else if (typeof e.index == 'string') {
						if (e.index.toLowerCase() == 'unique') e.index = {unique: true};
						else e.index = {unique: true};
					}
					
					// Disable the sparse option by default
					if (typeof e.index.sparse == 'undefined') e.index.sparse = false;
					
					// Create an index name if none is given
					if (typeof e.index.name == 'undefined') {
						e.index.name = fieldname;
						if (e.index.unique) e.index.name += '_uq';
					}
					
					// Store these settings in the _index object by field name
					this._indexFields[fieldname] = e.index;
					
					// And now store it under the index name itself
					if (typeof this._indexes[e.index.name] == 'undefined') {
						this._indexes[e.index.name] = {
							fields: {},
							options: {
								name: e.index.name,
								unique: false,
							}
						};
					}
					
					if (e.index.unique) this._indexes[e.index.name].options.unique = true;
					if (e.index.sparse) this._indexes[e.index.name].options.sparse = true;
					
					var order = 1;
					if (e.index.order == 'desc') order = -1;
					
					// Finally: add this field to this index
					this._indexes[e.index.name].fields[fieldname] = order;
				}
				
				if (e.array) {
					
					// If it's an empty object,
					// just create an array of mixed, not subdocuments
					if (alchemy.isEmpty(e.type)) {
						blueprintClone[fieldname] = [{}];
					} else {
						var ns = {};
						ns[fieldname] = {};
						
						// Now go over every entry in this field
						for (var option in e) {
							
							// Add those options to a temporary blueprint,
							// but only if it's not the array option
							if (option !== 'array'){
								ns[fieldname][option] = e[option];
							}
						}
						
						// Create the temporary array out of the temporary blueprint
						tempSchemas[fieldname] = mongoose.Schema(ns);
						
						// Overwrite the entry
						e.type = [tempSchemas[fieldname]];
					}
				}
			}
			
			// If the type is a string, put in the appropriate function
			if (typeof e.type == 'string') {
				
				switch (e.type.toLowerCase()) {
					
					case 'string':
						e.type = String;
						break;
				
					case 'number':
						e.type = Number;
						break;
					
					case 'date':
						e.type = Date;
						break;
					
					default:
						e.type = mongoose.Schema.Types[e.type];
						break;
				}
				
			}
			
			// Store this information back into the blueprint clone
			blueprintClone[fieldname] = e;
			
			// Make a copy of this blueprintClone
			this._blueprintClone = blueprintClone;
		}
		
		var schema = mongoose.Schema(blueprintClone);
		
		// Do some things before saving this record
		schema.pre('save', function(next){
			
			// Set the "updated" field to this timestamp before saving
			this.updated = Date.now();
			
			next();
		});
		
		return schema;
	}
	
	/**
	 * Create a new Mongoose model
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {string}   name        The model name
	 * @param    {object}   schema      The schema blueprint
	 * 
	 * @returns  {object}   A mongoose model
	 */
	this._createModel = function _createModel (name, schema, cache) {
		
		if (cache === undefined) cache = false;
		
		var myObject = {};
		myObject.model = {};
		
		var thisModel = this;
		
		// If cache is true, tell the schema to regenerate the cache upon save
		if (cache) {
			
			schema.post('save', function (doc) {
				// Recreate the entire recordset
				// This is overkill, maybe we can just use the doc given?
				thisModel._cacheRecordset(myObject.model);
			})
		}
		
		// Create the model
		mongoose.model(name, schema);
		
		myObject.model = this.connection.model(name);
		
		// Cache the recordset a first time if wanted
		if (cache) this._cacheRecordset(myObject.model);
		
		// Create indexes when connected, these should NOT run in the background
		// on startup (this will block the db, not node)
		this.ensureIndex({background: false});
		
		return myObject.model;
	}
	
	/**
	 * Create index on specified fields.
	 * If the index already exists, and the dropIndex option was not given,
	 * then nothing happens for that index.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {object|boolean}  options       Several options, or 'true' to set options.dropIndex
	 *                             - dropIndex   Drop the index? (Needed for changes)
	 *                             - background  Run this in (mongo's) background?
	 *                             - silent      Make mongo ignore index errors
	 */
	this.ensureIndex = function ensureIndex (options) {
		
		var thisModel = this;
		
		var dropIndex = false;
		if (options === true) dropIndex = true;
		
		if (typeof options != 'object') options = {};
		if (typeof options.dropIndex == 'undefined') options.dropIndex = dropIndex;
		if (typeof options.background == 'undefined') options.background = true;
		if (typeof options.silent == 'undefined') options.silent = false;
		
		// If this model does not have indexes, do nothing
		if (alchemy.isEmpty(thisModel._indexes)) return;
		
		var indexClone = alchemy.inject({}, thisModel._indexes);
		
		for (var i in indexClone) {
			
			// Should this index command run in the background?
			if (typeof options.background != 'undefined') {
				indexClone[i].options.background = options.background;
			}
			
			// Drop duplicates?
			if (typeof options.dropDups != 'undefined') {
				indexClone[i].options.dropDups = options.dropDups;
			}
		}
		
		var fncString = 'function (indexes, tableName){';
		fncString += 'for(var indexName in indexes){'
		
		if (dropIndex) fncString += 'db[tableName].dropIndex("' + indexName + '");';
		
		fncString += 'db[tableName].ensureIndex(indexes[indexName].fields, indexes[indexName].options);';
		
		// If an error occured during the index creation, throw it!
		if (!options.silent) {
			fncString += 'var err = db.getLastError();';
			fncString += 'if (err && err.indexOf(indexName) > -1) throw new Error(err);';
		}
		
		fncString += '}';
		fncString += '}';
		
		this._whenConnected({
			eval: fncString,
			args: [indexClone, thisModel.modelName.tableize()]
		}, function (nullObj, returnObject) {
			
			var o = returnObject.documents[0];
			if (o.ok == 0) {
				log.error('Failed to ensure index: ' + o.errmsg.replace('invoke failed: JS Error: ', ''));
			} else {
				var msg = 'Created indexes on ' + thisModel.modelName.underline + ' model';
				if (options.silent) msg += ' - ' + 'Warning: '.bold.yellow + 'the silent option was enabled!';
				log.verbose(msg);
			}
			
		});
	}
	
	/**
	 * Query the database
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @returns  {boolean}   If the request has been made succesfully or not
	 */
	this.find = function find (type, options, callback) {
		
		if (!this.useTable) {
			log.warn('Model ' + this.modelName + ' does not use a table, find ignored!');
			return false;
		}
		
		if (typeof callback == 'undefined') {
			if (typeof options == 'function') {
				callback = options;
				options = false;
			} else {
				log.warn('Tried to do a find without a callback. Find aborted');
				return false;
			}
		}
		
		var thisModel = this;
		
		// Move the options to another variable
		var overrideOptions = options;
		
		// Create a copy of the default options
		options = alchemy.inject({}, this.findOptions);
		
		if (typeof overrideOptions == 'object') alchemy.inject(options, overrideOptions);
		if (typeof type != 'string') type = 'first';
		
		// Fire the find type method's with the before status
		this['_find' + type.camelize()](function before_findTypeNext (modified_options) {
			
			if (typeof modified_options == 'object') options = modified_options;

			// Fire the beforeFind callback
			thisModel.beforeFind(function beforeFindNext (status) {
				
				if (status === false) {
					callback(null, null);
					return;
				} else if (typeof status == 'object') options = status;

				// Create a query object
				var query = thisModel._createQuery(options);

				thisModel._whenConnected({
					eval: 'function (options){return transmuteQuery(options);}',
					args: [query]
				}, function (err, items) {

					// Mongo hides the result somewhere deep...
					items = items['documents'][0]['retval'];
					
					var payload = {};
					payload.type = type;
					payload.options = options;
					payload.query = query;
					
					// Do the afterFind
					thisModel._fireAfterFind.call(thisModel, payload, err, items, callback);
				});

			}, options); // Model beforeFind callback
		
		}, 'before', options, null); // _findMethod - before
		
		return true;
	}
	
	/**
	 * After the items have been found in the database,
	 * fire the model's AfterFind callback
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {object}    err
	 * @param    {object}    items
	 *
	 */
	this._fireAfterFind = function _fireAfterFind (payload, err, tableItems, findCallback) {
		
		var items = [], foundModels = {}, tasks = [],
		    item, nr, tableName, modelName, cur,
				thisModel = this, m;
		
		for (nr in tableItems) {
			cur = {};
			for (tableName in tableItems[nr]) {
				
				// Turn the table name back into a model name
				modelName = tableName.modelName();
				
				// Indicate this modelname is used
				if (modelName != this.modelName) foundModels[modelName] = modelName;
				
				// Copy the result items into the new object
				cur[modelName] = tableItems[nr][tableName];
			}
			
			// Add the finished record to the new items array
			items.push(cur);
		}

		// Add the primary afterFind
		tasks.push(function primaryAfterFind (primaryCallback) {
			thisModel.afterFind(function (override) {
				if (typeof override == 'undefined') override = items;
				primaryCallback(null, override);
			}, err, items, true);
		});
		
		// Now add the other model afterfinds!
		for (modelName in foundModels) {
			
			m = _get(modelName);
			
			(function(m) {
				tasks.push(function nonPrimaryAfterFind (moreItems, nonPrimaryCallback) {
					m.afterFind(function (override) {
						if (typeof override == 'undefined') override = moreItems;
						nonPrimaryCallback(null, override);
					}, err, items, false);
				});
			})(m);
		}
		
		// Execute the AfterFind functions of the other models in a waterfall manner
		// and execute the _afterFindNext afterwards
		async.waterfall(tasks, function afterFindsFinished (err, items) {
			thisModel._afterFindNext(payload, err, items, findCallback);
		});
		
	}
	
	/**
	 * The function to execute after the after find
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {object}    payload    Collection of options
	 *                       - options  The blueprint for the query
	 *                       - query    The compiled options
	 *                       - type     The find type
	 * @param    {object}    err
	 * @param    {object}    items
	 *
	 */
	this._afterFindNext = function _afterFindNext (payload, overrideErr, overrideResults, callback) {
			
		var results, resultErr;
		
		if (typeof overrideResults == 'undefined' && typeof overrideErr != 'undefined') {
			overrideResults = overrideErr;
			overrideErr = undefined;
		}
		
		if (typeof overrideResults == 'object' || typeof overrideResults == 'array') {
			results = overrideResults;
		} else {
			results = items;
		}
		
		if (typeof overrideErr != 'undefined') resultErr = overrideErr;
		else resultErr = err;
		
		// We only fire the after_findtype now, so every afterfind callback always
		// gets an array, even if it's only 1 object
		this['_find' + payload.type.camelize()](function after_findTypeNext (modified_items) {
			// Finally pass the results to the callback
			callback(resultErr, modified_items);
		}, 'after', payload.options, results);
		
	}
	
	/**
	 * Create a query based on query options
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {object}    options
	 *
	 * @returns  {function}  The query object to execute
	 */
	this._createQuery = function _createQuery (options) {
		
		// Compile the conditions, wrap everything in an $and (which is implied anyway)
		var compiled = this._compileConditions(options.conditions);
		
		options._conditions = compiled;
		options._currentModel = this.modelName.underscore().pluralize();
		
		//// Create a query object
		//var query = this._model[options._mongoFnc](options._conditions);
		//
		//if (options.fields && (typeof options.fields == 'string' || (typeof options.fields == 'array' && options.fields.length))) {
		//	query.select(options.fields);
		//}
		//
		//if (options.lean) query.options.lean = true;
		//
		
		return options;
	}
	
	/**
	 * Add items to an array or object.
	 * Push if it's an array, set key if it's an object.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {object|array}   arrObj    The array or object to add value to
	 * @param    {string|number}  index     The key
	 * @param    {mixed}          value     The value
	 *
	 * @returns  {object|array}
	 */
	var pushOrSet = function pushOrSet (arrObj, index, value) {
		if (arrObj instanceof Array) {
			arrObj.push(value);
		} else {
			arrObj[index] = value;
		}
		return arrObj;
	}
	
	/**
	 * Normalize the user defined query,
	 * so our stored procedure on the MongoDB server can execute it
	 *
	 * @param    {object}   query       The query to compile
	 * @param    {object}   options     Some options
	 * @param    {string}   findScope   The scope of this level ($and or $or)
	 * @param    {integer}  level       How deep we are
	 *
	 * @returns  {array}    First entry = info, others are conditions
	 */
	this._compileConditions = function _compileConditions (query, options, findScope, level) {
		
		if (typeof options == 'undefined') options = {};
		if (typeof findScope == 'undefined') findScope = '$and';
		if (typeof level == 'undefined') level = 0;
		
		var wrap = this._compileLevel(query, options, findScope, level);
		
		if (!wrap.mainConditions) {
			wrap.mainConditions = {model: this.modelName.underscore().pluralize(), conditions: [{field: null, value: null}]};
		}
		
		wrap.conditions.unshift(wrap.mainConditions);
		
		return wrap;
	}
	
	/**
	 * Normalize the user defined query, one level at a time
	 *
	 * @param    {object}   query       The query to compile
	 * @param    {object}   options     Some options
	 * @param    {string}   findScope   The scope of this level ($and or $or)
	 * @param    {integer}  level       How deep we are
	 *
	 * @returns  {array}    First entry = info, others are conditions
	 */
	this._compileLevel = function _compileLevel (query, options, findScope, level) {
		
		var info = {models: [], submodels: [], joins: {}, findScope: findScope, level: level, subqueries: []};
		var conditions = [];
		var wrap = {info: info, conditions: conditions, mainConditions: false};
		var _w = {};
		
		var counter = {};
		var subcounter = {};
		
		// Go over every entry in this query
		for (var field in query) {
			
			var value = query[field];
			var fieldsModel;
			var fieldName;
			var newVal = {};
			
			if (field == '$or' || field == '$and') {
				fieldsModel = false;
			} else {
				var f = field.deplugin();
				fieldName = f.field;
				f.model = f.model ? f.model : this.modelName;
				fieldsModel = f.model;
				fieldsModel = fieldsModel.underscore().pluralize();
			}
			
			if (fieldsModel) counter[fieldsModel] = true;
			
			if ((field == '$or' || field == '$and')
					&& (!(value instanceof RegExp) && (value instanceof Array || value instanceof Object))) {

				newVal = this._compileLevel(value, options, findScope, level+1);
				
				for (var i in newVal[0].models) subcounter[newVal[0].models[i]] = true;
				
				info.subqueries.push(newVal);
				
			} else {
				
				if (typeof _w[fieldsModel] == 'undefined') {
					_w[fieldsModel] = {model: fieldsModel, conditions: []};
					
					// If this is a condition for the main model, add it to a separate array
					if (f.model == this.modelName) {
						wrap.mainConditions = _w[fieldsModel];
					} else {
						conditions.push(_w[fieldsModel]);
					}
				}
				
				// Turn ObjectId strings into actual ObjectId objects
				if (this.blueprint[fieldName].type == mongoose.Schema.Types.ObjectId ||
				    this.blueprint[fieldName].type.toLowerCase() == 'objectid') {
						value = mongoose.mongo.BSONPure.ObjectID.fromString(value);
				}
				
				_w[fieldsModel]['conditions'].push({field: fieldName, value: value});
			}
			
		}
		
		var i, m;
		
		for (i in counter) info.models.push(i);
		for (i in subcounter) info.submodels.push(i);
		
		for (i in info.models) {
			m = info.models[i];
			
			var mName = m.classify();
			
			if (mName != this.modelName) {
				if (this.associations[mName]) {
					//info.joins[mName.underscore().pluralize()] = this.associations[mName];
				} else {
					log.error('Tried to query a non-associated model: ' + mName, {level: 8});
				}
			}
		}
		
		// Add association information
		for (var mName in this.associations) {
			info.joins[mName.underscore().pluralize()] = this.associations[mName];
		}

		// If wrap isn't a valid query, look for everything
		if (!wrap) wrap = {};
		
		return wrap;
	}

	/**
	 * The 'one' or 'first' find method
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {function}      next     The next callback function
	 * @param    {string}        status   Is this `before` or `after` the find?
	 * @param    {object}        query    The user defined query
	 * @param    {object}        result   The results (if status is `after`)
	 */
	this._findOne = this._findFirst = function _findOne (next, status, query, result) {
		
		// Make sure we use Mongo's 'findOne' function
		if (status == 'before') {
			
			query._mongoFnc = 'findOne';
			
			// Forward the query
			next(query);
		} else {
			
			// findOne should return an object, not an array of one item
			if (result instanceof Array) result = result[0];
			
			// Forward the result
			next(result);
		}
	}
	
	/**
	 * The 'many' or 'all' find method
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {function}      next     The next callback function
	 * @param    {string}        status   Is this `before` or `after` the find?
	 * @param    {object}        query    The user defined query
	 * @param    {array}         results  The results (if status is `after`)
	 */
	this._findMany = this._findAll= function _findMany (next, status, query, results) {
		
		// Make sure we use Mongo's 'find' function
		if (status == 'before') {
			query._mongoFnc = 'find';
			next(query);
		} else if (status == 'after') {
			next(results);
		}
	}
	
	/**
	 * Function that runs before every find operation
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {function}   next     The callback method, pass false to stop
	 * @param    {object}     options  The query options after merge with default
	 */
	this.beforeFind = function beforeFind (next, options) {
		next();
	}
	
	/**
	 * Function that runs to get linked records
	 * Runs after the _find{Type} function (with `after` as status)
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {function}     next     The callback method, pass false to stop
	 * @param    {object}       options  The query options after merge with default
	 * @param    {array|object} results  The results object or array
	 */
	this._crossModels = function _crossModels (next, err, results, options) {
		
		var goingToJoin = false;
		
		for (var aliasName in this.hasMany) {
			
			goingToJoin = true;
			
			var join = this.hasMany[aliasName];
			
			var joinModel = _get(join.modelName);
			
			var joinQuery = {};
			joinQuery[join.foreignKey] = results._id;
			
			joinModel.find(joinQuery, function joinResult (err, items) {
				
				results[aliasName] = items;
				
				next(err, results);
			});
			
			
		}
		
		// If no joins are going to be made, continue
		if (!goingToJoin) next(err, results);
	}
	
	/**
	 * Function that runs after every find operation,
	 * with the result items passed
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {function}   next     The callback method, pass false to stop
	 */
	this.afterFind = function afterFind (next, err, results, primary) {
		next();
	}
	
	/**
	 * Save (mixed) data to the database
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {object|array}   data      The data to save
	 * @param    {object}         options
	 * @param    {Function}       callback
	 *
	 */
	this.save = function save (data, options, callback) {
		
		var thisModel = this, // A scope-save link to this context
		    tasks = [],       // All save functions to be executed by async
				recordNr,         // A tally for entries in data
				record,           // An entry in data
				_callback;        // Temporary storage for the callback
		
		// Normalize arguments
		if (typeof options == 'function') {
			_callback = options;
			
			if (typeof callback == 'object') options = callback;
			else options = {};
			
			callback = _callback;
		}
		
		// If the given data is not an array, turn it into one
		if (!(data instanceof Array)) data = [data];
		
		// the fieldList option is true by default
		if (typeof options.fieldList == 'undefined') options.fieldList = true;
		
		// Go over every recordset we should save
		for (recordNr in data) this._prepareRecordsetSave(tasks, data[recordNr], options);
		
		// Save the primary data. When that is done, save the associated data
		async.parallel(tasks, function(tasks_err, results) {
			this._saveAssociatedData.call(this, tasks_err, results, callback);
		}.bind(this));
		
	}
	
	/**
	 * Prepare to save a recordset, part of the 'save()' function
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Array}   tasks       Array to store the functions in
	 * @param    {Object}  recordset   One group of data that needs to be saved
	 *                                 This is the main model + associations
	 * @param    {Object}  options     
	 *
	 * @returns  {Array}   The modified tasks is returned
	 */
	this._prepareRecordsetSave = function _prepareRecordsetSave (tasks, recordset, options) {
		
		var thisModel = this,
		    temp,      // Temporary storage
		    saveFnc;   // The function to be added to the tasks
		
		// If there is no property with the name of the model, we assume
		// there is only 1 record to save for this model only
		if (typeof recordset[this.modelName] == 'undefined') {
			temp = recordset;
			recordset = {};
			recordset[this.modelName] = temp;
		}
		
		// Make sure tasks is an array
		if (!(tasks instanceof Array)) tasks = [];
		
		saveFnc = function saveFunction (next_task) {
			
			// Save the record for this model only ...
			thisModel.saveOne(recordset[thisModel.modelName], options, function saveFunctionCallback(err, item) {
				
				// Now remove the saved item from the recordset
				delete recordset[thisModel.modelName];
				
				// Pass the result, and the associated items to save, to the callback
				next_task(null, {err: err, item: item, associated: recordset});
			});
		}
		
		// Add the function to the tasks collection array
		tasks.push(saveFnc);
		
		return tasks;
	}
	
	/**
	 * What to do after a preliminary save:
	 * The data for the own model is done, now the associated ones
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}    tasks_err     Has async encountered an error?
	 * @param    {Array}     results       The results array
	 *                       - err         Individual result error
	 *                       - item        The primary saved data (this model)
	 *                       - associated  The associated data we need to save
	 * @param    {Function}  callback
	 */
	this._saveAssociatedData = function _saveAssociatedData (tasks_err, results, callback) {
		
		log.verbose('Going to save associated data for model ' + this.modelName.underline);
		
		var err = null, par = {}, record, records, assoc;
			
		// Now it's time to save the associated data!
		for (var i in results) {
			
			// If any of the results has an error, flag err as true
			if (results[i].err) err = true;
			
			var parent = results[i]['item'];
			
			for (var modelName in results[i].associated) {
				
				assoc = this.associations[modelName];
				records = results[i].associated[modelName];
				
				// If records isn't an array (but only 1 object) turn it into one
				if (!(records instanceof Array)) records = [records];
				
				// Add the correct foreign key to every record
				for (var recordnr in records) {
					
					record = records[recordnr];
					
					if (assoc.type == 'hasOneChild') {
						record[assoc.foreignKey] = parent._id;
					} else if (assoc.type == 'hasMany') {
						// @todo: when this is missing, hasmany items get saved without foreignkey!
						record[assoc.foreignKey] = parent._id;
					}
				}
				
				var _model = _get(modelName);
				
				// Create a new closure
				var extraQ = (function (_model, records) {
					
					return function extraQSaveFunction (qcb) {
						
						_model.save(records, function extraQCallback (err, results) {
							
							var returnObject = false;
							
							if (results.length > 0) {
								
								returnObject = [];
								
								for (var i in results) {
									returnObject.push(results[i].item);
								}
							}
							
							qcb(err, returnObject);
						});
						
					}
				})(_model, records);
				
				par[modelName] = extraQ;
			}
		}
		
		var mainResult = {};
		mainResult[this.modelName] = {};
		
		if (results[0] && results[0].item) {
			mainResult[this.modelName] = results[0].item;
		}
		
		// If there are no other functions to execute, call the callback
		if (alchemy.isEmpty(par)) {
			if (callback) {callback(err, results);}
		}	else {
			
			async.parallel(par, function (err, extra_results) {
				alchemy.inject(mainResult, extra_results);
				if (callback) callback(err, mainResult);
			});
			
		}
	}
	
	/**
	 * Save one record for this model
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {object|array}  data          The data to save
	 * @param    {object}        options
	 *           {boolean}       - callbacks   Enable callbacks (true)
	 *           {boolean}       - audit       Honour & update unique index (true)
	 *           {boolean|array} - fieldList   Only allow fields from scheme (true)
	 *                                         or fields defined in array
	 *
	 * @returns  {void}
	 */
	this.saveOne = function saveOne (data, options, callback) {
		
		var thisModel = this;
		
		// Normalize arguments
		if (typeof options == 'function') {
			var _callback = options;
			
			if (typeof callback == 'object') {
				options = callback;
			} else {
				options = {};
			}
			
			callback = _callback;
		}
		
		if (typeof options == 'undefined') {
			options = {};
		}
		
		// If an array still gets in here, take the first element
		if (data instanceof Array) data = data[0];
		
		// If it's still wrapper inside its own modelName, unwrap it
		if (typeof data[this.modelName] != 'undefined') data = data[this.modelName];
		
		// If callbacks is undefined, it's true
		if (typeof options.callbacks == 'undefined') options.callbacks = true;
		
		// If checking for unique is undefined, it's true
		// Warning: checking for _id is always done by mongo!
		if (typeof options.audit == 'undefined') options.audit = true;
		
		var strictFields = true;
		var fieldList = {};
		var fieldName;
		
		// Honour the fieldList settings
		if (typeof options.fieldList == 'boolean') {
			strictFields = options.fieldList;
		} else if (typeof options.fieldList == 'object') {
			
			// Turn the fieldList into an object
			if (options.fieldList instanceof Array) {
				for (var nr = 0; nr < options.fieldList.length; nr++) {
					fieldList[nr] = true;
				}
			} else {
				fieldList = options.fieldList;
			}
			
			for (fieldName in fieldList) {
				
				// If a field we have to save is not in the blueprint,
				// we turn of strict mode
				if (!(fieldName in this.blueprint)) {
					strictFields = false;
					break; // No need to continue any further
				}
			}
			
			// Now remove any item in data that is not in the fieldList
			for (var fieldSave in data) {
				if (!(fieldSave in fieldList)) delete data[fieldSave];
			}
		}
		
		var parAudit = {};
		
		// Make sure we only update records with unique fields
		if (typeof data._id == 'undefined' && options.audit) {
			
			var controlIndexes = {};
			
			// Get all the indexes we need to check/audit
			for (var fieldName in data) {
				if (typeof this._indexFields[fieldName] != 'undefined') {
					if (this._indexFields[fieldName].unique) {
						controlIndexes[this._indexFields[fieldName].name] = this._indexes[this._indexFields[fieldName].name];
					}
				}
			}
			
			// Prepare functions per index we need to audit
			for (var indexName in controlIndexes) {
				
				// Create a link to this index
				var index = controlIndexes[indexName];
				
				parAudit[indexName] = function auditIndex (async_callback) {
					
					var query = {};
					
					for (var fieldName in index.fields) {
						if (typeof data[fieldName] != 'undefined') {
							query[fieldName] = data[fieldName];
						}
					}
					
					thisModel._model.findOne(query, '_id', function (err, item) {
						async_callback(err, item);
					});
					
				}
				
			}
		}
		
		// Create a dummy function if parAudit is empty
		if (alchemy.isEmpty(parAudit)) {
			parAudit['none'] = function dummyAudit (async_callback) {
				async_callback(null, null);
			}
		}
		
		/**
		 * Actually save the mongoose document to the database
		 *
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    0.0.1
		 * @version  0.0.1
		 *
		 * @param    {object}    dataToSave      Optional data to be set in the document
		 * @param    {Document}  document        The Mongoose object we need to save
		 * @param    {Function}  extra_callback  The callback
		 *
		 * @returns  {void}
		 */
		var saveDocument = function saveDocument (dataToSave, document, extra_callback) {
			
			// Inject data into the document if needed
			if (dataToSave) alchemy.inject(document, dataToSave);

			// Save the document and execute the callback when done
			document.save(function saveRecordToMongo (err, item) {
				if (extra_callback) extra_callback(err, item);
			});
		};
		
		/**
		 * Prepare the document we need to save to the database.
		 * This can be done by looking for it in the database,
		 * or by creating a new one
		 *
		 * @author   Jelle De Loecker   <jelle@kipdola.be>
		 * @since    0.0.1
		 * @version  0.0.1
		 *
		 * @param    {object}    dataToSave      Optional data to be set in the document later
		 * @param    {Document}  documentToSave  The Mongoose object we need to save (if already found)
		 * @param    {Function}  extra_callback  The callback
		 *
		 * @returns  {void}
		 */
		var saveRecord = function saveRecord (dataToSave, documentToSave, extra_callback) {
			
			// If there's an _id defined, we need to find the existing document
			if (dataToSave._id) {
				
				// If the existing document isn't provided yet, we need to find it first
				if (!documentToSave) {
					
					thisModel._model.findOne({_id: dataToSave._id}, '_id', function (err, item) {
						documentToSave(dataToSave, item, extra_callback);
					});
				} else {
					// We already have a document we can save
					saveDocument(dataToSave, documentToSave, extra_callback);
				}
				
			} else {
				// There was no _id, so create a new one
				documentToSave = new thisModel._model(dataToSave, strictFields);
				saveDocument(dataToSave, documentToSave, extra_callback);
			}
			
		};
		
		async.parallel(parAudit, function (err, foundAuditItems) {
			
			var saveDocument = false;
			
			for (var i in foundAuditItems) {
				if (foundAuditItems[i] == null) delete foundAuditItems[i];
			}
			
			// If we found items during the unique audit ...
			if (!alchemy.isEmpty(foundAuditItems)) {
				
				var countResult = 0;
				var idCache = {};
				
				for (var indexName in foundAuditItems) {
					
					var record = foundAuditItems[indexName];
					
					// If this is the first time we see this id ...
					if (typeof idCache[record._id] == 'undefined') {
						countResult++;
						idCache[record._id] = true;
					}
				}
				
				// If there are more than 1 audit results, we have a problem.
				// Because which item will we update? We don't know!
				if (countResult > 1) {
					if (callback) callback('Multiple unique records found!', null);
					return false;
				}
				
				// If we continue, the record id we need to update will still be in here
				data['_id'] = record._id;
				saveDocument = record;
			}
		
			// If callbacks are enabled, call beforeSave
			if (options.callbacks) {
			
				thisModel.beforeSave(function afterBeforeSave (record, over_options) {
					
					if (typeof record != 'undefined') data = record;
					if (typeof over_options != 'undefined') options = over_options;
					
					// If record is false, call the callback with error
					if (record === false) {
						callback({error: 'beforeSave denied'}, null);
					} else {
						saveRecord(data, saveDocument, function beforeAfterSave (err, item) {
							thisModel.afterSave(function afterAfterSave () {
								
								// Finally call the user provided callback
								if (callback) callback(err, item);
								
							}, item, err);
						});
					}
					
				}, data, options);
				
			} else {
				saveRecord(data, saveDocument, callback);
			}
			
			return true;
		});
		
	}
	
	/**
	 * Called before the model saves a record,
	 * but after it has applied the strictFields
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {function}  next    The callback to call when we're done
	 * @param    {object}    record  The data that will be saved
	 * @param    {object}    options
	 *
	 * @return void
	 */
	this.beforeSave = function beforeSave (next, record, options) {
		next();
	}
	
	/**
	 * Called after the model saves a record.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {function}  next    The callback to call when we're done
	 * @param    {object}    record  The data that has been saved
	 * @param    {object}    errors
	 *
	 * @return void
	 */
	this.afterSave = function afterSave (next, record, errors) {
		next();
	}
	
});

/**
 * Return a model instance
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   modelName       The singular name of the model
 */
var _get = function get (modelName, autoCreate) {

	if (typeof modelName == 'undefined') {
		log.error('Tried to get model by providing undefined name!')
		return false;
	}

	// Make sure the modelName is singular
	modelName = modelName.singularize();
	
	var returnModel;
	
	// Get the modelname without the "Model" postfix
	// @todo: this messes up Admin models if enabled
	//modelName = modelName.modelName(false);
	
	// Get the modelName WITH the "Model" postfix
	var fullName = modelName.modelName(true);

	// If there is no set class for this model, create one
	if (typeof alchemy.classes[fullName] === 'undefined') {
		
		if (typeof autoCreate == 'undefined') autoCreate = true;
		
		if (autoCreate) {
			log.verbose('Model "' + modelName + '" is undefined, creating new AppModel instance');
			returnModel = new alchemy.classes.AppModel({name: modelName});
		} else {
			return false;
		}
		
	} else {
		
		if (typeof alchemy.instances.models[modelName] === 'undefined') {
			alchemy.instances.models[modelName] = new alchemy.classes[fullName]();
		}

		returnModel = alchemy.instances.models[modelName];
	}
	
	return returnModel;
}

Model.get = _get;

// Store the original extend method
Model._extend = Model.extend;

/**
 * Extend the base model
 * Uses the app model by default, unless it doesn't exist
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}    name     The name of the class to extend from
 * @param   {Object}    options  Extra options
 *                      .base    Extend from Model, not AppModel
 *                               False by default
 * @param   {Function}  fnc      The extension
 *
 * @returns {Function}
 */
Model.extend = function extend (name, options, fnc) {
	
	if (typeof name != 'string') {
		fnc = options;
		options = name;
	}
	
	if (typeof fnc == 'undefined') {
		fnc = options;
		options = {};
	}
	
	if (typeof options.base == 'undefined') options.base = false;

	if (options.base || typeof alchemy.classes.AppModel == 'undefined') {
		return alchemy.classes.Model._extend(name, options, fnc);
	} else {
		return alchemy.classes.AppModel.extend(name, options, fnc);
	}

}
