const CriteriaNS = Function.getNamespace('Alchemy.Criteria'),
      Expressions = Function.getNamespace('Alchemy.Criteria.Expression');

/**
 * The Criteria class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {Model}   model
 */
const Criteria = Function.inherits('Alchemy.Criteria.Criteria', function Model(model) {

	// The model
	this.model = model;

	Model.super.call(this, {
		select        : new Select(this),
		document      : true,
		document_list : true,
	});
});

/**
 * Make sure to get a criteria
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.5
 * @version  1.4.0
 *
 * @param    {Object}   conditions  The thing that should be a criteria
 * @param    {Object}   options     The options to apply
 * @param    {Model}    model       The model that it probably belongs to
 *
 * @return   {Criteria}
 */
Criteria.setStatic(function cast(conditions, options, model) {

	if (Criteria.isCriteria(conditions)) {
		return conditions;
	}

	if (arguments.length == 2) {
		model = options;
		options = conditions;
		conditions = null;
	}

	let instance = new Criteria(model);

	if (options) {
		instance.applyOldOptions(options);
	}

	if (conditions) {
		instance.applyConditions(conditions);
	}

	return instance;
});

/**
 * Undry the given object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.2.3
 *
 * @param    {Object}   data
 *
 * @return   {Criteria}
 */
Criteria.setStatic(function unDry(data) {

	var criteria = new Criteria();

	if (data.model) {
		try {
			criteria.model = alchemy.getModel(data.model);
		} catch (err) {
			// Ignore
			console.warn('Failed to find "' + data.model + '" model');
		}
	}

	// Revive the group instance
	criteria.group = Expressions.Group.revive(data.group, criteria);

	if (!data.options) {
		data.options = {};
	}

	// Revive the select
	data.options.select = Select.revive(data.options.select, criteria);

	criteria.options = data.options || {};

	return criteria;
});

/**
 * Parse a path to an object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   path
 * @param    {Criteria} criteria
 *
 * @return   {Object}
 */
Criteria.setStatic(function parsePath(path, criteria) {

	var target_path,
	    result = {},
	    pieces,
	    piece,
	    alias,
	    i;

	if (path.indexOf('.') > -1) {
		pieces = path.split('.');
	} else {
		pieces = [path];
	}

	for (i = 0; i < pieces.length; i++) {
		piece = pieces[i];
		alias = null;

		if (criteria && criteria.model) {
			if (criteria.model.associations[piece]) {
				alias = piece;
			}
		}

		if (!alias && piece[0].isUpperCase()) {
			alias = piece;
		}

		if (alias) {
			if (!result.association) {
				result.association = [];
			}

			result.association.push(alias);
			continue;
		}

		target_path = pieces.slice(i).join('.');
		break;
	}

	if (target_path) {
		result.target_path = target_path;
	}

	return result;
});

/**
 * Create a reference to the datasource
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Datasource}
 */
Criteria.setProperty(function datasource() {

	if (this._datasource) {
		return this._datasource;
	}

	if (this.model) {
		return this.model.datasource;
	}
}, function setDatasource(ds) {
	this._datasource = ds;
	return this._datasource;
});

/**
 * The recursiveness of this criteria
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {number}
 */
Criteria.setProperty(function recursive_level() {

	if (this.options.recursive) {
		return this.options.recursive;
	}

	return 0;
});

/**
 * Allow the criteria to be used in a for wait loop
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Criteria.setMethod(Symbol.asyncIterator, function asyncIterator() {

	const that = this,
	      model = this.model;

	if (!model) {
		throw new Error('Unable to iterate over a criteria without a model');
	}

	// Clone it
	let criteria = this.clone();

	// Set the limit to 1
	criteria.limit(1);

	// Create the iterator context
	let context = {
		index : 0,
		next  : async function next() {

			criteria.skip(this.index++);

			let record = await model.find('first', criteria);

			if (!record) {
				return {done: true};
			}

			return {value: record, done: false};
		}
	};

	return context;
});

/**
 * Return object for jsonifying
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.2.3
 *
 * @return   {Object}
 */
