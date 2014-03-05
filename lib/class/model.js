var expirable = alchemy.use('expirable'),
    validate  = require('mongoose-validator').validate,
    mongoose  = require('mongoose'),
    async     = require('async'),
    bson      = alchemy.use('bson').BSONPure.BSON;

alchemy._mongoose = mongoose;

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
	 * The model name.
	 *
	 * @type {String}
	 */
	this.modelName = null;

	/**
	 * The query cache duration, 60 minutes by default
	 *
	 * @type {String}
	 */
	this.cacheDuration = '60 minutes';

	/**
	 * Custom database table name, or null/false if no table association is desired.
	 *
	 * @type {String}
	 */
	this.useTable = null;

	/**
	 * The Model preInit
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @return   {undefined}
	 */
	this.preInit = function preInit() {

		/**
		 * The name of the DataSource connection that this Model uses
		 *
		 * The value must be an attribute name that you defined in `config/locale/database.js`
		 *
		 * @type {String}
		 */
		this.useDbConfig = 'default';

		/**
		 * Custom display field name.
		 *
		 * @type {String}
		 */
		this.displayField = 'title';
		
		/**
		 * Value of the primary key ID of the record that this model is currently pointing to.
		 * Automatically set after database insertions.
		 *
		 * @type {Mixed}
		 */
		this.id = false;
		
		/**
		 * Table name for this Model.
		 *
		 * @type {String}
		 */
		this.table = false;
		
		/**
		 * Alias name for model.
		 *
		 * @type {String}
		 */
		this.alias = null;

		/**
		 * The connection to use for this model.
		 * 
		 * @type {Object}
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
		 * @type {Object}
		 */
		this.associations = {};
		
		/**
		 * All aliases
		 *
		 * @type {Object}
		 */
		this.aliases = {};

		/**
		 * All alias associations
		 *
		 * @type {Object}
		 */
		this.aliasAssociations = {};

		/**
		 * All foreign keys
		 *
		 * @type {Object}
		 */
		this.foreignKeys = {};

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
			sort: false,
			order: 1,
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

		// Sort the creation date by default
		this.sort = {created: 1};

		// Data for the client
		this.safeBlueprint = {};
		
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

		// Behaviours for this controller
		this.behaviours = false;
		
		// Behaviour instances
		this._behaviours = {};
	};

	/**
	 * Do when extending
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.__extended__ = function __extended__(parentModel, childModel) {

		if (!childModel.prototype.hasOwnProperty('modelName')) {
			childModel.prototype.modelName = childModel.name.replace('Model', '');
		}

		// Do not inherit the useTable property from the parent model
		if (!childModel.prototype.hasOwnProperty('useTable')) {
			childModel.prototype.useTable = null;
		}

	};

	/**
	 * Constructor. Binds the model's database table to the object.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
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
	this.init = function init(options) {

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

		// We'll create a reference to this model's behaviours
		var thisBehaviours = this.behaviours;
		
		// Get our parent's components, so we can merge the current ones in it later
		var parentBehaviours = this.parent('behaviours');

		if (typeof parentBehaviours === 'object' && typeof thisBehaviours === 'object') {
			// If this model and its parent have behaviours, merge them
			this.behaviours = alchemy.inject(parentBehaviours, this.behaviours);
		} else if (typeof parentBehaviours === 'object') {
			// If only the parent has behaviours, overwrite them
			this.behaviours = alchemy.inject({}, parentBehaviours);
		}

		// Construct the components
		if (typeof this.behaviours === 'object') {

			if (typeof this._behaviours !== 'object') {
				this._behaviours = {};
			}

			for (var behaviourName in this.behaviours) {

				// Store every behaviour in here
				this._behaviours[behaviourName] = Behaviour.get(behaviourName, this, this.behaviours[behaviourName]);

				// If behaviours should be exposed easily, store them under the model
				if (this._behaviours[behaviourName].expose) {
					this[behaviourName.classify()] = this._behaviours[behaviourName];
				}
			}
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
			
			this.connection.on('error', function onModelConnectionOpen (message) {
				thisModel.connected = false;
				log.error('Connection error!');
				log.error(message);
			});
			
			// Create the schema based on our blueprint
			this._schema = this._createSchema(this.blueprint);
			
			// Create the model based on that schema
			try {
				this._model = this._createModel(this.modelName, this._schema, this.enableCache);
			} catch (err) {
				log.error(err.message, {err: err});
			}
		}

		this._compileAssociation('hasMany', this.hasMany);
		this._compileAssociation('hasOneChild', this.hasOneChild, {foreignKey: this.modelName.foreign_key()}, {fnc: 'findOne'});
		this._compileAssociation('hasOneParent', this.hasOneParent, null, {fnc: 'findOne'});
		this._compileAssociation('belongsTo', this.belongsTo, null, {fnc: 'findOne'});
		this._compileAssociation('hasAndBelongsToMany', this.hasAndBelongsToMany);
		
		// Add belongsTo fields to the blueprint
		for (var aliasName in this.aliasAssociations) {

			var assoc = this.aliasAssociations[aliasName];

			// Add it to the aliases
			this.aliases[assoc.alias] = assoc.modelName;
			
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
			} else if (assoc.type == 'hasAndBelongsToMany') {

				// See if it's the model where the data is NOT stored
				if (assoc.options.associationKey) {

				} else {
					// If it is, add to the blueprint
					this.blueprint[assoc.foreignKey] = {
						type: 'ObjectId',
						array: true
					};
				}
			}
		}

		// Create the cache
		if (this.cacheDuration) {
			this.cache = new expirable(this.cacheDuration);
		} else {
			this.cache = false;
		}
	};
	
	/**
	 * Callback after this instance has been augmented
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}   addition
	 *
	 */
	this.augmented = function augmented(addition) {

		var name,
		    behaviours = this._behaviours, // Get the behaviours from the original
		    skip = this.__augmentNoInherit;

		// Create a behaviours entry in the augment
		this._behaviours = {};

		// Do not inherit the _behaviours property
		skip._behaviours = true;

		// Augment the behaviours aswell
		for (name in behaviours) {
			this._behaviours[name] = alchemy.augment(behaviours[name], addition);

			if (this._behaviours[name].expose) {
				this[name.classify()] = this._behaviours[name];
			}
		}
	};
	
	/**
	 * Compile an association
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}     name            The name of the association type
	 * @param    {Object}     associations    The associations to compile
	 *
	 * @return   {undefined}  Does not return anything, directly stores in this.associations
	 */
	this._compileAssociation = function _compileAssociation(name, associations, defaults, overrides) {
		
		if (!defaults) defaults = {};
		
		var i, modelName, assoc, foreignKey, settings;
		
		for (i in associations) {
			
			assoc = associations[i];
			
			if (assoc.modelName) modelName = assoc.modelName
			else modelName = i;

			// If the association is to the same model, the alias should not be
			// the same modelname. It causes breakage.
			// @todo: should be changed in the blueprint, too
			if (i == this.modelName) {
				i = 'Self-' + this.modelName;
			}
			
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
			
			if (!this.associations[modelName]) {
				this.associations[modelName] = [];
			}

			settings = {type: name, foreignKey: foreignKey, modelName: modelName, alias: i, fnc: 'find', options: assoc};
			if (overrides) alchemy.inject(settings, overrides);

			// Store it in the associations under the model name
			this.associations[modelName].push(settings);

			// Store it in the foreignKeys object
			this.foreignKeys[foreignKey] = settings;

			// Store it under its alias
			this.aliasAssociations[i] = settings;
		}
	};

	/**
	 * Return a map of model aliasses and associations for this model,
	 * including this model itself
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.getAssociationsMap = function getAssociationsMap() {

		var alias,
		    map = {};

		// The model has no alias, but uses its own modelname
		map[this.modelName] = this.modelName;

		// Go over every association
		for (alias in this.aliasAssociations) {
			map[alias] = this.aliasAssociations[alias].modelName;
		}

		return map;
	};
	
	/**
	 * Do something to the database once we're connected
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}   one   The function to execute, or eval object
	 * @param    {Function}   two   If eval, this is its callback
	 *
	 * @return   {Boolean}    True if the function is executed immediately
	 */
	this._whenConnected = function _whenConnected(one, two) {
		
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
	};

	/**
	 * Return the type (as a string) of a field
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}   fieldName   The field to get the type of
	 * 
	 * @return   {String}   The type of the field
	 */
	this.fieldType = function fieldType(fieldName) {

		if (this.blueprint[fieldName] && this.blueprint[fieldName].type) {

			// Get the type of this field
			var type = this.blueprint[fieldName].type;

			// If the type is a function and not a string (which shouldn't be)
			// throw a warning, and use the function's name
			if (typeof type === 'function') {
				type = type.name;
				log.warn('The fieldtype for "' + fieldName + '" inside model "' + this.modelName + '" is a function instead of a string');
			}

			return type.toLowerCase();
		}

		return undefined;
	};

	/**
	 * Get the title to display for this record
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}        item       The record item of this model
	 * @param    {String|Array}  fallbacks  Extra fallbacks to use
	 * 
	 * @return   {String}        The display title to use
	 */
	this.getDisplayTitle = function getDisplayTitle(item, fallbacks) {

		var fields,
		    i;

		if (!item) {
			return 'Undefined item';
		}

		fields = Array.cast(this.displayField);

		if (fallbacks) {
			fields = fields.concat(fallbacks);
		}

		for (i = 0; i < fields.length; i++) {
			if (item[fields[i]]) {
				return item[fields[i]];
			}
		}

		return item._id;
	};
	
	/**
	 * Create a new Mongoose schema, with certain fields auto created
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}   blueprint   The schema blueprint
	 * 
	 * @return   {Object}   A mongoose schema
	 */
	this._createSchema = function _createSchema(blueprint) {
		
		var thisModel = this,
			blueprintClone,
			tempSchemas,
			fieldname,
			schema,
			option,
			order,
			ns,
			o, // The original blueprint
			e; // The cloned blueprint
		
		// Add the created & updated field, if they haven't been disabled
		if (typeof blueprint.created === 'undefined') {
			blueprint.created = {type: 'Date', default: Date.now, fieldType: 'Date'};
		}

		if (typeof blueprint.updated === 'undefined') {
			blueprint.updated = {type: 'Date', default: Date.now, fieldType: 'Date'};
		}
		
		// Add the _id field if it doesn't exist
		// This isn't strictly needed, but I prefer to have it in the blueprint anyway
		if (typeof blueprint._id == 'undefined') blueprint._id = {type: 'ObjectId', default: mongoose.Types.ObjectId};

		// Go over every item in the blueprint and remove false values
		for (fieldname in blueprint) {
			if (!blueprint[fieldname]) delete blueprint[fieldname];
		}
		
		// Create a blueprint clone, one we can edit and put function references in
		blueprintClone = alchemy.cloneDeep(blueprint);
		
		// Create an object to store the temporary schemas in
		tempSchemas = {};

		// Empty the safe blueprint
		this.safeBlueprint = {};
		
		// See if any of the entries are arrays
		for (fieldname in blueprintClone) {

			o = blueprint[fieldname];
			e = blueprintClone[fieldname];
			
			// If the type is a string, fetch it from the mongoose types
			if (typeof e === 'string') {
				
				e = {type: e};
				
				// Also update it in the text-only blueprint
				blueprint[fieldname] = {type: e.type};
				o = blueprint[fieldname];
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
					
					order = 1;
					if (e.index.order == 'desc') order = -1;
					
					// Finally: add this field to this index
					this._indexes[e.index.name].fields[fieldname] = order;
				}
				
				if (e.array || e.arrayOf) {

					if (!e.arrayOf) e.arrayOf = e.array;
					
					// If it's an empty object,
					// just create an array of mixed, not subdocuments
					if (alchemy.isEmpty(e.type)) {
						e.type = [{}];
					} else {

						e.type = [this._getType(e.type)];

						// @todo: support for nested schema's
						
						// ns = {};
						// ns[fieldname] = {};
						
						// // Now go over every entry in this field
						// for (option in e) {
							
						// 	// Add those options to a temporary blueprint,
						// 	// but only if it's not the array option
						// 	if (option !== 'array'){
						// 		ns[fieldname][option] = e[option];
						// 	}
						// }

						// ns[fieldname].type = this._getType(ns[fieldname].type);
						
						// // Create the temporary array out of the temporary blueprint
						// tempSchemas[fieldname] = new mongoose.Schema(ns);
						
						// // Overwrite the entry
						// e.type = [tempSchemas[fieldname]];
					}
				} else if (e.translatable) {

					o.objectOf = true;
					e.objectOf = true;

					// Store translations in a simple mixed object
					e.type = {};

					// enable the translate behaviour
					if (!this.behaviours) this.behaviours = {};
					if (!this.behaviours.translate) this.behaviours.translate = {};
					if (!this.behaviours.translate.fields) this.behaviours.translate.fields = {};

					this.behaviours.translate.fields[fieldname] = true;

				} else if (e.objectOf) {
					e.type = {};
				}
			}
			
			// If the type is a string, put in the appropriate function
			e.type = this._getType(e.type);
			
			if (o.type.toLowerCase() === 'enum') {
				// Add an enum rule if none are set yet and the enum
				// is available in the model
				if (typeof this[fieldname.pluralize()] === 'object') {

					// Make sure the rules object exists
					if (typeof e.rules !== 'object') {
						e.rules = {};
					}

					// Set the enum rule if it doesn't exist yet
					if (typeof e.rules.enum === 'undefined') {
						e.rules.enum = {
							values: Object.keys(this[fieldname.pluralize()]),
							message: 'Please enter the correct enum value'
						};
					}

					this.blueprint[fieldname].rules = e.rules;
				}
			}

			var ruleNr, rule;

			// Go over the validation array and see if there are any mongoose
			// built-in-compatible validation rules
			if (e.rules) {
				for (ruleNr = 0; ruleNr < e.rules.length; ruleNr++) {
					rule = e.rules[ruleNr];

					if (rule.type === 'enum') {
						e.enum = rule.values;
					}
				}
			}

			// Store this information back into the blueprint clone
			blueprintClone[fieldname] = e;

			// Add the info to the safe blueprint
			this.safeBlueprint[fieldname] = {
				type: o.type,
				fieldType: o.fieldType || o.type
			};
		}

		// Make a copy of this blueprintClone
		this._blueprintClone = blueprintClone;
		
		// Create the scema, and make it use the given table name as collection name
		schema = new mongoose.Schema(blueprintClone, {

			// Use the given table
			collection: this.useTable,

			// Disable strict, alchemy will handle it
			strict: false
		});

		// Do some things before saving this record
		schema.pre('save', function(next){
			
			// Set the "updated" field to this timestamp before saving
			this.updated = Date.now();
			
			next();
		});
		
		return schema;
	};

	/**
	 * Get the mongo type by name
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this._getType = function _getType(typeName) {

		if (typeof typeName === 'string') {
			
			switch (typeName.toLowerCase()) {
				
				case 'enum':
				case 'string':
					typeName = String;
					break;
			
				case 'number':
					typeName = Number;
					break;

				case 'boolean':
					typeName = Boolean;
					break;
				
				case 'date':
					typeName = Date;
					break;
				
				default:
					// Get the type from mongoose if it exists
					if (mongoose.Schema.Types[typeName]) {
						typeName = mongoose.Schema.Types[typeName];
					} else {
						// If it doesn't, just use the string type
						typeName = String;
					}
					break;
			}
		}

		return typeName;
	};
	
	/**
	 * Create a new Mongoose model
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}   name        The model name
	 * @param    {Object}   schema      The schema blueprint
	 * 
	 * @returns  {Object}   A mongoose model
	 */
	this._createModel = function _createModel(name, schema, cache) {
		
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

		// Add mongoose validation
		this.addValidation(myObject.model);
		
		// Cache the recordset a first time if wanted
		if (cache) this._cacheRecordset(myObject.model);
		
		// Create indexes when connected, these should NOT run in the background
		// on startup (this will block the db, not node)
		this.ensureIndex({background: false});

		return myObject.model;
	};

	/**
	 * Apply validation rules to the schema
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.addValidation = function addValidation(model) {

		var fieldName, field, rule, ruleType, message;

		for (fieldName in this.blueprint) {
			field = this.blueprint[fieldName];

			if (field.rules) {
				for (ruleType in field.rules) {
					rule = field.rules[ruleType];
					rule.type = ruleType;

					if (!rule.on) rule.on = 'always';

					if (this[rule.type+'Rule']) {
						(function(that, rule) {

							model.schema.path(fieldName).validate(function validateRule(value) {

								// There is no way of determining wether a save to the db is an update
								// or a create, not without querying the db first!
								// if (rule.on !== 'always')  {
								// 	// If updated & created are the same, this has just been created
								// 	var created = (this.updated == this.created);

								// 	if (rule.on === 'create' && !created) {
								// 		return;
								// 	} else if (rule.on === 'update' && created) {
								// 		return;
								// 	}
								// }

								return that[rule.type+'Rule'].call(this, value, rule);
							}, rule.type);

						}(this, rule));
					}
				}
			}
		}
		
	};
	
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
	this.ensureIndex = function ensureIndex(options) {
		
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
	 * Perform the given query or get it from the cache.
	 * Should the database be queried, those results will be stored in the cache
	 * The cache is completely nuked when anything is saved.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {Object}   queryOptions   The options for the query
	 * @param   {Function} callback       The function to call with the result
	 */
	this.queryOrCache = function queryOrCache(queryOptions, callback) {

		var thisModel = this,
		    serialized,
		    cacheResult;

		// Serialize the query conditions to a string, using JSON-dry
		serialized = alchemy.stringify(queryOptions);

		if (this.cache) {
			cacheResult = this.cache.get(serialized, true);
		}

		if (cacheResult) {
			
			// Clone the result, but keeping dates & regexes
			cacheResult = bson.deserialize(cacheResult);

			callback(null, cacheResult);
		} else {

			// No cache result was found, so it's time to query the database
			thisModel._whenConnected({
				eval: 'function (options){return transmuteQuery(options);}',
				args: [queryOptions]
			}, function(err, result) {

				// If caching isn't disabled, cache this result
				if (thisModel.cache) {
					alchemy.lowPriority(function(ms){
						thisModel.cache.set(serialized, bson.serialize(result));
					});
				}

				callback(err, result);
			});
		}
	};

	/**
	 * Clear the cache of this and all associated models
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Boolean}   associated   Also nuke associated models
	 * @param    {Object}    seen         Keep track of already nuked models
	 */
	this.nukeCache = function nukeCache(associated, seen) {

		var modelName, assocModel;
		
		// Nuke associated caches by default
		if (typeof associated == 'undefined') {
			associated = true;
		}

		// Create the seen object
		if (typeof seen == 'undefined') {
			seen = {};
		}

		// If the cache exists and we haven't nuked it yet, do it now
		if (this.cache && !seen[this.modelName]) {
			this.cache.destroy();
		}

		// Indicate we've seen this model
		seen[this.modelName] = true;

		// Return if we don't need to nuke associated models
		if (!associated) {
			return;
		}

		for (modelName in this.associations) {

			if (!seen[modelName]) {
				assocModel = _get(modelName);
				assocModel.nukeCache(true, seen);
			}
		}
	};

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
				var query = new DbQuery(thisModel, options);

				thisModel.queryOrCache(query.result, function (err, response) {

					// In this case 'documents' is a misnomer,
					// and we'll always get only 1
					var result  = response.documents[0],
						payload = {},
						retval,
						items;
					
					payload.type = type;
					payload.options = options;
					payload.query = query.result;

					// Because of our custom function,
					// errors are sometimes part of the resultset
					if (typeof result.errmsg !== 'undefined' && typeof result.code !== 'undefined') {
						err = result;
					}

					if (err) {
						log.error('Find error inside ' + thisModel.name + '!');
						log.error(err);
						log.error(payload);
						
					} else {
						retval = result.retval;
						items = retval.results;

						// The amount of total available records,
						// before limit & offset
						payload.available = retval.available;
					}
					
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
	 * @param    {Object}    err
	 * @param    {Object}    items
	 *
	 */
	this._fireAfterFind = function _fireAfterFind (payload, err, records, findCallback) {
		
		var foundAlias  = {},
		    thisModel   = this,
		    items       = [],
		    tasks       = [],
		    tableName,
		    modelName,
		    record,
		    alias,
		    item,
		    cur,
		    nr,
		    m,
		    i;

		if (!records) {
			records = [];
		}

		for (i = 0; i < records.length; i++) {

			record = records[i];
			cur = {};

			for (alias in record) {

				modelName = alias;

				if (this.aliasAssociations[alias] && this.aliasAssociations[alias].modelName) {
					modelName = this.aliasAssociations[alias].modelName;
				}
				
				// Indicate this alias is actually the given model name
				if (alias != this.modelName) {
					foundAlias[alias] = modelName;
				}
				
			}
			
			// Add the record to the new items array
			items.push(record);
		}

		items.available = payload.available;

		// Add the primary afterFind
		tasks.push(function primaryAfterFind (primaryCallback) {
			thisModel.afterFind(function (override) {
				if (typeof override == 'undefined') override = items;
				primaryCallback(null, override);
			}, err, items, true, thisModel.modelName);
		});

		// Now add the other model afterfinds!
		for (alias in foundAlias) {

			modelName = foundAlias[alias];
			m = this.getModel(modelName);

			(function(m, alias, modelName) {
				tasks.push(function nonPrimaryAfterFind (moreItems, nonPrimaryCallback) {
					m.afterFind(function (override) {
						if (typeof override == 'undefined') override = moreItems;
						nonPrimaryCallback(null, override);
					}, err, items, false, alias);
				});
			})(m, alias, modelName);
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
	 * @param    {Object}    payload    Collection of options
	 *                       - options  The blueprint for the query
	 *                       - query    The compiled options
	 *                       - type     The find type
	 * @param    {Object}    err
	 * @param    {Object}    items
	 *
	 */
	this._afterFindNext = function _afterFindNext (payload, overrideErr, overrideResults, callback) {
			
		var results, resultErr;
		
		if (typeof overrideResults == 'undefined' && typeof overrideErr != 'undefined') {
			overrideResults = overrideErr;
			overrideErr = undefined;
		}
		
		if (typeof overrideResults == 'object') {
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
	 * The 'one' or 'first' find method
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}      next     The next callback function
	 * @param    {String}        status   Is this `before` or `after` the find?
	 * @param    {Object}        query    The user defined query
	 * @param    {Object}        result   The results (if status is `after`)
	 */
	this._findOne = this._findFirst = function _findOne (next, status, query, result) {
		
		// Make sure we use Mongo's 'findOne' function
		if (status == 'before') {
			
			query._mongoFnc = 'findOne';
			query.limit = 1;
			
			// Forward the query
			next(query);
		} else {
			// Forward the result
			next(result);
		}
	};
	
	/**
	 * The 'many' or 'all' find method
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}      next     The next callback function
	 * @param    {String}        status   Is this `before` or `after` the find?
	 * @param    {Object}        query    The user defined query
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
	 * @param    {Function}   next     The callback method, pass false to stop
	 * @param    {Object}     options  The query options after merge with default
	 */
	this.beforeFind = function beforeFind(next, options) {
		this._launchBehaviours('beforeFind', next, options);
	};
	
	/**
	 * Function that runs to get linked records
	 * Runs after the _find{Type} function (with `after` as status)
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}     next     The callback method, pass false to stop
	 * @param    {Object}       options  The query options after merge with default
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
	};
	
	/**
	 * Function that runs after every find operation,
	 * with the result items passed
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}   next     The callback method, pass false to stop
	 */
	this.afterFind = function afterFind(next, err, results, primary, alias) {
		this._launchBehaviours('afterFind', next, err, results, primary, alias);
	};

	/**
	 * The save error handler
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Boolean}   err       If there was an error or not
	 * @param    {Object}    result    The result object or error array
	 * @param    {Object}    input     The input data
	 * @param    {Function}  callback  The function to call back
	 */
	this.saveErrorHandler = function saveErrorHandler(err, result, input, callback) {

		var validationType,
		    recordErrors,
		    fieldName,
		    blueprint,
		    errors,
		    obj;

		// If there is an error, and the render object is available, 
		// show validation errors
		if (err && this.render) {

			obj = {};

			if (result.length && result[0]['err']) {
				err = result[0]['err'];

				errors = {};
				obj.__error__ = {};
				obj.__error__[this.modelName] = errors;
				obj.__current__ = input[0];

				if (err.errors) {
					recordErrors = err.errors;

					for (fieldName in recordErrors) {

						validationType = recordErrors[fieldName].type;

						if (this.blueprint[fieldName]) blueprint = this.blueprint[fieldName];
						
						// Non-mongoose validation is always "user defined",
						// the actual name is inside the message
						if (validationType === 'user defined') {
							validationType = recordErrors[fieldName].message;
						}

						if (blueprint.rules && blueprint.rules[validationType]) {
							errors[fieldName] = {
								type: validationType,
								value: recordErrors[fieldName].value,
								message: blueprint.rules[validationType].message
							};
						} else {
							errors[fieldName] = {message: 'Something went wrong: ' + err.message};
						}
					}
				} else {
					
					errors.err = err;
				}
			} else {
				obj.error = 'Something went wrong!';
			}
			
			// Do not call the callback, but send a customized response with validation errors
			this.render(obj);
		} else {
			callback(err, result);
		}
	};

	/**
	 * Ensure ids in the database
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Array}    list      A list of all the records that need to be in the db
	 * @param    {Function} callback  
	 */
	this.ensureIds = function ensureIds(list, callback) {
		
		var that  = this,
		    tasks = [],
		    id,
		    i;

		// Make sure we get an array
		if (!Array.isArray(list)) {
			list = [list];
		}

		for (i = 0; i < list.length; i++) {

			(function(item) {
				tasks[tasks.length] = function (next) {

					that.find('first', {conditions: {_id: item._id}}, function (err, result) {

						var data = {};

						if (result.length) {
							next();
						} else {

							data[that.modelName] = item;

							// Save the data
							that.save(data, function(err, result) {
								if (err) {
									log.error('Failed to ensure "' + that.modelName + '" record: ' + item._id);
									log.error(err);
								}

								next();
							});
						}
					});
				};
			}(list[i]))
		}

		async.parallel(tasks, function() {
			if (callback) callback();
		});
	};
	
	/**
	 * Save (mixed) data to the database
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {object|array}   data      The data to save
	 * @param    {Object}         options
	 * @param    {Function}       callback
	 *
	 */
	this.save = function save(data, options, callback) {

		var thisModel = this, // A scope-save link to this context
		    tasks = [],       // All save functions to be executed by async
		    recordNr,         // A tally for entries in data
		    record,           // An entry in data
		    _callback;        // Temporary storage for the callback
	
		// Normalize arguments
		if (typeof options == 'function') {
			callback = options;
		}

		if (typeof options !== 'object') {
			options = {};
		}

		if (typeof callback !== 'function') {
			callback = function(){};
		}
		
		// If the given data is not an array, turn it into one
		if (!Array.isArray(data)) data = [data];
		
		// the fieldList option is true by default
		if (typeof options.fieldList == 'undefined') options.fieldList = true;
		
		// Go over every recordset we should save
		for (recordNr in data) this._prepareRecordsetSave(tasks, data[recordNr], options);
		
		// Save the primary data. When that is done, save the associated data
		async.parallel(tasks, function(tasks_err, results) {
			this._saveAssociatedData.call(this, tasks_err, results, function(err, result) {
				thisModel.saveErrorHandler(err, result, data, callback);
			});
		}.bind(this));
	};

	/**
	 * Catch recordset preparations
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.prepareSave = function prepareSave(recordset) {
		return recordset;
	};
	
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

		recordset = thisModel.prepareSave(recordset);

		// Make sure tasks is an array
		if (!Array.isArray(tasks)) tasks = [];
		
		saveFnc = function saveFunction(next_task) {
			
			// Save the record for this model only ...
			thisModel.saveOne(recordset[thisModel.modelName], options, function saveFunctionCallback(err, item) {
				
				// Now remove the saved item from the recordset
				var associated = {};

				for (var name in recordset) {
					if (name !== thisModel.modelName) {
						associated[name] = recordset[name];
					}
				}
				
				// Pass the result, and the associated items to save, to the callback
				next_task(null, {err: err, item: item, associated: associated});
			});
		}
		
		// Add the function to the tasks collection array
		tasks.push(saveFnc);
		
		return tasks;
	};
	
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
		
		var err = null,
		    par = {},
		    mainResult,
		    modelName,
		    recordnr,
		    records,
		    _model,
		    extraQ,
		    record,
		    parent,
		    alias,
		    assoc,
		    i;

		// Now it's time to save the associated data!
		for (i in results) {

			// If the result has an error, skip it
			if (results[i].err) {
				if (!Array.isArray(err)) {
					err = [];
				}
				err.push(results[i].err);
				continue;
			}
			
			parent = results[i]['item'];

			for (alias in results[i].associated) {
				
				log.verbose('Getting alias association "' + alias + '"');
				assoc = this.aliasAssociations[alias];

				if (!assoc) {
					log.error('Tried to get alias association "' + alias.bold.underline + '" which does not exist in model ' + this.modelName);
					return callback(true, false);
				}

				modelName = assoc.modelName;
				records = results[i].associated[alias];
				
				// If records isn't an array (but only 1 object) turn it into one
				if (!Array.isArray(records)) records = [records];

				// Add the correct foreign key to every record
				for (recordnr in records) {
					
					record = records[recordnr];
					
					if (assoc.type == 'hasOneChild') {
						record[assoc.foreignKey] = parent._id;
					} else if (assoc.type == 'hasMany') {
						// @todo: when this is missing, hasmany items get saved without foreignkey!
						record[assoc.foreignKey] = parent._id;
					} else {
						log.error('Association type "' + assoc.type + '" has not been implemented yet');
					}
				}
				
				_model = this.getModel(modelName);

				// Create a new closure
				extraQ = (function (_model, records) {
					
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
		
		mainResult = {};
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
	 * @param    {Object}        options
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
		if (typeof options === 'function') {
			var _callback = options;
			
			if (typeof callback === 'object') {
				options = callback;
			} else {
				options = {};
			}
			
			callback = _callback;
		}
		
		if (typeof options === 'undefined') {
			options = {};
		}
		
		// If an array still gets in here, take the first element
		if (Array.isArray(data)) data = data[0];
		
		// If it's still wrapper inside its own modelName, unwrap it
		if (typeof data[this.modelName] !== 'undefined') data = data[this.modelName];
		
		// If callbacks is undefined, it's true
		if (typeof options.callbacks === 'undefined') options.callbacks = true;
		
		// If checking for unique is undefined, it's true
		// Warning: checking for _id is always done by mongo!
		if (typeof options.audit === 'undefined') options.audit = true;
		
		var strictFields = true;
		var fieldList = {};
		var fieldName;
		
		// Honour the fieldList settings
		if (typeof options.fieldList === 'boolean') {
			strictFields = options.fieldList;
		} else if (typeof options.fieldList === 'object') {
			
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
		if (typeof data._id === 'undefined' && options.audit) {
			
			var controlIndexes = {};
			
			// Get all the indexes we need to check/audit
			for (var fieldName in data) {
				if (typeof this._indexFields[fieldName] !== 'undefined') {
					if (this._indexFields[fieldName].unique) {
						controlIndexes[this._indexFields[fieldName].name] = this._indexes[this._indexFields[fieldName].name];
					}
				}
			}
			
			// Prepare functions per index we need to audit
			for (var indexName in controlIndexes) {
				
				// Create a link to this index
				var index = controlIndexes[indexName];
				
				parAudit[indexName] = function auditIndex(async_callback) {
					
					var query = {};
					
					for (var fieldName in index.fields) {
						if (typeof data[fieldName] !== 'undefined') {
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
			parAudit['none'] = function dummyAudit(async_callback) {
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
		 * @param    {Object}    dataToSave      Optional data to be set in the document
		 * @param    {Document}  document        The Mongoose object we need to save
		 * @param    {Function}  extra_callback  The callback
		 *
		 * @returns  {void}
		 */
		var saveDocument = function saveDocument(dataToSave, document, extra_callback) {
			
			var key;

			// Set the values in the document
			for (key in dataToSave) {
				document.set(key, dataToSave[key], {strict: false});
			}

			// Save the document and execute the callback when done
			document.save(function saveRecordToMongo(err, item) {

				// Nuke the query cache
				thisModel.nukeCache();

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
		 * @param    {Object}    dataToSave      Optional data to be set in the document later
		 * @param    {Document}  documentToSave  The Mongoose object we need to save (if already found)
		 * @param    {Function}  extra_callback  The callback
		 *
		 * @returns  {void}
		 */
		var saveRecord = function saveRecord(dataToSave, documentToSave, extra_callback) {
			
			// If there's an _id defined, we need to find the existing document
			if (dataToSave._id && documentToSave !== null) { // Allow false values, but not null
				
				// If the existing document isn't provided yet, we need to find it first
				if (!documentToSave) {
					
					thisModel._model.findOne({_id: dataToSave._id}, '_id', function (err, item) {
						if (item) {
							saveDocument(dataToSave, item, extra_callback);
						} else {
							saveRecord(dataToSave, null, extra_callback);
						}
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
	 * @param    {Function}  next    The callback to call when we're done
	 * @param    {Object}    record  The data that will be saved
	 * @param    {Object}    options
	 *
	 * @return void
	 */
	this.beforeSave = function beforeSave(next, record, options) {
		this._launchBehaviours('beforeSave', next, record, options);
	};
	
	/**
	 * Called after the model saves a record.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}  next    The callback to call when we're done
	 * @param    {Object}    record  The data that has been saved
	 * @param    {Object}    errors
	 *
	 * @return void
	 */
	this.afterSave = function afterSave(next, record, errors) {
		this._launchBehaviours('afterSave', next, record, errors);
	};

	/**
	 * Launch methods of all this model's behaviours
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {String}     methodName  The method's name to run
	 * @param   {Function}   next        The next function to run
	 *
	 * @return  {undefined}
	 */
	this._launchBehaviours = function _launchBehaviours(methodName, next) {

		if (!this.behaviours) {
			next();
			return;
		}
		
		var waterfallResult,
			behaviourName,
			thisScope = this,
			series    = [],
			todo      = 0,
			done      = 0,
			args;

		// Prepare the arguments to apply
		args = Array.prototype.slice.call(arguments, 0);
		
		// Remove the 2 given parameters
		args.splice(0, 2);

		for (behaviourName in this._behaviours) {
			(function(behaviourName) {
				series.push(function(task_callback) {
					// If the result is already false, don't do the other behaviours
					if (waterfallResult === false) {
						task_callback();
					} else {
						thisScope._launchBehaviourMethod(behaviourName, methodName, function(result) {

							// Turn the result into a waterfall kind of thing
							if (typeof waterfallResult === 'undefined') {
								waterfallResult = result;
							} else if (typeof result !== 'undefined') {
								waterfallResult = waterfallResult && result;
							}

							task_callback();
						}, args);
					}
				});
			}(behaviourName));
		}
		
		if (series.length) {
			async.series(series, function tasks_done(err, results) {next(waterfallResult);});
		} else {
			next();
		}
	};

	/**
	 * Launch method of a specific behaviour
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {String}     behaviourName  The behaviour name
	 * @param   {String}     methodName     The method's name to run
	 * @param   {Function}   next           The next function to run
	 * @param   {Array}      args           Arguments to pass to the components
	 *
	 * @return  {undefined}
	 */
	this._launchBehaviourMethod = function _launchBehaviourMethod(behaviourName, methodName, callback, args) {

		var clonedArgs, augmented;

		if (this._behaviours[behaviourName][methodName]) {
			
			// Clone the passed args
			var clonedArgs = args.slice(0);

			// Push the callback on top
			clonedArgs.unshift(callback);

			// Augment the behaviour instance
			augmented = alchemy.augment(this._behaviours[behaviourName], {});

			augmented.model = this;

			augmented[methodName].apply(augmented, clonedArgs);
		} else {
			callback();
		}
	};

	/**
	 * Delete the given record id
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {String}     id   The object id
	 *
	 * @return  {undefined}
	 */
	this.remove = function remove(id, callback) {

		var thisModel = this;

		if (String(id).isObjectId()) {

			this._model.remove({_id: mongoose.Types.ObjectId(id)}, function(err) {
				
				// Nuke the query cache
				thisModel.nukeCache();

				if (callback) callback(err);
			});

			return true;
		} else {
			callback('Given id is not a valid ObjectId');
			return false;
		}
	};

	/**
	 * The notempty validation rule:
	 * value can not be null, undefined or an empty string ''
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {Mixed}   value   The value that is going to be saved to the db
	 * @param   {Object}  rule    The specific rule object
	 *
	 * @return  {Boolean}
	 */
	this.notemptyRule = function notemptyRule(value, rule) {
		// Any number or an absolute false is allowed
		if (typeof value === 'number' || value === false) return true;

		// All other falsy values are not allowed
		return !!value;
	};

	/**
	 * The enum validation rule:
	 * the value has to be inside the 'values' array property of the rule
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {Mixed}   value   The value that is going to be saved to the db
	 * @param   {Object}  rule    The specific rule object
	 *
	 * @return  {Boolean}
	 */
	this.enumRule = function enumRule(value, rule) {

		// Allow undefined values
		if (typeof value === 'undefined') {
			return true;
		}
		
		return rule.values.indexOf(value) > -1;
	};

	/**
	 * The alphaNumeric validation rule:
	 * the value has to be a string containing alphanumeric characters
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {Mixed}   value   The value that is going to be saved to the db
	 * @param   {Object}  rule    The specific rule object
	 *
	 * @return  {Boolean}
	 */
	this.alphaNumericRule = function alphaNumericRule(value, rule) {
		return /^[a-z0-9]+$/i.test(value);
	};

	/**
	 * The between validation rule:
	 * the length (not value) of the value has to be between a certain length
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {Mixed}   value   The value that is going to be saved to the db
	 * @param   {Object}  rule    The specific rule object
	 *
	 * @return  {Boolean}
	 */
	this.betweenRule = function alphaNumericRule(value, rule) {

		// Numbers will be treated as strings
		if (typeof value === 'number') value += '';

		// Make sure the value is something, a string by default
		if (!value) value = '';

		return (value.length >= rule.min && value.length <= rule.max);
	};

});

/**
 * Return a model instance
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   modelName       The singular name of the model
 */
var _get = function get(modelName, autoCreate) {

	if (typeof modelName === 'undefined') {
		log.error('Tried to get model by providing undefined name!')
		return false;
	}

	// Make sure the modelName is singular & camelcases
	modelName = modelName.singularize().camelize();
	
	var returnModel;
	
	// Get the modelname without the "Model" postfix
	// @todo: this messes up Admin models if enabled
	//modelName = modelName.modelName(false);
	
	// Get the modelName WITH the "Model" postfix
	var fullName = modelName.modelName(true);

	// See if there is an instance for this class first
	if (alchemy.instances.models[modelName]) {
		return alchemy.instances.models[modelName];
	}

	// If there is no set class for this model, create one
	if (typeof alchemy.classes[fullName] === 'undefined') {
		
		if (typeof autoCreate === 'undefined') autoCreate = true;
		
		if (autoCreate) {
			log.verbose('Model "' + modelName + '" is undefined, creating new AppModel instance');
			returnModel = new alchemy.classes.AppModel({name: modelName});

			// Register this instance
			alchemy.instances.models[modelName] = returnModel;
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
};

Model.get = _get;

// Store the original extend method
Model._extend = Model.extend;

/**
 * Get an augmented model
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
BaseClass.prototype.getModel = function getModel(modelName, autoCreate, options) {

	// Get the model instance
	var instance = Model.get(modelName, autoCreate),
	    keys, key, nr;

	if (typeof autoCreate == 'object') {
		options = autoCreate;
		autoCreate = undefined;
	}

	if (typeof options != 'object') {
		options = {};
	}

	if (typeof options.skip != 'object') {
		options.skip = {};
	}

	// If something is augmented in the current instance context,
	// also implement it in this new instance
	if (this.__augment__) {

		// Get the OWN properties of this augmentation
		keys = Object.getOwnPropertyNames(this);

		// Add all these own properties to the __augment__ object
		for (nr = 0; nr < keys.length; nr++) {

			key = keys[nr];

			// Skip keys which should not be inherited further
			if (this.__augmentNoInherit[key] || options.skip[key]) {
				continue;
			}

			this.__augment__[key] = this[key];
		}

		instance = alchemy.augment(instance, this.__augment__);
	}

	// Return the possibly-augmented instance
	return instance;
};

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
Model.extend = function extend(name, options, fnc) {

	var ResultClass, instance;

	if (typeof name != 'string') {
		fnc = options;
		options = name;
	}
	
	if (typeof fnc == 'undefined') {
		fnc = options;
		options = {};
	}

	if (typeof options.base == 'undefined') options.base = false;

	if (this.name === 'Model') {
		if (options.base || typeof alchemy.classes.AppModel == 'undefined') {
			ResultClass = alchemy.classes.Model._extend(name, options, fnc);
		} else {
			ResultClass = alchemy.classes.AppModel._extend(name, options, fnc);
		}
	} else {
		ResultClass = this._extend(name, options, fnc);
	}

	// Store the class
	alchemy.models[ResultClass.prototype.modelName] = ResultClass;

	return ResultClass;
};

/**
 * Make basic field information about a model available
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
Resource.register('modelInfo', function(data, callback) {

	// Get the model, if it exists
	var model = Model.get(data.name),
		result;

	if (model) {
		result = model.safeBlueprint;
	}

	callback(result);
});