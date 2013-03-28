var validate = require('mongoose-validator').validate;
var mongoose = require('mongoose');

/**
 * The Model class
 *
 * @constructor
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
	 * hasOne associations
	 * 
	 * @type {Object}
	 */
	this.hasOne = {};
	
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
		wrap: true,      // Wrap the results into an object with the model name
		lean: true,      // Return simple javascript objects, not mongoose docs
		_mongoFnc: 'find'
	};
	
	this.blueprint = {};
	this.admin = {};
	this.schema = {};
	this.cache = {};
	this.index = {};
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
			if (typeof options.table != 'undefined') this.useTable = options.useTable;
			if (typeof options.ds != 'undefined') this.useDbConfig = options.ds;
			if (typeof options.name != 'undefined') this.modelName = options.name;
			if (typeof options.alias != 'undefined') this.alias = options.alias;
		}
		
		var i;
		
		for (i in this.hasMany) {
			
			var modelName;
			var assoc = this.hasMany[i];
			
			if (assoc.modelName) modelName = assoc.modelName
			else modelName = i;
			
			this.associations[modelName] = {type: 'hasMany', foreignKey: assoc.foreignKey, alias: i};
			
		}
		
		// If the modelName still isn't set, get it from the class name
		if (!this.modelName) this.modelName = this.name.replace('Model', '');
		
		if (this.useTable === null) {
			this.useTable = this.modelName.tableize();
		}
		
		if (this.useTable) {
			
			// Set the connection
			this.connection = alchemy._db_connections[this.useDbConfig];
			
			// Create the schema based on our blueprint
			this._schema = this._createSchema(this.blueprint);
			
			// Create the model based on that schema
			this._model = this._createModel(this.modelName, this._schema, this.enableCache);
		}
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
		blueprint.created = {type: Date, default: Date.now, fieldType: 'Date'};
		blueprint.updated = {type: Date, default: Date.now, fieldType: 'Date'};
		
		// Create a blueprint clone, one we can edit
		var blueprintClone = alchemy.inject({}, blueprint);
		
		// Create an object to store the temporary schemas in
		var tempSchemas = {};
		
		// See if any of the entries are arrays
		for (var fieldname in blueprintClone) {
			var e = blueprintClone[fieldname];
			
			// If the type is a string, fetch it from the mongoose types
			if (typeof e == 'string') {
				e = {type: e};
			} else {
				
				// Store json fields under the special object
				if (e.fieldType == 'json') {
					this.special['json'][fieldname] = fieldname;
				}
				
				// If it's unique, store it under this identifier aswell
				if (e.unique == true) {
					this.index[fieldname] = {cache: {}};
				}
				
				// Also store under other indexes
				if (e.index == true) {
					this.many[fieldname] = {cache: {}};
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
						tempSchemas[fieldname] = elric.mongoose.Schema(ns);
						
						// Overwrite the entry in the clone
						blueprintClone[fieldname] = [tempSchemas[fieldname]];
					}
				}
			}
			
			// If the type is a string, fetch it from the mongoose types
			if (typeof e.type == 'string') e.type = mongoose.Schema.Types[e.type];
		}
		
		var schema = mongoose.Schema(blueprintClone);
		
		// Do some things before saving this record
		schema.pre('save', function(next){
			
			// Set the "updated" field to this timestamp before saving
			this.updated = Date.now();
			
			// Convert json strings back to objects
			for (var fieldname in thisModel.special.json) {
				if (typeof this[fieldname] == 'string') {
					try {
						this[fieldname] = JSON.parse(this[fieldname]);
					} catch (err) {
						this[fieldname] = JSON.stringify(this[fieldname]);
					}
				}
			}
			
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
		
		return myObject.model;
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
				var util = require('util');
				
				//pr(util.inspect(query['_conditions'], false, null));
				
				alchemy._db_connections['default']['db'].executeDbCommand({
						eval: 'function (options){return transmuteQuery(options);}',
						args: [query],
						nolock: true
					}, function (err, items) {
						pr('Compiled query result:'.bold.red.underline);
						pr(err);
						pr(util.inspect(items['documents'], false, null));
					});
				
				return;
				// Actually go look for the items in MongoDB
				query.exec(function findQueryResult (err, items) {
					
					// Fire the find type method's with the after status
					thisModel['_find' + type.camelize()](function after_findTypeNext (modified_results) {
						
						// Overwrite the result items
						if (typeof modified_results == 'object' || typeof modified_results == 'array') items = modified_results;
						
						thisModel._crossModels(function afterCrossModels (err, items) {
					
							// Now fire the model's afterFind callback
							thisModel.afterFind(function afterFindNext (overrideErr, overrideResults) {
								
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
								
								// Finally pass the results to the callback
								callback(resultErr, results);
								
							}, err, items, 'unknown_if_primary'); // Model afterFind callback
							
						}, err, items, options);
						
					}, 'after', options, items); // _findMethod - after
					
				});
	
			}, options); // Model beforeFind callback
		
		}, 'before', options, null); // _findMethod - before
		
		return true;
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
		var wrap = [];
		var _w = {};
		
		var counter = {};
		var subcounter = {};
		
		// The first array entry is always information
		wrap.push(info);
		
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
				fieldsModel = f.model ? f.model : this.modelName;
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
					wrap.push(_w[fieldsModel]);
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
					info.joins[mName.underscore().pluralize()] = this.associations[mName];
				} else {
					log.error('Tried to query a non-associated model: ' + mName, {level: 8});
				}
			}
		}

		return wrap;
	}

	/**
	 * Compile user defined conditions into something mongo understands
	 * Returns an object with 'internal' (for mongo) and 'external'
	 * (To compile for other models)
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @returns  {object}
	 */
	this.__compileConditions = function _compileConditions (conditions, options, findScope) {

		if (typeof findScope == 'undefined') findScope = '$and';
		
		var entry, _conditions, external, fields, storeInternal, arrayType;
		
		if (typeof options == 'undefined') options = {};
		if (typeof options.extModels == 'undefined') options.extModels = {};
		if (typeof options.modelName == 'undefined') options.modelName = this.modelName;
		
		if (conditions instanceof Array) {
			arrayType = true;
			_conditions = [];
		}
		else {
			arrayType = false;
			_conditions = {};
		}
		
		external = false;
		
		// Convert the conditions object
		for (var i in conditions) {
			
			fields = i.deplugin();
			entry = conditions[i];

			// If we want another model field
			if (fields.model && fields.model != options.modelName) {
				options.extModels[fields.model] = true;
				storeInternal = false;
			} else {
				storeInternal = true;
			}

			if (typeof entry != 'string' && typeof entry != 'number' && !(entry instanceof RegExp) ) {
				
				var nextScope;
				
				if (entry == '$and') nextScope = '$and';
				else if (entry == '$or') nextScope = '$or';
				
				result = this._compileConditions(entry, options, nextScope);
				
				if (result.internal) {
				
					if (storeInternal) {
					
						pushOrSet(_conditions, fields.field, result.internal);
						
						if (result.external) {
							
							if (!external) {
								if (arrayType) external = [];
								else external = {};
							}
							
							pushOrSet(external, i, result.external);
						}
					} else {
						pushOrSet(external, i, result);
					}
				}
				
			} else {
				
				if (storeInternal) {
					pushOrSet(_conditions, fields.field, entry);
				} else {
					
					if (!external) {
						if (arrayType) external = [];
						else external = {};
					}
					pushOrSet(external, i, entry);
				}
				
			}
		}
		
		// Remove empty conditions
		log.verbose('Look for empty conditions in:');
		if (_conditions instanceof Array) {
			
			var keep = false;
			
			if (_conditions.length) {
				for (var i = 0; i < _conditions.length; i++) {
					// If this object contains anything, keep it!
					if (!alchemy.isEmpty(_conditions[i])) keep = true;
				}
				
			}
			
			if (!keep) _conditions = false;
			
		}
		
		
		return {internal: _conditions, external: external, options: options};
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
			
			// If wanted, put the result object in a wrapper
			if (query.wrap) {
				var wrapper = {};
				wrapper[this.modelName] = result;
				result = wrapper;
			}
			
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
		} else { // status == 'after'
			
			if (query.wrap) {
				var wrapArray = [];
				var wrapObj;
			}
			
			for (var i in results) {
				
				if (query.wrap) {
					wrapObj = {};
					wrapObj[this.modelName] = results[i];
					wrapArray.push(wrapObj);
				}
			}
			
			// If wrapping is enabled (default) set wrapper array as results
			if (query.wrap) results = wrapArray;
			
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
		
		pr('Going to join model ' + this.modelName + ' to linked models');
		
		var goingToJoin = false;
		
		for (var aliasName in this.hasMany) {
			
			goingToJoin = true;
			
			var join = this.hasMany[aliasName];
			
			var joinModel = _get(join.modelName);
			
			var joinQuery = {};
			joinQuery[join.foreignKey] = results._id;
			pr('goign to find joins');
			
			joinModel.find(joinQuery, function joinResult (err, items) {
				pr('joinModel find done');
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
var _get = function get (modelName) {

	var returnModel;
	var fullName = modelName.camelize() + 'Model';
	
	// If there is no set class for this model, create one
	if (typeof alchemy.classes[fullName] == 'undefined') {
		
		log.verbose('Model "' + modelName + '" is undefined, creating new AppModel instance');
		
		returnModel = new alchemy.classes.AppModel({name: modelName});
		
	} else {
		
		if (typeof alchemy.instances.models[modelName] == 'undefined') {
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
 * @param   {string}     name   The name of the class
 * @param   {function}   fnc    The extension
 *
 * @returns {function}
 */
Model.extend = function extend (name, fnc) {
	
	var returnModel;

	if (typeof alchemy.classes.AppModel == 'undefined') {
		returnModel = alchemy.classes.Model._extend(name, fnc);
	} else {
		returnModel = alchemy.classes.AppModel.extend(name, fnc);
	}
	
	return returnModel;
}