Criteria.setMethod(function toJSON() {

	let result = {},
	    options;

	if (this.model && this.model.name) {
		result.model = this.model.name;
	}

	if (this.options) {
		let key;
		options = {};

		for (key in this.options) {
			if (key == 'assoc_cache' || key == 'init_record') {
				continue;
			}

			options[key] = this.options[key];
		}
	}

	result.group = this.group;
	result.options = options;

	return result;
});

/**
 * Clone this instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function clone() {

	var data = JSON.toDryObject(this),
	    result;

	data.model = null;
	result = JSON.undry(data);

	result.model = this.model;

	return result;
});

/**
 * Get the main fields to select
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.2.3
 *
 * @return   {string[]}
 */
Criteria.setMethod(function getFieldsToSelect() {

	let result;

	if (this.options?.select?.fields?.length) {
		result = this.options.select.fields.slice(0);
	}

	// Fields can sometimes be required for a query (like in a join) but they
	// won't be selected if other fields are explicitly set.
	// So in that case: add these special fields to the projection
	if (result && this.options?.select?.query_fields) {
		result.push(...this.options.select.query_fields);
	}

	return result || [];
});

/**
 * Get the association selects, if any
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Object}
 */
Criteria.setMethod(function getAssociationsToSelect() {

	let result = this.options.select.associations;

	return result;
});

/**
 * Should the given association be queried?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   name
 *
 * @return   {boolean}
 */
Criteria.setMethod(function shouldQueryAssociation(name) {

	var result = false;

	// If there are explicit associations selected,
	// then this one has to be in it!
	if (this.getAssociationsToSelect()) {
		result = this.options.select.shouldQueryAssociation(name);
	} else {
		// There are no explicit associations, look at the recursive level
		result = this.recursive_level > 0;
	}

	return result;
});

/**
 * Get association configuration in the current active model
 * or in the options
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   alias
 *
 * @return   {Object}
 */
Criteria.setMethod(function getAssociationConfiguration(alias) {

	if (this.options.associations && this.options.associations[alias]) {
		return this.options.associations[alias];
	}

	return this.model.getAssociation(alias);
});

