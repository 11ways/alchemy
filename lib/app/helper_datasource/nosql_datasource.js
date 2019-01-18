/**
 * NoSQL Datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
var NoSQL = Function.inherits('Alchemy.Datasource', function Nosql(name, options) {
	Nosql.super.call(this, name, options);
});

/**
 * Compile criteria into a MongoDB query object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Criteria}   criteria
 *
 * @return   {Object}
 */
NoSQL.setMethod(function compileCriteria(criteria) {

	var assoc_model,
	    aggregate,
	    result = [],
	    entry,
	    assoc,
	    temp,
	    i;

	for (i = 0; i < criteria.group.items.length; i++) {
		entry = criteria.group.items[i];

		if (entry.association) {
			if (!aggregate) {
				aggregate = {
					pipeline: [],
					lookups: {}
				};
			}

			// Get the association info
			assoc = criteria.model.getAssociation(entry.association);

			if (result.length) {
				aggregate.pipeline.push({
					$match: {
						$and: result
					}
				});

				result = [];
			}

			if (!aggregate.lookups[assoc.alias]) {
				aggregate.lookups[assoc.alias] = true;
				assoc_model = Model.get(assoc.modelName);

				if (assoc.type == 'BelongsTo') {
					// Add a check so that we only get records that have a parent
					temp = {};
					temp[assoc.options.localKey] = {$ne: null};

					aggregate.pipeline.push({
						$match: temp
					});

					aggregate.pipeline.push({
						$lookup: {
							from         : assoc_model.table,
							localField   : assoc.options.localKey,
							foreignField : assoc.options.foreignKey,
							as           : assoc.alias
						}
					});
				} else if (assoc.type == 'HasMany') {

					aggregate.pipeline.push({
						$lookup: {
							from         : assoc_model.table,
							localField   : assoc.options.localKey,
							foreignField : assoc.options.foreignKey,
							as           : assoc.alias
						}
					});
				} else {
					throw new Error('No support for ' + assoc.type + ' association yet');
				}

				if (assoc.options.singular) {
					aggregate.pipeline.push({
						$unwind: '$' + assoc.alias
					});
				}
			}
		}

		if (entry.group_type) {
			let compiled_group = entry.criteria.compile(),
			    obj = {};

			if (compiled_group.$and) {
				compiled_group = compiled_group.$and;
			} else if (compiled_group.pipeline) {
				// @TODO: this won't work
				compiled_group = compiled_group.pipeline;
			} else {
				compiled_group = null;
			}

			if (compiled_group) {
				obj['$' + entry.group_type] = compiled_group;
				result.push(obj);
			}
		} else {
			let item,
			    not,
			    obj = {};

			for (let i = 0; i < entry.items.length; i++) {
				item = entry.items[i];

				if (item.type == 'ne') {
					obj.$ne = item.value;
				} else if (item.type == 'not') {
					if (typeof item.value == 'undefined') {
						not = true;
						continue;
					} else {
						obj.$not = item.value;
					}
				} else if (item.type == 'equals') {
					obj = item.value;
				} else if (item.type == 'contains') {
					obj = RegExp.interpret(item.value);
				} else if (item.type == 'in') {
					obj = {$in: item.value};
				} else if (item.type == 'gt' || item.type == 'gte' || item.type == 'lt' || item.type == 'lte') {
					obj['$' + item.type] = item.value;
				} else if (item.type == 'exists') {
					if (item.value || item.value == null) {
						obj.$exists = true;
					} else {
						obj.$exists = false;
					}
				} else {
					throw new Error('Unknown criteria expression: "' + item.type + '"');
				}

				if (not) {
					not = false;
					obj = {$not: obj};
				}

				let field_entry = {},
				    name = entry.target_path;

				if (entry.association) {
					name = entry.association + '.' + name;
				}

				field_entry[name] = obj;

				result.push(field_entry);
			}
		}
	}

	if (aggregate) {

		if (result.length) {
			aggregate.pipeline.push({
				$match: {
					$and: result
				}
			});
		}

		return aggregate;
	}

	if (!result.length) {
		return {};
	}

	return {$and: result};
});


/**
 * Get the MongoDB options from this criteria
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Criteria}   criteria
 *
 * @return   {Object}
 */
NoSQL.setMethod(function compileCriteriaOptions(criteria) {

	var result = {},
	    fields = criteria.getFieldsToSelect();

	if (fields.length) {
		result.fields = fields;
	} else {
		result.fields = null;
	}

	if (criteria.options.sort) {
		result.sort = criteria.options.sort;
	}

	if (criteria.options.skip) {
		result.offset = criteria.options.skip;
	}

	if (criteria.options.limit) {
		result.limit = criteria.options.limit;
	}

	return result;
});

/**
 * Handle items from the datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Model}   model
 * @param    {Array}   rows
 *
 * @return   {Array}
 */
NoSQL.setMethod(function organizeResultItems(model, rows) {

	var associations = model.associations,
	    result = [],
	    main,
	    row,
	    set,
	    key,
	    i;

	for (i = 0; i < rows.length; i++) {
		row = rows[i];
		main = {};
		set = {};

		for (key in row) {
			if (associations[key] != null) {
				set[key] = row[key];
			} else {
				main[key] = row[key];
			}
		}

		set[model.name] = main;
		result.push(set);
	}

	return result;
});