# AlchemyMVC Development Guide

## Commands
- Run tests: `npm test`
- Run with coverage: `npm run coverage`
- Tests require: `--file test/00-init.js` flag (already in npm scripts)

## Global Variables

These are available everywhere without require/import - injected by Protoblast and Alchemy:

**Core:**
- `alchemy` - Main singleton instance
- `Blast` - Protoblast instance
- `Classes` - All registered classes (e.g., `Classes.Alchemy.Model.Model`)
- `Model`, `Router`, `Controller`, `Conduit`, `Behaviour` - Base classes
- `STAGES` - Bootstrap stages system
- `log` - Logging function

**Paths:**
- `PATH_ROOT`, `PATH_APP`, `PATH_TEMP`, `PATH_CORE`

**Types:**
- `LocalDateTime`, `LocalDate`, `LocalTime`
- `Decimal`, `FixedDecimal`, `MutableDecimal`, `MutableFixedDecimal`

**Utilities:**
- `DEFINE(name, value)` - Create a global constant
- `DEFINE_CLIENT(name, value)` - Global available in browser too

## Class System

Classes use `Function.inherits()` from Protoblast, not ES6 classes:

```javascript
// Create a class: Function.inherits(parent, namespace, name)
const MyClass = Function.inherits('Alchemy.Base', 'Alchemy', function MyClass() {});

// Add instance method - function name becomes method name
MyClass.setMethod(function doSomething(arg) {
	return arg * 2;
});

// Add static method
MyClass.setStatic(function create(options) {
	return new this(options);
});

// Add property getter/setter
MyClass.setProperty(function myProp() {
	return this._myProp;
}, function(value) {
	this._myProp = value;
});

// Lazy-initialized property
MyClass.prepareProperty('cache', function() {
	return new Map();
});

// Deferred setup (runs after class hierarchy is ready)
MyClass.constitute(function setup() {
	// Add schema fields, configure behaviours, etc.
});
```

## Project Structure

```
lib/
├── bootstrap.js        # Entry point
├── class/              # Core abstract classes
│   ├── model.js        # Model base class
│   ├── datasource.js   # Datasource base class
│   ├── controller.js   # Controller base class
│   ├── document.js     # Document base class
│   ├── field.js        # Field base class
│   ├── schema.js       # Schema class
│   └── router.js       # Router singleton
├── app/                # Application layer
│   ├── datasource/         # Concrete datasources (mongo, idb)
│   ├── helper_datasource/  # Datasource base classes (00-nosql)
│   ├── helper_model/       # Model helpers (client + server)
│   ├── helper_field/       # Field type implementations
│   ├── model/              # System models
│   └── behaviour/          # Model behaviours
├── core/               # Core framework
│   ├── alchemy.js          # Server Alchemy class
│   ├── client_alchemy.js   # Client Alchemy class
│   ├── base.js             # Base class for all Alchemy classes
│   └── stage.js            # Stages system
├── stages/             # Bootstrap stages (numbered 00-90)
└── scripts/            # Init scripts, constants
```

**File load order:** Files prefixed with numbers load in order: `00-base.js` before `05-child.js` before `10-impl.js`

## Models & Schema

```javascript
const Employee = Function.inherits('Alchemy.Model', function Employee(options) {
	Employee.super.call(this, options);
});

// Schema MUST be defined in constitute()
Employee.constitute(function addFields() {
	// Relationships
	this.belongsTo('User');
	this.belongsTo('DefaultLocation', 'WorkingLocation');  // alias, model
	this.hasMany('TimeEntry');

	// Fields
	this.addField('firstname', 'String');
	this.addField('status', 'Enum', {values: {active: 'Active', inactive: 'Inactive'}});
	this.addField('hourly_rate', 'FixedDecimal', {scale: 2});
});

// Model method - receives doc as parameter
Employee.setMethod(async function beforeSave(doc, options) {
	doc.updated_by = options.conduit?.session('UserData')?.$pk;
});

// Document method - `this` is the document instance
Employee.setDocumentMethod(async function getFullName() {
	return this.firstname + ' ' + this.lastname;
});
```

## Criteria (Database Queries)

```javascript
let crit = Model.find();

// Conditions
crit.where('status').equals('active');
crit.where('date').gte(start_date).lte(end_date);
crit.where('field').isEmpty();
crit.where('field').not().isEmpty();
crit.where('_id').in(array_of_ids);

// Options
crit.sort(['date', 'desc']);
crit.limit(10);
crit.skip(20);
crit.select(['field1', 'field2']);
crit.populate('Employee');
crit.populate(['Project', 'TaskType']);

// Execute
let records = await Model.find('all', crit);
let single = await Model.find('first', crit);
let count = await Model.find('count', crit);
```

