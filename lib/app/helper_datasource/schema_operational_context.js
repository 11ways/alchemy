/**
 * The Schema OperationalContext class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const SchemaContext = Function.inherits('Alchemy.OperationalContext.DatasourceOperationalContext', 'Schema');

/**
 * Set the path to the schema we want
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   sub_schema_path
 */
SchemaContext.setContextProperty('sub_schema_path');

/**
 * Current association info
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   association
 */
SchemaContext.setContextProperty('association');

/**
 * The path to a value, a property name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   value_property_name
 */
SchemaContext.setContextProperty('value_property_name');

/**
 * The current local value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   local_value
 */
SchemaContext.setContextProperty('local_value');

/**
 * The remote model name (for remote schema resolution)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   remote_model_name
 */
SchemaContext.setContextProperty('remote_model_name');

/**
 * The remote foreign key (for remote schema resolution)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   remote_foreign_key
 */
SchemaContext.setContextProperty('remote_foreign_key');

/**
 * The external field (for remote schema resolution)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Field.Schema}   external_field
 */
SchemaContext.setContextProperty('external_field');

/**
 * "Our field name", from the perspective of `resolveRemoteSchemaRequest`
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Field.Schema}   our_field_name
 */
SchemaContext.setContextProperty('our_field_name');

/**
 * "Our field value", from the perspective of `resolveRemoteSchemaRequest`
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*}   our_field_value
 */
SchemaContext.setContextProperty('our_field_value');