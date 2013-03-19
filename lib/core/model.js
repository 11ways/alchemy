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
var Model = alchemy.classes.BaseClass.extend(function Model (){
	
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
		
		// If the modelName still isn't set, get it from the class name
		if (!this.modelName) this.modelName = this.name.replace('Model', '');
		
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
	
});

alchemy.classes.Model = Model;