**Field-to-field comparisons not supported** - fetch and filter in JS:
```javascript
let records = await Model.find('all', crit);
records = records.filter(r => r.updated > r.last_sync);
```

## Routes

Routes are defined in `app/config/routes.js` using the global `Router`:

```javascript
// Basic route - name determines Controller#action
Router.add({
	name    : 'Person#view',
	paths   : '/person/{id}',
	methods : 'get',
});

// Explicit handler
Router.add({
	name    : 'PersonList',
	handler : 'Person#list',
	paths   : '/people',
	methods : ['get', 'post'],
});

// With permission requirement
Router.add({
	name       : 'Person#edit',
	paths      : '/person/{id}/edit',
	permission : 'person.edit',
});

// Auto-fetch document - {[Model]param} fetches and passes document to action
Router.add({
	name  : 'Person#view',
	paths : '/person/{[Person]id}',  // `id` param will be a Person document
});

// Shorthand for POST
Router.post('Person#create', '/api/person');

// Route sections (grouping with shared prefix/permissions)
let api = Router.section('api', '/api');
api.requirePermission('api.access');
api.add({
	name  : 'Api#list',
	paths : '/list',  // Results in /api/list
});
```

**Path parameters:**
- `{param}` - Simple parameter, passed as string
- `{[Model]param}` - Auto-fetches document by `_id`, passes document to action
- `{[Model.field]param}` - Auto-fetches document by specified field (e.g., slug)

**Getting URLs:**
```javascript
alchemy.routeUrl('Person#view', {id: '123'});
Router.getUrl('Person#view', {id: '123'});
```

## Controllers

```javascript
const Person = Function.inherits('Alchemy.Controller', function Person(conduit, options) {
	Person.super.call(this, conduit, options);
});

// Define an action - function name becomes action name
Person.setAction(function view(conduit, id) {
	let Person = this.getModel('Person');
	let person = await Person.findByPk(id);

	this.set('person', person);      // Set template variable
	this.render('person/view');       // Render template
});

// Or respond with JSON
Person.setAction(async function apiList(conduit) {
	let records = await this.getModel('Person').find('all');
	conduit.end(records);             // JSON response
});
```

**Conduit methods:** `conduit.param('name')`, `conduit.session('key')`, `conduit.end(data)`, `conduit.redirect(url)`, `conduit.notFound()`, `conduit.error(err)`

## Tasks

Background tasks with optional cron scheduling (`app/task/`):

```javascript
const MyTask = Function.inherits('Alchemy.Task', 'MyTask');

// Optional: forced cron schedule
MyTask.addForcedCronSchedule('0 2 * * *', {setting: 'value'});

// Task schema for settings
MyTask.constitute(function setSchema() {
	this.schema.addField('some_setting', 'String');
});

// Main execution
MyTask.setMethod(async function run() {
	this.report('Starting...');
	// Do work...
	this.report({progress: 50, message: 'Halfway'});
});
```

Tasks stored in `System.Task` model, history in `System.TaskHistory`.

## Field Types

Built-in field types (`lib/app/helper_field/`):
- **Basic:** `String`, `Text`, `Integer`, `Number`, `Boolean`, `Enum`
- **Date/Time:** `Date`, `Datetime`, `LocalDate`, `LocalTime`, `LocalDateTime`
- **Numeric:** `Decimal`, `FixedDecimal`, `BigInt`
- **Special:** `ObjectId`, `Password`, `Html`, `Url`, `Geopoint`, `Mixed`, `Object`
- **Relations:** `BelongsTo`, `HasMany`, `HABTM` (HasAndBelongsToMany)
- **Nested:** `Schema` (embedded sub-schema via `alchemy.createSchema()`)

## Behaviours

Model behaviours (`lib/app/behaviour/`):
- **Sluggable** - Auto-generates URL slugs from fields
- **Publishable** - Adds publish/unpublish workflow
- **Revision** - Tracks document revisions

```javascript
MyModel.constitute(function addFields() {
	this.addBehaviour('Sluggable', {source: 'title'});
});
```

## Schema

Standalone schemas for nested fields:

```javascript
let address = alchemy.createSchema();
address.addField('street', 'String');
address.addField('city', 'String');

MyModel.constitute(function() {
	this.addField('address', 'Schema', {schema: address});
	// or shorthand:
	this.addField('address', address);
});
```

## Documents

Model records are `Document` instances with methods like:
- `doc.save()` - Persist changes
- `doc.$pk` - Primary key value
- `doc.$model` - Model reference
- `doc.hasChanged('field')` - Check for modifications
- `doc.revert()` - Revert unsaved changes

`DocumentList` is an array-like collection of documents returned by `find('all')`.

