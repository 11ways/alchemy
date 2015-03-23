var expirable   = alchemy.use('expirable'),
    mongo       = alchemy.use('mongodb'),
    async       = alchemy.use('async'),
    bson        = alchemy.use('bson').BSONPure.BSON,
    hash        = alchemy.use('murmurhash3').murmur128HexSync,
    connections = alchemy.shared('Db.connections'),
    createdModel;

/**
 * The Model class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.1.0
 */
var Model = global.Model = alchemy.create(function Model() {

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
			recursive: 1,
			fields: [],
			sort: false,
			order: 1,
			limit: 0,
			page: false,
			offset: false,
			available: true, // Get the available count
			callbacks: true // Other possible values are false, 'before', 'after
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
		
		// Behaviours for this controller
		this.behaviours = false;
		
		// Behaviour instances
		this._behaviours = {};
	};

	/**
	 * Do when extending
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 */
	this.__extended__ = function __extended__(parentModel, childModel) {

		if (!childModel.prototype.hasOwnProperty('modelName')) {
			childModel.prototype.modelName = childModel.name.replace('Model', '');
		}

		// Do not inherit the useTable property from the parent model
		if (!childModel.prototype.hasOwnProperty('useTable')) {
			childModel.prototype.useTable = null;
		}

		createdModel(childModel);
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

		if (this.useTable) {
			
			var thisModel = this;

			// Set the connection
			this.connection = connections[this.useDbConfig];

			// Create the scheme based on our blueprint
			this.createScheme(this.blueprint);
			
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
					modelName: assoc.modelName,
					assocType: assoc.type,
					type: 'ObjectId',
					index: {
						unique: true,
						order: 'asc'
					}
				};
			} else if (assoc.type == 'belongsTo') {
				this.blueprint[assoc.foreignKey] = {
					modelName: assoc.modelName,
					assocType: assoc.type,
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
						modelName: assoc.modelName,
						assocType: assoc.type,
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
		return Model.getAssociationsMap(this);
	};

	/**
	 * Return the collection for this model
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Function}   callback
	 */
	this.getCollection = function getCollection(callback) {
		this.connection.collection(this.useTable, callback);
	};

	/**
	 * Perform the given method on the collection
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {String}   method   The method to perform on the collection
	 */
	this.withCollection = function withCollection(method) {

		var that = this,
		    args;

		if (!this.useTable) {
			throw alchemy.createError('Model ' + this.name + ' does not use a collection');
		}

		// Convert the arguments to an array
		args = Array.slice(arguments);

		// Remove the methodname
		args.shift();

		// Get the collection object
		this.getCollection(function(err, collection) {
			collection[method].apply(collection, args);
		});
	};

	/**
	 * Query the collection directly
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}     selector   Conditions for the find
	 * @param    {Object}     options
	 * @param    {Function}   callback
	 */
	this.queryCollection = function queryCollection(selector, options, callback) {

		var thisModel = this,
		    serialized,
		    cacheResult,
		    result,
		    cursor;

		if (typeof options === 'function') {
			callback = options;
			options = {};
		}

		// Serialize the query conditions to a string, using JSON-dry
		serialized = 'query-' + hash(alchemy.stringify({selector: selector, options: options}));

		// Look in the cache for this result
		if (this.cache) {
			cacheResult = this.cache.get(serialized, true);
		}

		if (cacheResult) {

			// Decode the BSON result
			result = thisModel.decodeBson(cacheResult.items);

			// Return the result
			callback(cacheResult.err, result, cacheResult.available);

		} else {

			// Get the collection object
			thisModel.connection.collection(thisModel.useTable, function(err, collection) {

				var modOptions = alchemy.inject({}, options),
				    tasks = {};

				// Always return BSON objects
				modOptions.raw = true;

				// Create the cursor
				cursor = collection.find(selector, modOptions);

				if (options.available !== false) {
					// Get the amount of available items
					tasks.available = function(next) {

						cursor.count(false, function(err, available) {
							next(err, available)
						});
					};
				}

				// Get the items themselves
				tasks.items = function(next) {
					// Get all the BSON items
					cursor.toArray(function(err, items) {
						next(err, items);
					});
				};

				async.parallel(tasks, function(err, result) {

					if (thisModel.cache) {
						thisModel.cache.set(serialized, {err: err, items: result.items, available: result.available});
					}

					callback(err, thisModel.decodeBson(result.items), result.available);
				});
			});
		}
	};

	/**
	 * Decode a BSON object or array of objects
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Array|Object}   content   The BSON object or array of objects
	 */
	this.decodeBson = function decodeBson(content) {

		var result,
		    i;

		if (!content) {
			return;
		}

		// If the content is an array, decode the bson objects inside
		if (Array.isArray(content)) {
			
			// Create the result array
			result = [];

			for (i = 0; i < content.length; i++) {
				result.push(bson.deserialize(content[i]));
			}
		} else {
			result = bson.deserialize(content);
		}

		return result;
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
	 * @version  0.1.0
	 *
	 * @param    {Object}        item       The record item of this model
	 * @param    {String|Array}  fallbacks  Extra fallbacks to use
	 * 
	 * @return   {String}        The display title to use
	 */
	this.getDisplayTitle = function getDisplayTitle(item, fallbacks) {

		var fields,
		    field,
		    main,
		    val,
		    i;

		if (!item) {
			return 'Undefined item';
		}

		if (item[this.modelName]) {
			main = item[this.modelName];
		} else {
			main = item;
		}

		if (!main) {
			return 'Undefined item';
		}

		fields = Array.cast(this.displayField);

		// Add name again
		fields.push('name');

		if (fallbacks) {
			fields = fields.concat(fallbacks);
		}

		for (i = 0; i < fields.length; i++) {

			field = this.blueprint[fields[i]];

			val = main[fields[i]];

			if (Object.isObject(val) && field && field.translatable) {
				val = alchemy.pickTranslation(this.render, val);
			}

			if (val && typeof val == 'string') {
				return val;
			}
		}

		return main._id || '';
	};
	
	/**
	 * Create a new Mongoose schema, with certain fields auto created
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @param    {Object}   blueprint   The blueprint
	 * 
	 * @return   {Object}   The compiled scheme
	 */
	this.createScheme = function createScheme(blueprint) {
		
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
			blueprint.created = {type: 'Date', default: Date.create, fieldType: 'Date'};
		}

		if (typeof blueprint.updated === 'undefined') {
			blueprint.updated = {type: 'Date', default: Date.create, fieldType: 'Date'};
		}
		
		// Add the _id field if it doesn't exist
		// This isn't strictly needed, but I prefer to have it in the blueprint anyway
		if (typeof blueprint._id == 'undefined') blueprint._id = {type: 'ObjectId', default: alchemy.ObjectId};

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
			
			// If the type is a string, fetch the function
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
				
				if (e.translatable) {

					o.object = true;
					e.object = true;
					o.objectOf = true;
					e.objectOf = true;

					// enable the translate behaviour
					if (!this.behaviours) this.behaviours = {};
					if (!this.behaviours.translate) this.behaviours.translate = {};
					if (!this.behaviours.translate.fields) this.behaviours.translate.fields = {};

					this.behaviours.translate.fields[fieldname] = true;

				} else if (e.objectOf || e.object) {
					e.type = Object;
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

		// Save the compiled blueprint as scheme
		this.scheme = blueprintClone;
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

				case 'objectid':
					typeName = alchemy.ObjectId;
					break;

				case 'object':
					typeName = Object;
					break;
				
				default:
					// Get the type from mongo if it exists
					if (mongo[typeName]) {
						typeName = mongo[typeName];
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
	 * Enable a behaviour
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.addBehaviour = function addBehaviour(behaviourname, options) {

		var original,
		    key;

		if (!options) {
			options = {};
		}

		// If these behaviours are inherited, clone the object
		if (!this.hasOwnProperty('behaviours') && !this.constructor.prototype.hasOwnProperty('behaviours')) {

			if (this.behaviours && typeof this.behaviours == 'object') {

				original = this.behaviours;
				this.behaviours = {};

				for (key in original) {
					this.behaviours[key] = original[key];
				}
			} else {
				this.behaviours = {};
			}
		}

		// If no valid behaviours object was found, create one
		if (!this.behaviours && typeof this.behaviours !== 'object') {
			this.behaviours = {};
		}

		this.behaviours[behaviourname] = options;
	};

	/**
	 * Create index on specified fields.
	 * If the index already exists, and the dropIndex option was not given,
	 * then nothing happens for that index.
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @param    {Object|Boolean}  options       Several options, or 'true' to set options.dropIndex
	 *                             - background  Make mongo yield whenever possible
	 * @param    {Function}        callback
	 */
	this.ensureIndex = function ensureIndex(options, callback) {
		
		var thisModel = this,
		    dropIndex = false,
		    tasks     = {},
		    dropTasks = {},
		    indexClone,
		    indexName;

		if (options === true) dropIndex = true;
		
		if (typeof options != 'object') options = {};
		if (typeof options.dropIndex == 'undefined') options.dropIndex = dropIndex;
		if (typeof options.background == 'undefined') options.background = true;
		
		// If this model does not have indexes, do nothing
		if (alchemy.isEmpty(thisModel._indexes)) return;
		
		indexClone = alchemy.inject({}, thisModel._indexes);
		
		Object.each(indexClone, function(index, indexName) {

			// Should this index command run in the background?
			if (typeof options.background != 'undefined') {
				index.options.background = options.background;
			}
			
			// Drop duplicates?
			if (typeof options.dropDups != 'undefined') {
				index.options.dropDups = options.dropDups;
			}

			if (dropIndex) {
				dropTasks[indexName] = function dropIndex(next) {
					thisModel.getCollection(function(err, collection) {
						if (err) return next(err);

						collection.dropIndex(indexName, function(err, result) {
							next();
						});
					});
				};
			}

			tasks[indexName] = function(next) {
				thisModel.getCollection(function(err, collection) {
					if (err) return next(err);

					collection.ensureIndex(index.fields, index.options, function(err, indexName) {
						next(err, indexName);
					});
				});
			};
		});

		// Drop all the indexes that need to be dropped first
		async.parallel(dropTasks, function(err) {

			if (err) {
				log.error('Error dropping index in ' + thisModel.modelName);
			}

			// And now create them
			async.parallel(tasks, function(err) {

				if (err) {
					log.error('Error creating index in ' + thisModel.modelName);
				}

				if (callback) callback();
			});
		});
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
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @returns  {boolean}   If the request has been made succesfully or not
	 */
	this.find = function find(type, options, callback) {

		if (!this.useTable) {
			callback(alchemy.createError('Model ' + this.modelName + ' does not use a table, find ignored!'));
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

				var result;
				
				if (status === false) {
					
					// Prepare an empty array
					result = [];

					// Set the available to 0
					result.available = 0;
					
					return callback(null, result);
				} else if (typeof status == 'object') options = status;

				// Create a query object
				var query = new DbQuery(thisModel, options);

				if (options.debug) {
					pr('Executing debugged query for ' + thisModel.modelName + ' model');
					pr(options);
				}

				query.execute(function(err, items) {

					var payload = {};

					if (options.debug) {
						pr('Debugged query result for ' + thisModel.modelName + ' model: ' + items.length);
					}

					payload.type = type;
					payload.options = options;
					payload.query = query;

					if (items) {
						payload.available = items.available;
					}

					if (options.debug) {
						console.time('Adding associated data to ' + items.length + ' records of ' + thisModel.modelName);
					}

					thisModel.addAssociatedData(payload, items, function(err, items) {

						if (options.debug) {
							console.timeEnd('Adding associated data to ' + items.length + ' records of ' + thisModel.modelName);
						}

						// Do the afterFind
						thisModel._fireAfterFind.call(thisModel, payload, err, items, callback);
					});
				});

			}, options); // Model beforeFind callback
		
		}, 'before', options, null); // _findMethod - before
		
		return true;
	};
	
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

		items = Array.cast(records);
		items.available = payload.available;

		// Add the primary afterFind
		tasks.push(function primaryAfterFind (primaryCallback) {
			thisModel.afterFind(function (override) {
				if (typeof override == 'undefined') override = items;
				primaryCallback(null, override);
			}, err, items, true, thisModel.modelName, payload);
		});

		// Execute the AfterFind functions of the other models in a waterfall manner
		// and execute the _afterFindNext afterwards
		async.waterfall(tasks, function afterFindsFinished (asyncErr, items) {

			var errors;

			if (err) {
				if (Array.isArray(err)) {
					errors = err;
				} else {
					errors = [err];
				}

				if (asyncErr) {
					errors = errors.concat(asyncErr);
				}
			}

			thisModel._afterFindNext(payload, errors, items, findCallback);
		});
	};

	/**
	 * Add associated data to an array of records
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}    payload
	 * @param    {Array}     records
	 * @param    {Function}  callback
	 */
	this.addAssociatedData = function addAssociatedData(payload, records, callback) {

		var that  = this,
		    tasks;

		// Don't add associated data if recursive is set to 0
		if ((payload.query.recursive <= 0 && !payload.options.contain) || payload.options.contain === true) {
			return callback(null, records);
		}

		tasks = [];

		records = Array.cast(records);

		records.forEach(function(record, index) {
			tasks[index] = function(next) {
				that.addAssociatedDataToRecord(payload, record, next);
			};
		});

		if (payload.options.debug) {
			pr('Executing associated data tasks: ' + tasks.length);
		}

		async.parallelLimit(tasks, 16, function(err) {
			callback(err, records);
		});
	};

	/**
	 * Add associated data to a single record
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}    payload
	 * @param    {Object}    item
	 * @param    {Function}  callback
	 */
	this.addAssociatedDataToRecord = function addAssociatedDataToRecord(payload, item, callback) {

		var query        = payload.query,
		    associations = query.associations,
		    aliases      = {},
		    that         = this,
		    data         = item[this.modelName];

		Object.each(associations, function(association, alias) {

			aliases[alias] = function(nextAlias) {
				
				var assocModel = that.getModel(association.modelName),
				    assocOpts  = {},
				    condition  = {},
				    assocKey,
				    localKey;

				switch (association.type) {

					case 'hasOneParent':
					case 'hasAndBelongsToMany':
					case 'belongsTo':
						assocKey = '_id';
						localKey = association.foreignKey;
						break;

					case 'hasMany':
					case 'hasOneChild':
						assocKey = association.foreignKey;
						localKey = '_id';
						break;

					default:
						log.error('Still need to implement ' + association.type);
				}

				if (Array.isArray(data[localKey])) {
					condition[assocKey] = data[localKey].map(function(value) {
						return alchemy.castObjectId(value) || 'impossible';
					});
				} else {
					condition[assocKey] = alchemy.castObjectId(data[localKey]) || 'impossible';
				}

				// Take over the locale option
				assocOpts.locale = payload.options.locale;

				// Don't get the available count
				assocOpts.available = false;

				// If fields have been provided, add them
				if (query.fields && query.fields[alias]) {
					assocOpts.fields = query.fields[alias];
				}

				// Sort the results
				if (query.sort && query.sort[alias]) {
					assocOpts.sort = query.sort[alias];
				}

				assocOpts.recursive = 0;

				if (query.contain === true) {
					assocOpts.contain = true;
				} else if (query.contain && query.contain[alias]) {
					assocOpts.contain = query.contain[alias];
				} else {
					assocOpts.contain = false;
					assocOpts.recursive = query.recursive - 1;
				}
				
				assocOpts.conditions = condition;

				assocModel.find('all', assocOpts, function(err, assocItems) {

					var result = [],
					    item,
					    temp,
					    i;

					for (i = 0; i < assocItems.length; i++) {
						item = assocItems[i];

						// Get the associated model's main resultset
						temp = item[assocModel.modelName];

						// Remove the main resultset from the original item
						delete item[assocModel.modelName];

						// Inject it back into the item
						item = alchemy.inject(temp, item);

						// Add it to the resultset
						result.push(item);
					}

					switch (association.type) {
						case 'hasOneParent':
						case 'hasOneChild':
						case 'belongsTo':
						case 'hasOne':
							result = result[0];
							break;
					}

					nextAlias(err, result);
				});
			};
		});

		async.parallel(aliases, function(err, list) {
			
			// Add the associated data to the item
			alchemy.inject(item, list);

			callback(err, item);
		});
	};
	
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
		else resultErr = null;
		
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
	this.afterFind = function afterFind(next, err, results, primary, alias, payload) {
		this._launchBehaviours('afterFind', next, err, results, primary, alias, payload);
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
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @param    {Object|Array}   data      The data to save
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
	 * Create a new object with 
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}   data   Field values
	 */
	this.compose = function compose(data) {

		var obj = {},
		    fieldName,
		    field,
		    val;

		// Set the default values
		for (fieldName in this.scheme) {

			field = this.scheme[fieldName];

			if (field.default) {
				if (typeof field.default == 'function') {
					obj[fieldName] = field.default();
				} else {
					obj[fieldName] = field.default;
				}
			}
		}

		// If data is a not-null object, inject it
		if (data && typeof data === 'object') {
			for (fieldName in data) {
				data[fieldName] = this.castField(data[fieldName], fieldName);
			}

			alchemy.inject(obj, data);
		}

		return obj;
	};

	/**
	 * Cast the given value to one expected by the field
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}   value
	 * @param    {String}   fieldName
	 */
	this.castField = function castField(value, fieldName) {

		var field  = this.scheme[fieldName],
		    values = value,
		    key,
		    i;

		// Undefined values are allowed to be saved no matter what the type is
		if (typeof value === 'undefined') {
			return value;
		}

		if (field) {

			// Turn the given value into an array, no matter what
			if (!Array.isArray(values)) {
				values = [values];
			}

			for (i = 0; i < values.length; i++) {

				// If this field is an object, handle all the values of the object
				if (field.object) {
					if (typeof values[i] !== 'object') {
						values[i] = null;
					} else {
						for (key in values[i]) {
							values[i][key] = this.castValue(values[i][key], field.type);
						}
					}
				} else {
					values[i] = this.castValue(values[i], field.type);
				}
			}
			
			if (field.array) {
				return values;
			} else {
				return values[0];
			}
		}

		return value;
	};

	/**
	 * Cast the given value to its type
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}     value
	 * @param    {Function}   type
	 */
	this.castValue = function castValue(value, type) {

		if (typeof value === 'undefined' || value === null) {
			return value;
		}

		// Only handle it if the type is a valid function
		if (typeof type === 'function') {

			switch (type) {

				case String:
				case Number:
				case Boolean:
					if (value.constructor.name !== type.name) {
						value = type(value);
					}
					break;

				default:

					if (type.name === 'ObjectID') {
						value = alchemy.castObjectId(value);
					} else {
						if (!(value instanceof type)) {
							value = new type(value);
						}
					}
					break;
			}
		}

		return value;
	};
	
	/**
	 * Save one record for this model
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @param    {Object|Array}  data          The data to save
	 * @param    {Object}        options
	 *           {Boolean}       .callbacks    Enable callbacks (true)
	 *           {Boolean}       .audit        Honour & update unique index (true)
	 *           {Boolean|Array} .fieldList    Only allow fields from scheme (true)
	 *                                         or fields defined in array
	 */
	this.saveOne = function saveOne(data, options, callback) {
		
		var thisModel = this,
		    controlIndexes,
		    fieldSave,
		    fieldList,
		    fieldName,
		    parAudit,
		    temp,
		    i;

		if (typeof options === 'function') {
			callback = options;
		}

		if (!options || typeof options !== 'object') {
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
		
		// See if a fieldlist is supplied
		if (typeof options.fieldList === 'boolean') {
			if (options.fieldList) {
				fieldList = Object.keys(this.blueprint);
			}
		} else if (typeof options.fieldList === 'object') {
			if (Array.isArray(options.fieldList)) {
				fieldList = {};

				for (i = 0; i < options.fieldList.length; i++) {
					fieldList[options.fieldList[i]] = true;
				}
			} else {
				fieldList = options.fieldList;
			}
		}

		// If fieldlist is truthy, remove any other values
		if (options.fieldList) {

			if (Array.isArray(fieldList)) {
				temp = fieldList;
				fieldList = {};

				for (i = 0; i < temp.length; i++) {
					fieldList[temp[i]] = true;
				}
			}

			// Now remove any item in data that is not in the fieldList
			for (fieldName in data) {
				if (!fieldList[fieldName]) {
					delete data[fieldName];
				}
			}
		}

		// Prepare the record to be saved to the database
		this.prepareRecord(data, options, function(err, data) {

			if (err) {
				return callback(err);
			}

			if (options.callbacks) {

				thisModel.beforeSave(function afterBeforeSave (record, over_options) {

					// Stop if an error has been returned
					if (record instanceof Error) {
						return callback(record, null);
					}

					if (typeof record != 'undefined') data = record;
					if (typeof over_options != 'undefined') options = over_options;
					
					// If record is false, call the callback with error
					if (record === false) {
						callback(alchemy.createError('beforeSave denied'));
					} else {

						thisModel.saveToCollection(data, function beforeAfterSave (err, item) {
							thisModel.afterSave(function afterAfterSave () {
								
								// Finally call the user provided callback
								if (callback) callback(err, item);
								
							}, item, err, options);
						});
					}
					
				}, data, options);
				
			} else {
				thisModel.saveToCollection(data, callback);
			}
		});
	};

	/**
	 * Save the given data in the collection.
	 * Fields that are not given will not be removed from the existing record
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}     data       The record data to prepare
	 * @param    {Function}   callback
	 */
	this.saveToCollection = function saveToCollection(data, callback) {

		var that = this;

		// Get the collection object
		this.getCollection(function(err, collection) {

			var onInsert,
			    update,
			    unset,
			    flat,
			    doc,
			    key,
			    _id;

			if (err) {
				return callback(err);
			}

			// Get the _id or create one
			_id = data._id;

			// Clone the data object
			doc = Object.assign({}, data);

			// Remove the _id field, because it's not allowed to be modified using $set
			delete doc._id;

			// Flatten the object
			// @todo: arrays with undefined values don't seem to work yet
			flat = Object.flatten(doc);

			// The fields defined in this item will be unset
			unset = {};

			// The fields in this item will be set to the given value on insert only
			onInsert = {};

			// If there is an updated date, us that one so the times are the same
			if (!flat.created) {

				// Make sure there is no created key
				delete flat.created;

				if (flat.updated) {
					onInsert.created = flat.updated;
				} else {
					onInsert.created = new Date();
				}
			}

			for (key in flat) {
				// Undefined or null means we want to delete the value.
				// We can't set null, because that could interfere with dot notation updates
				if (typeof flat[key] === 'undefined' || flat[key] === null) {

					// Add the key to the unset object
					unset[key] = '';

					// Remove it from the flat object
					delete flat[key];
				}
			}

			// Create the update object
			update = {
				$set: flat
			};

			if (!Object.isEmpty(onInsert)) {
				update.$setOnInsert = onInsert;
			}

			if (!Object.isEmpty(unset)) {
				update.$unset = unset;
			}

			collection.update({_id: data._id}, update, {upsert: true}, function(err, result) {
				
				if (err) {
					return callback(err);
				}

				// Nuke the model's cache after every save
				that.nukeCache();

				callback(null, data);
			});
		});
	};

	/**
	 * Prepare the record for complete saving
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}     data       The record data to prepare
	 * @param    {Object}     options
	 * @param    {Function}   callback
	 */
	this.prepareRecord = function prepareRecord(data, options, callback) {

		var that = this;

		// Look for an id first
		this.auditRecord(data, options, function afterAudit(err, record) {

			var tasks = {};

			if (err) {
				return callback(err);
			}

			if (!record._id) {
				record = that.compose(record);
			} else {
				tasks.fetch = function(next) {

					var id = alchemy.castObjectId(record._id);

					if (!id) {
						return next(alchemy.createError('Illegal ObjectId given'));
					}

					that.queryCollection({_id: id}, function(err, item) {

						if (item.length) {
							item = item[0];

							alchemy.inject(item, record);
						} else {
							item = record;
						}

						next(null, item);
					});
				};
			}

			async.parallel(tasks, function(err, result) {

				var dataToSave;

				if (err) {
					return callback(err);
				}

				if (result && result.fetch) {
					dataToSave = result.fetch;
				} else {
					dataToSave = record;
				}

				// Set the updated field if it's in the scheme
				if (that.scheme.updated) {
					dataToSave.updated = new Date();
				}

				callback(null, dataToSave);
			});
		});
	};

	/**
	 * Look for the record id by checking the indexes
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}     data       The record data to check
	 * @param    {Object}     options
	 * @param    {Function}   callback
	 */
	this.auditRecord = function auditRecord(data, options, callback) {

		var thisModel = this,
		    controlIndexes,
		    fieldName,
		    tasks;
		
		// Try to get the data _id by looking through other indexes
		if (typeof data._id === 'undefined' && options.audit) {
			
			tasks = {};
			controlIndexes = {};
			
			// Get all the indexes we need to check
			for (fieldName in data) {
				if (typeof this._indexFields[fieldName] !== 'undefined') {
					if (this._indexFields[fieldName].unique) {
						controlIndexes[this._indexFields[fieldName].name] = this._indexes[this._indexFields[fieldName].name];
					}
				}
			}

			// Prepare functions per index we need to check
			Object.each(controlIndexes, function(index, indexName) {

				tasks[indexName] = function auditIndex(async_callback) {
					
					var query = {},
					    fieldName;
					
					for (fieldName in index.fields) {
						if (typeof data[fieldName] !== 'undefined') {
							query[fieldName] = data[fieldName];
						}
					}

					thisModel.queryCollection(query, {fields: ['_id'], limit: 1}, function(err, item) {
						async_callback(err, item[0]);
					});
				};
			});

			async.parallel(tasks, function(err, indexResults) {

				var countResult,
				    indexName,
				    idCache,
				    record,
				    i;

				// Remove all falsy values
				for (indexName in indexResults) {
					if (!indexResults[indexName]) delete indexResults[indexName];
				}
				
				// If items have been found we should add the id to the data
				if (!Object.isEmpty(indexResults)) {
					
					countResult = 0;
					idCache = {};

					for (indexName in indexResults) {
						
						record = indexResults[indexName];

						// First make sure this index is allowed during the audit
						// If it's not, this means it should be considered a duplicate
						if (options.allowedIndexes && !Object.hasValue(options.allowedIndexes, indexName)) {
							if (callback) callback(alchemy.createError('Duplicate index found other than _id: ' + indexName), null);
							return false;
						}
						
						// If this is the first time we see this id ...
						if (typeof idCache[record._id] == 'undefined') {
							countResult++;
							idCache[record._id] = true;
						}
					}
					
					// If more than 1 ids are found we can't update the item
					if (countResult > 1) {
						if (callback) callback(alchemy.createError('Multiple unique records found!'), null);
						return false;
					}

					// If we continue, the record id we need to update will still be in here
					data._id = record._id;
				}

				callback(null, data);
			});
		} else {
			callback(null, data);
		}
	};
	
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
	this.afterSave = function afterSave(next, record, errors, options) {
		this._launchBehaviours('afterSave', next, record, errors, options);
	};

	/**
	 * Called before a record is removed.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}  next    The callback to call when we're done
	 * @param    {Object}    record  The data that is going to be removed
	 *
	 * @return   {undefined}
	 */
	this.beforeRemove = function beforeRemove(next, record) {
		this._launchBehaviours('beforeRemove', next, record);
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

		Object.each(this._behaviours, function(behaviour, behaviourName) {
			
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
		});
		
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
	 * @param   {Array}      args           Arguments to pass to the behaviours
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
	 * @version  0.1.0
	 *
	 * @param   {String}     id        The object id
	 * @param   {Function}   callback
	 *
	 * @return  {undefined}
	 */
	this.remove = function remove(id, callback) {

		var thisModel = this,
		    id        = alchemy.castObjectId(id);

		if (!id) {
			return callback(alchemy.createError('Invalid ObjectId given!'));
		}

		this.getCollection(function(err, collection) {

			if (err) {
				return callback(err);
			}

			collection.findAndRemove({_id: id}, function(err, result){
				thisModel.nukeCache();
				callback(err, result);
			});
		});
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
 * Get the associations map of the given object, if it exists
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
Model.getAssociationsMap = function getAssociationsMap(obj) {

	var alias,
	    map = {};

	if (obj.aliasAssociations) {
		// The model has no alias, but uses its own modelname
		map[obj.modelName] = obj.modelName;

		// Go over every association
		for (alias in obj.aliasAssociations) {
			map[alias] = obj.aliasAssociations[alias].modelName;
		}
	}

	return map;
};

/**
 * Determine of an object is a model instance
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Model.isModel = function isModel(obj) {

	if (obj instanceof Model) {
		return true;
	}

	return false;
};

/**
 * After a model has been created,
 * do certain actions (like ensuring the index)
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {Class}   modelClass
 */
createdModel = function createdModel(modelClass) {
	alchemy.after('datasourcesConnected', function() {
		var model = Model.get(modelClass.name);
		model.ensureIndex();
	});
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