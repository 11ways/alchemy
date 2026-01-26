# AlchemyMVC Development Guide

## Dependencies

@node_modules/hawkejs/CLAUDE.md

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
// Create a class: Function.inherits(parent, name)
const MyClass = Function.inherits('Alchemy.Base', function MyClass() {});

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

## Namespaces

**IMPORTANT:** To create classes in a namespace, you must FIRST create the namespace base class.

```javascript
// WRONG - This creates a class literally named "MyNamespace.MyClass"
const MyClass = Function.inherits('Alchemy.Base', 'MyNamespace.MyClass');

// CORRECT - First create the namespace base class
// This creates Classes.Alchemy.MyNamespace.MyNamespace
const MyNamespace = Function.inherits('Alchemy.Base', 'Alchemy.MyNamespace', 'MyNamespace');

// Then inherit from it - creates Classes.Alchemy.MyNamespace.MyClass
const MyClass = Function.inherits('Alchemy.MyNamespace', function MyClass() {});
```

For Models specifically:
```javascript
// First create the namespace base model (in 00_my_namespace_model.js)
const MyNamespace = Function.inherits('Alchemy.Model.App', 'Alchemy.Model.MyNamespace', 'MyNamespace');

// Then create models in that namespace
const MyModel = Function.inherits('Alchemy.Model.MyNamespace', 'MyModel');
// Results in: Classes.Alchemy.Model.MyNamespace.MyModel
// Model name: MyNamespace_MyModel
```

The three-argument form `Function.inherits(parent, namespace, name)` is used to CREATE a namespace. The two-argument form inherits INTO an existing namespace.

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

## Class Group Pattern

For polymorphic types where child classes define their own schemas:

```javascript
// Abstract base class (app/lib/time_off/00-time_off.js)
const TimeOff = Function.inherits('Alchemy.Base', 'MyNamespace.TimeOff', function TimeOff() {});
TimeOff.makeAbstractClass();
TimeOff.constitute(function setSchema() {
	this.schema = alchemy.createSchema();
	this.schema.addField('hours', 'Number');
});

// Child class - automatically gets type_name: 'official_vacation'
const OfficialVacation = Function.inherits('MyNamespace.TimeOff.TimeOff', function OfficialVacation() {});
OfficialVacation.constitute(function setSchema() {
	this.schema.addField('days_per_year', 'Integer');
});

// In model - enum from descendants, dynamic schema based on selection
this.addField('type', 'Enum', {values: Classes.MyNamespace.TimeOff.TimeOff.getDescendantsDict()});
this.addField('settings', 'Schema', {schema: 'type'});
```

**Key methods:**
- `ParentClass.getDescendantsDict()` - Enum map of all child classes
- `ParentClass.getDescendant(type_name)` - Get child class by type_name

