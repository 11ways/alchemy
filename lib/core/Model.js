var validate = require('mongoose-validator').validate;
var mongoose = require('mongoose');
var $ = require('jquery');

/**
 * The Model class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
var Model = alchemy.classes.BaseClass.extend(function(){

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
	
	this.init = function init () {
		// Create the schema based on our blueprint
		this._schema = this._createSchema(this.blueprint);
		
		// Create the model based on that schema
		this._model = this._createModel(this.name, this._schema, this.enableCache);
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
		var blueprintClone = $.extend({}, blueprint);
		
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
				if ($.isEmptyObject(e.type)) {
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
		myObject.model = mongoose.model(name, schema);
		
		// Cache the recordset a first time if wanted
		if (cache) this._cacheRecordset(myObject.model);
		
		return myObject.model;
	}
	
});

alchemy.classes.Model = Model;