## Linkups (WebSockets)

Real-time bidirectional connections:

```javascript
// In routes.js
Router.linkup('Chat#connection', 'chatlink', 'Chat#linkup');

// In controller
Chat.setAction(function linkup(conduit, linkup) {
	linkup.on('message', data => { /* handle */ });
	linkup.submit('welcome', {msg: 'Connected'});
});
```

## Browser-Available Code

Code in these folders is available on both server AND client (browser):
- `app/helper/` - General helper classes
- `app/helper_model/` - Document methods added to models
- `app/element/` - Custom elements

**Model schemas vs document methods:**

Model schemas (fields, types, associations) defined in `app/model/` are automatically available in the browser - the schema is serialized and sent to the client.

However, `setDocumentMethod()` methods are NOT sent to the client:
- `app/model/` - Document methods are **server-side only**
- `app/helper_model/` - Document methods are **available in browser too**

Use `helper_model/` when:
- The document method is called in a `.hwk` template
- The document method is used in an element's client-side JavaScript
- The document method needs to work after client-side navigation

```javascript
// app/helper_model/employee_model.js
const Employee = Blast.Classes.Hawkejs.Model.getClass('Employee');

Employee.setDocumentMethod(function isAvailableOn(date) {
	// This method is now available in templates on both server and client
	return true;
});
```

## Other Features

- **Migrations** (`lib/class/migration.js`) - Database migrations via `System.Migration` model
- **Plugins** (`lib/class/plugin.js`) - Extend Alchemy with `alchemy.usePlugin()`
- **Sessions** (`lib/class/session.js`) - `conduit.session(key, value)`
- **Validators** (`lib/app/helper_validator/`) - Field validation, e.g., `NotEmpty`
- **Sitemap** (`lib/class/sitemap.js`) - Auto-generated sitemap from routes
- **Conduit** (`lib/class/conduit.js`) - HTTP/Socket request wrapper

## Datasource Architecture

The MongoDB datasource (`lib/app/datasource/mongo_datasource.js`) has two query paths in `_read()`:

1. **Pipeline path** - When `criteria.getAssociationsToSelect()` returns associations, uses MongoDB aggregation with `$lookup` for efficient joins
2. **Simple path** - Basic `collection.find()` for queries without associations

Key methods:
- `compileCriteria()` - Converts Criteria to MongoDB query/pipeline
- `organizeResultItems()` - Restructures `$lookup` results into document format

## Key APIs

```javascript
// Log warnings only once (avoid log spam)
alchemy.distinctProblem('unique-id', 'Warning message', {repeat_after: 60000});

// Get association config
let assoc = Model.getAssociation('Project');  // Returns {type, modelName, options}

// Check what associations are being populated
let associations = criteria.getAssociationsToSelect();  // Returns object or undefined

// Access settings
alchemy.settings.network.port
alchemy.setSetting('category.name', value);
```

## Testing

- Framework: Mocha + mongo-unit + Puppeteer
- Tests are numbered and run sequentially
- **Important:** `03-model.js` defines Person, Project, etc. used by later tests
- Run individual test: `mocha --file test/00-init.js test/05-criteria.js`

## Bootstrap / Stages

Stages execute in order (see `lib/stages/`):
1. `load_core` - Load core classes
2. `load_app` - Load app files (core_app → plugins → main_app)
3. `datasource` - Initialize datasources
4. `tasks` - Setup task system
5. `settings` - Load settings
6. `routes` - Register routes
7. `server` - Start HTTP server

Add custom initialization:
```javascript
STAGES.getStage('datasource').addPostTask(() => {
    // Runs after datasource stage completes
});
```

## Gotchas

1. **`this.getModel()` vs `Model.get()`:**
   ```javascript
   // In a controller/model - USE THIS:
   let Employee = this.getModel('Employee');
   // - Attaches current conduit (request context, session, permissions)
   // - Caches instance per object
   // - beforeSave can access options.conduit.session('UserData')

   // AVOID in controllers:
   let Employee = Model.get('Employee');
   // - No conduit attached - loses request context
   // - Creates new instance every time
   // - Only use in standalone scripts or when you explicitly don't want conduit
   ```

2. **constitute() timing:** Schema fields must be added in `constitute()`, not constructor - this ensures proper class hierarchy setup

3. **Class access patterns:**
   ```javascript
   this.getModel('Employee')          // In controllers/models - preferred
   Model.get('Employee')              // Standalone instance (no conduit)
   Model.get('Employee', false)       // Get the class, not an instance
   Classes.Alchemy.Model.Employee     // Direct class access
   ```

4. **Criteria is mutable:** Methods like `where()`, `sort()` modify the criteria in place and return `this` for chaining