**Legacy pattern (don't use for new code, but leave it for old code):**
```javascript
Site.makeAbstractClass();
Site.startNewGroup('site_type');  // Creates named group

// In model:
let site_types = alchemy.getClassGroup('site_type');
this.addField('site_type', 'Enum', {values: site_types});
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

## Server → Client Data Flow (toHawkejs)

When Documents and other Alchemy objects are passed to Hawkejs templates, they go through a two-phase transformation:

### Phase 1: toHawkejs (Preparation)

Hawkejs calls `JSON.clone(obj, 'toHawkejs')` on all template variables BEFORE rendering. This transforms server-only classes into client-safe versions.

**Classes with toHawkejs implementations:**

| Class | What it does |
|-------|--------------|
| `Document` | Creates Client Document, clones `$record` and `$options` |
| `DocumentList` | Clones all records, preserves list metadata |
| `Schema` | Clones fields and associations for client use |
| `Field` | Clones field configuration and schema |
| `EnumMap` | Clones enum values with their schemas |

### Phase 2: toDry (Serialization)

After rendering, `JSON.dry()` serializes the prepared objects to JSON for transport. On the client, `JSON.undry()` reconstructs them.

**Classes with toDry/unDry implementations:**

| Class | Where unDry is |
|-------|---------------|
| `Client.Document` | `lib/app/helper_model/document.js` |
| `Client.Schema` | `lib/class/schema_client.js` |

### Document Flow Example

```
Server Document (lib/class/document.js)
    ↓ toHawkejs()
Client Document (lib/app/helper_model/document.js) [server-side instance]
    ↓ toDry()
JSON string
    ↓ [sent to browser]
    ↓ unDry()
Client Document (browser instance)
```

### Why Two Phases?

1. **toHawkejs** handles class transformation (Server → Client class)
2. **toDry** handles serialization (Object → String)

This separation allows:
- Server-only code to be stripped before serialization
- Different class hierarchies on server vs client
- Reference preservation across complex object graphs

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
- `app/helper_field/` - Custom field types
- `app/helper_datasource/` - Datasource helpers
- `app/element/` - Custom elements

**CRITICAL: `app/lib/` is server-only!**

Despite intuitive naming, `app/lib/client/` is NOT sent to the browser:
```
app/lib/           → Server-only (loaded via Blast.require)
app/lib/client/    → Server-only! NOT sent to browser!
app/helper/        → Both server AND client (loaded via hawkejs.load)
app/element/       → Both server AND client
```

For client-side classes, put them in `app/helper/` with a server guard:
```javascript
// app/helper/my_client_class.js

// Skip execution on server - this class is client-only
if (Blast.isNode) {
    return;
}

const MyClientClass = Function.inherits('Informer', 'MyNamespace', function MyClientClass() {
    MyClientClass.super.call(this);
});
```

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

### Datasource Method Signatures (1.4.0+)

All CRUD methods receive an `OperationalContext` object instead of individual parameters:

```javascript
// Read - must return {rows, available}
_read(context) -> Pledge<{rows: Array, available: number|null}>

// Create - returns saved data
_create(context) -> Pledge<Object>

// Update - returns updated data  
_update(context) -> Pledge<Object>

// Remove - returns success boolean
_remove(context) -> Pledge<boolean>
```

### Context Object Methods

**ReadDocumentFromDatasource** (for `_read`):
- `context.getModel()` - Get the model instance
- `context.getCriteria()` - Get the Criteria object
- `context.getDatasource()` - Get the datasource instance

**SaveToDatasource** (for `_create`, `_update`):
- `context.getModel()` - Get the model instance
- `context.getConvertedData()` - Get data already converted for datasource
- `context.getSaveOptions()` - Get options like `{override_created: bool}`

**RemoveFromDatasource** (for `_remove`):
- `context.getModel()` - Get the model instance
- `context.getQuery()` - Get the query object (e.g., `{_id: '...'}`)

### compileCriteria() Return Values

The `compileCriteria()` method from the Nosql base class can return:
1. **Plain query object** `{field: value}` - for simple queries
2. **Pipeline object** with `.pipeline` property - when associations require MongoDB aggregation

Datasources that don't support aggregation should check for `.pipeline` and handle gracefully.

### Swift.waterfall() Pattern

Datasource methods typically use this pattern for chaining async operations:

```javascript
return Swift.waterfall(
    this.collection(model.table),
    async collection => {
        // work with collection
        return result;
    }
);
```

## Key APIs

```javascript
// Log warnings only once (avoid log spam)
// Options: repeat_after (ms), error (Error object), register_error (bool)
alchemy.distinctProblem('unique-id', 'Warning message', {repeat_after: 60000});

// Log AND report to error tracking services (Sentry, Glitchtip)
// Use register_error: true to also call registerError()
alchemy.distinctProblem('error-id', 'Error message', {
    error: err,
    repeat_after: 60000,
    register_error: true  // Also sends to Sentry/Glitchtip
});

// Register errors directly with error tracking services (Sentry, Glitchtip)
// Use this in catch blocks for errors that should always be reported
alchemy.registerError(err, {context: 'Description of what failed'});

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

1. **Conduit header access uses lowercase keys:**
   ```javascript
   conduit.headers['x-custom-header']  // Always lowercase, regardless of HTTP request casing
   ```

2. **Setting HTTP status code - use property assignment:**
   ```javascript
   conduit.status = 401;  // Correct
   // There is no setter method like conduit.setStatus()
   ```

3. **`alchemy.system_settings.getPath()` returns SettingValue, not raw value:**
   ```javascript
   let setting = alchemy.system_settings.getPath('some.path');
   let value = setting.get();  // Must call .get() to extract actual value
   ```

4. **`globalThis.alchemy` vs bare `alchemy` in early-loading code:**
   ```javascript
   // In code that may run before alchemy is defined:
   globalThis.alchemy?.doSomething();  // Safe
   alchemy?.doSomething();             // ReferenceError if alchemy not defined yet
   // Optional chaining doesn't protect against undeclared variables
   ```

5. **`this.getModel()` vs `Model.get()`:**
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

6. **constitute() timing:** Schema fields must be added in `constitute()`, not constructor - this ensures proper class hierarchy setup

7. **Class access patterns:**
   ```javascript
   this.getModel('Employee')          // In controllers/models - preferred
   Model.get('Employee')              // Standalone instance (no conduit)
   Model.get('Employee', false)       // Get the class, not an instance
   Classes.Alchemy.Model.Employee     // Direct class access
   ```

8. **Criteria is mutable:** Methods like `where()`, `sort()` modify the criteria in place and return `this` for chaining

9. **toHawkejs vs toDry:** `toHawkejs` transforms classes (Server→Client Document) during cloning; `toDry` serializes to JSON string. They serve different purposes and both are needed

10. **Client Document location:** Client Document class is in `lib/app/helper_model/document.js` (shared server+client), not `lib/class/document.js` (server-only)

## AI Development Mode

AI devmode provides debug endpoints for development. **Never use in production.**

### Starting

```bash
# Using alchemy-dev (recommended)
alchemy-dev start    # Starts with --ai-devmode flag automatically

# Manual
node server.js --ai-devmode
```

### Endpoints

All endpoints are under `/_dev/`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/_dev/health` | GET | Health check - returns status, uptime, memory |
| `/_dev/login` | GET | Auto-login as first user (sets session cookie) |
| `/_dev/inspect` | POST | Server-side REPL - evaluate expressions |
| `/_dev/document/:model/:id` | GET | Introspect a document |
| `/_dev/logs` | GET | Recent log entries |

### Usage Examples

```bash
# Check if server is ready
curl https://myapp.dev.example.com/_dev/health

# Auto-login (save cookies for subsequent requests)
curl -c cookies.txt https://myapp.dev.example.com/_dev/login

# Evaluate an expression
curl -X POST -H "Content-Type: application/json" \
  -d '{"expr": "alchemy.settings.name"}' \
  https://myapp.dev.example.com/_dev/inspect

# Inspect a document
curl https://myapp.dev.example.com/_dev/document/User/52efff0000a1c00000000000
```

### Security

- Only enabled via `--ai-devmode` CLI flag (cannot be enabled via config/database)
- Flag is stored on `alchemy.ai_devmode_enabled` (not in settings)
- Endpoints have NO authentication - anyone can access them
- **Never expose to public networks**
- Requests require tokens, this is handled in the `alchemy-dev` tool automatically