/**
 * Get a new criteria for adding associated data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.2.3
 *
 * @param    {string}   name
 * @param    {Object}   item
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function getCriteriaForAssociation(name, item) {

	if (!this.model) {
		throw new Error('Unable to create criteria for association "' + name + '" without originating model instance');
	}

	let assoc_model = this.model.getAliasModel(name),
	    data = item[this.model.name];

	// @TODO: For deadlock reasons we don't query self-referencing links!
	// (Implemented in Schema fields, BelongsTo and such could still pose problems!)
	if (assoc_model.name == this.options.init_model) {
		return;
	}

	let association = this.getAssociationConfiguration(name);

	let value = data[association.options.localKey];

	// If no valid value is found for the associated key, do nothing
	if (value == null) {
		return;
	}

	let assoc_crit = assoc_model.find(),
	    assoc_key = association.options.foreignKey,
	    options = this.options,
	    select;

	if (Array.isArray(value)) {
		assoc_crit.where(assoc_key).in(value);
	} else {
		assoc_crit.where(assoc_key).equals(value);
	}

	assoc_crit.setOption('assoc_key', assoc_key);
	assoc_crit.setOption('assoc_value', value);

	// Make the assoc_cache if it doesn't exist yet
	if (options.create_references !== false && !options.assoc_cache) {
		options.assoc_cache = {};
	}

	// Add the assoc_cache
	if (options.assoc_cache) {
		assoc_crit.setOption('assoc_cache', options.assoc_cache);
	}

	// Take over the locale option
	if (options.locale) {
		assoc_crit.setOption('locale', options.locale);
	}

	// The debug object, if there is one
	if (options._debugObject) {
		assoc_crit.setOption('_debugObject', options._debugObject);
	}

	// Don't get the available count
	assoc_crit.setOption('available', false);

	if (options.select.associations && options.select.associations[name]) {
		select = options.select.associations[name];
		assoc_crit.options.select = select.cloneForCriteria(assoc_crit);
	}

	// Sort the results
	// @TODO: add sorts
	// if (query.sort && query.sort[alias]) {
	// 	assocOpts.sort = query.sort[alias];
	// }

	if (Number.isSafeInteger(options.recursive) && options.recursive > 0) {
		assoc_crit.recursive(options.recursive - 1);
	} else {
		// Disable recursiveness for the next level
		assoc_crit.recursive(0);
	}

	// Add the model name from where we're adding associated data
	assoc_crit.setOption('init_model', options.init_model || this.model.name);
	assoc_crit.setOption('init_record', options.init_record || item);

	assoc_crit.setOption('from_alias', options.for_alias);
	assoc_crit.setOption('from_model', options.for_model);

	assoc_crit.setOption('for_alias', name);
	assoc_crit.setOption('for_model', assoc_model.name);

	// Honor the original document option
	assoc_crit.setOption('document', options.document);

	if (options.debug) {
		assoc_crit.setOption('debug', true);
		console.log('Associated criteria:', assoc_model.name, assoc_crit);
	}

	return assoc_crit;
});

/**
 * Limit the amount of records to get
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.2.7
 *
 * @param    {number}   amount
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function limit(amount) {

	if (typeof amount != 'number') {
		amount = parseInt(amount);
	}

	this.options.limit = amount;
	return this;
});

/**
 * Skip an amount of records
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.2.7
 *
 * @param    {number}   amount
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function skip(amount) {

	if (typeof amount != 'number') {
		amount = parseInt(amount);
	}

	this.options.skip = amount;
	return this;
});

/**
 * Get a specific page
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.2.7
 *
 * @param    {number}   page        A 1-indexed page number
 * @param    {number}   page_size
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function page(page, page_size) {

	if (typeof page != 'number') {
		page = parseInt(page);
	}

	if (page_size && typeof page_size != 'number') {
		page_size = parseInt(page_size);
	}

	if (!page) {
		throw new Error('A page number is required');
	}

	if (!page_size || !isFinite(page_size)) {
		page_size = 10;
	}

	let skip = (page - 1) * page_size;

	this.options.page = page;
	this.options.page_size = page_size;

	this.skip(skip);
	return this.limit(page_size);
});

/**
 * Select a specific field or association
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.2.0
 *
 * @param    {string|Array}   field
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function select(field) {

	var context;

	if (Object.isIterable(field)) {
		let entry;

		for (entry of field) {
			context = this.select(entry);
		}
	} else {

		if (this._select) {
			context = this._select.parse(field);
		} else {
			context = this.options.select.parse(field);
		}
	}

	// Selects don't always change the context
	if (context) {
		return context;
	}

	return this;
});

/**
 * Add a specific association
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   alias
 *
 * @return   {Criteria}
 */
Criteria.setMethod(['contain', 'populate'], function populate(alias) {

	if (Array.isArray(alias)) {
		let i;

		for (i = 0; i < alias.length; i++) {
			this.populate(alias[i]);
		}
	} else {
		let select = this._select || this.options.select;

		select.addAssociation(alias);
	}

	return this;
});

/**
 * How deep can we go?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {number}   amount
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function recursive(amount) {
	this.options.recursive = amount;
	return this;
});


/**
 * Set the sort
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.4
 *
 * @param    {Array}   value
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function sort(value) {

	var result;

	if (value) {
		result = [];

		// Parse strings
		if (typeof value == 'string') {
			// When it contains a space, we expect something
			// like "_id asc"
			if (value.indexOf(' ') > -1) {
				result.push(value.split(' '));
			} else {
				// Sort ascending by default
				result.push([value, 1]);
			}
		} else if (Array.isArray(value)) {
			if (Array.isArray(value[0])) {
				result = value;
			} else {
				result.push(value);
			}
		} else {
			let keys = Object.keys(value),
			    key;

			if (keys.length == 2 && ~keys.indexOf('dir') && ~keys.indexOf('field')) {

				if (value.field && value.dir) {
					result.push([value.field, value.dir]);
				}

			} else {
				for (key in value) {
					result.push([key, value[key]]);
				}
			}
		}

		let entry,
		    i;

		for (i = 0; i < result.length; i++) {
			entry = result[i];

			if (typeof entry[1] == 'string') {
				entry[1] = entry[1].toLowerCase();

				if (entry[1] == 'asc') {
					entry[1] = 1;
				} else if (entry[1] == 'desc') {
					entry[1] = -1;
				} else {
					throw new Error('Unable to parse sort specification "' + entry[1] + '"');
				}
			}
		}

		// @TODO: implement better handling of ModelName.field sort stuff
		// (Because at this moment, it's just ignored!)
		for (entry of result) {
			if (entry[0].indexOf('.') > -1) {
				let pieces = entry[0].split('.'),
				    char = pieces[0][0];

				if (char == char.toUpperCase()) {
					pieces = pieces.slice(1);
				}

				entry[0] = pieces.join('.');
			}
		}

	} else {
		result = null;
	}

	this.options.sort = result;

	return this;
});

/**
 * Normalize the criteria by filling in some values on datasources without joins
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Pledge}
 */
Criteria.setMethod(function normalize() {

	if (!this.model) {
		return Pledge.reject(new Error('Unable to normalize criteria without model instance'));
	}

	let that = this,
	    tasks = [],
	    i;

	for (i = 0; i < this.all_expressions.length; i++) {
		let expression = this.all_expressions[i];

		if (!expression) {
			continue;
		}

		// Do we need to normalize association values?
		if (expression.requires_association_normalization) {
			tasks.push(function doNormalize(next) {
				expression.normalizeAssociationValues().done(next);
			});

			continue;
		}

		let pledge = expression.normalize();

		if (pledge) {
			tasks.push(pledge);
		}
	}

	return Function.parallel(4, tasks);
});

/**
 * Compile to MongoDB-like query
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Object}
 */
Criteria.setMethod(function compile() {

	if (!this.datasource) {
		throw new Error('Unable to compile criteria without a datasource target');
	}

	return this.datasource.compileCriteria(this);
});

/**
 * Parse an old, mongodb specific options object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object}   options
 *
 * @return   {Criteria}
 */
Criteria.setMethod(function applyOldOptions(options) {

	if (!options || Object.isEmpty(options)) {
		return this;
	}

	let entry,
	    key;

	for (key in options) {
		entry = options[key];

		switch (key) {
			case 'sort'      : this.sort(entry); break;
			case 'limit'     : this.limit(entry); break;
			case 'fields'    : this.select(entry); break;
			case 'select'    : this.select(entry); break;
			case 'recursive' : this.recursive(entry); break;
			case 'offset'    : this.skip(entry); break;
			case 'populate'  : this.populate(entry); break;

			case 'conditions':
				this.applyConditions(entry);
				break;

			default:
				this.setOption(key, entry);
		}
	}

	return this;
});

/**
 * The Criteria Select class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
var Select = Function.inherits('Alchemy.Base', 'Alchemy.Criteria', function Select(criteria) {
	// The parent criteria instance
	this.criteria = criteria;
});

/**
 * Revive the given object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.2.3
 *
 * @return   {Select}
 */
Select.setStatic(function revive(data, criteria) {

	if (!data) {
		return;
	}

	let result = new Select(criteria),
	    key;

	result.fields = data.fields;

	if (data.associations) {
		result.associations = {};

		for (key in data.associations) {
			result.associations[key] = Select.revive(data.associations[key], criteria);
		}
	}

	if (data.association_name) {
		result.association_name = data.association_name;
	}

	return result;
});

/**
 * Return object to jsonify
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Object}
 */
Select.setMethod(function toJSON() {
	return {
		association_name : this.association_name,
		associations     : this.associations,
		fields           : this.fields
	};
});

/**
 * Return the elements to checksum in place of this object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Select.setMethod(Blast.checksumSymbol, function toChecksum() {

	var result = [];

	if (this.associations) {
		result.push(this.associations);
	}

	if (this.fields) {
		result.push(this.fields);
	}

	if (this.association_name) {
		result.push(this.association_name);
	}

	if (!result.length) {
		return null;
	}

	return result;
});

/**
 * Add an association
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.3.4
 *
 * @param    {string}   name
 *
 * @return   {Select}   This creates a new Select instance
 */
Select.setMethod(function addAssociation(name) {

	if (!this.criteria?.model) {
		throw new Error('Unable to select an association: this Criteria has no model info');
	}

	var pieces;

	if (!this.associations) {
		this.associations = {};
	}

	if (Array.isArray(name)) {
		pieces = name;
	} else if (name.indexOf('.') > -1) {
		pieces = name.split('.');
	}

	if (pieces && pieces.length) {
		let context = this;

		while (pieces.length) {
			name = pieces.shift();
			context = context.addAssociation(name);
		}

		return context;
	}

	if (!this.associations[name]) {
		this.associations[name] = new Select(this.criteria);
		this.associations[name].association_name = name;
	}

	// Get the association data
	try {
		let info = this.criteria.model.getAssociation(name);

		if (info) {
			// Make sure the localkey is added to the resultset
			this.requireFieldForQuery(info.options.localKey);
		}
	} catch (err) {
		console.warn('Failed to find "' + name + '" association for ' + this.criteria.model.model_name);
	}

	return this.associations[name];
});

/**
 * Require a field for query purposes
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.0
 * @version  1.2.0
 *
 * @param    {string}   path
 */
Select.setMethod(function requireFieldForQuery(path) {

	if (!this.query_fields) {
		this.query_fields = [];
	}

	this.query_fields.push(path);
});

/**
 * Add a field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   path
 */
Select.setMethod(function addField(path) {

	if (!this.fields) {
		this.fields = [];
	}

	this.fields.push(path);
});

/**
 * Parse a path meant to add as a selection
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.2.0
 *
 * @param    {string|Object}   path
 *
 * @return   {Criteria|Null}   A criteria object if the context has changed
 */
Select.setMethod(function parse(path) {

	let context,
	    select = this,
	    parsed;

	if (typeof path == 'object' && path && path.name) {

		if (path.path) {
			path = path.path;
		} else {
			let obj = path;
			path = obj.name;

			if (obj.association) {
				path = obj.association + '.' + path;
			}
		}
	}

	parsed = Criteria.parsePath(path, this.criteria);

	// Associations were found,
	// like "Comment._id" or "Comment.User"
	if (parsed.association) {
		let name,
		    i;

		for (i = 0; i < parsed.association.length; i++) {
			name = parsed.association[i];

			if (this.model && this.model.name == name) {
				continue;
			}

			select = select.addAssociation(name);
		}
	}

	if (parsed.target_path) {
		select.addField(parsed.target_path);
	} else if (parsed.association) {
		// When only an association was given, then the context changes
		context = this.criteria.augment('select');
		context._select = select;
		return context;
	}
});

/**
 * Clone this select for the given criteria
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.2.0
 *
 * @param    {Criteria}   criteria
 *
 * @return   {Select}
 */
Select.setMethod(function cloneForCriteria(criteria) {

	var clone = new Select(criteria);

	if (this.association_name) {
		clone.association_name = this.association_name;
	}

	if (this.fields && this.fields.length) {
		clone.fields = this.fields.slice(0);
	}

	if (this.query_fields && this.query_fields.length) {
		clone.query_fields = this.query_fields.slice(0);
	}

	if (this.associations) {
		let key;

		clone.associations = {};

		for (key in this.associations) {
			clone.associations[key] = this.associations[key].cloneForCriteria(criteria);
		}
	}

	return clone;
});

/**
 * Should the given association be queried according to this select?
 * (The Criteria instance can also have a recursive level set)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   name
 *
 * @return   {boolean}
 */
Select.setMethod(function shouldQueryAssociation(name) {

	if (this.associations) {
		return !!this.associations[name];
	}

	return false;
});