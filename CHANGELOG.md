## 1.3.6 (WIP)

* Don't retrieve sessions via browser fingerprint
* Let helper method `Router#routeConfig()` return early when no name is given
* Only call `Field#checkIndexes()` when it's attached to a schema
* Turn MongoDB write errors into violations
* Add `BigInt` field
* Properly parse class paths in `PathParamDefinition`
* Make sure redirects to an external website are turned into hard redirects
* Fix `Sitemap#getXmlBuilder()` and add `prefix` parameter

## 1.3.5 (2023-02-12)

* Upgrade `socket.io` dependencies
* Upgrade `mocha` dependency
* Upgrade `formidable` dependency (but stay on `v2.1.x`)
* Upgrade `terser` dependency to `v5.16.3`
* Show a default listening-url when starting with a port number
* Fix some issues on the default info page

## 1.3.4 (2023-02-11)

* Add XML generation support to the `Sitemap` class
* Log error instances during request handling on development environments
* Throw an error when trying to select an association on a `Criteria` without an attached model
* Allow disabling minification of certain javascript client files using `@alchemy.minify.false` annotation
* Allow supplying a model instance to a new Criteria on init
* Fix `DocumentList` instances having the wrong number of `available` records
* Add relationship methods to the client-side `Schema` class too

## 1.3.3 (2023-01-30)

* Add `fallback` option to `Document#getDisplayFieldValue(options)`, so it can return null if no useful value is available
* Don't add sitemap entries without a valid title
* Fix validation throwing an error when checking unexisting nested values
* Actually use `source_map` setting

## 1.3.2 (2023-01-24)

* Fix calling non-existing `next()` method in the client-side Base class
* Only expire postponements after 3 minutes instead of 30 seconds
* Handle postponement expiry better
* Rename `toobusy` setting to `max_event_loop_lag`
* Add `max_system_load` setting
* Add `Alchemy#addToobusyCheck(fnc)` to add more methods to check toobusy status with

## 1.3.1 (2023-01-23)

* Catch errors when cloning current document data
* Fix bug where SchemaField schema can't be processed properly
* Add `Field#getOptionsForDrying()` method
* Fix SchemaField & Enum schema nesting issues
* Fix nested `SchemaField` not being processed correctly
* Also set the `primary_key` and `display_field` property on client-side Model classes
* Fix client-side model inheritance order issues
* Let the `Router` directive also check an element's internal variables for route parameters
* Let migrations handle raw datasource data
* Upgrade protoblast to version 0.8.0
* Upgrade hawkejs to version 2.3.0
* Add `Types` and `Classes` global on the client-side
* Statically expose the `alchemy_layout` settings
* Only log 404 errors when on a development environment
* Implement method signature for `Validator#validateFieldValue()`
* Rename `Conduit#postpone()` to `Conduit#postponeResponse()`
* Add `Conduit#postponeRequest()` to also delay the processing of the request
* Fix `ip` property of `Socket` conduit
* Add `lagInMs()`, `isTooBusy()` and `isTooBusyForAjax()` methods to the `Alchemy` class
* Add `lag_menu` setting, which will display the current lag as a Janeway menu item
* Add the `can_be_postponed` option to routes
* Automatically postpone requests when the server becomes too busy
* Add the `Postponement` class
* Put new requests in a queue when the server becomes too busy
* Show simple error text messages when the server is too busy
* Add `Alchemy#systemLoad()` method to get the total system load as a percentage
* Add `Alchemy#http_request_counter` property to keep track of the total number of requests
* Add `Postponement.total_postponement_counter` property getter to keep track of the total number of queued requests
* Add the `postpone_requests_on_overload` setting
* Fix `Alchemy#distinctProblem()` still being too verbose

## 1.3.0 (2022-12-23)

* Add `Inode.from(path)` to get the correct Inode instance
* Add `File#getHash()` and `File#getMimetype()` methods
* Add `Alchemy#download()` method and deprecate `Alchemy#downloadFile()`
* Add `file_hash_algorithm` setting
* Only set `content-type` when serving files if it's not empty
* Fix field rules being added twice when a schema was unserialized
* Add `setResponseUrl(new_url)` method to `Conduit` and `Controller`, and deprecate `Conduit#overrideResponseUrl(new_url)`
* Improve mimetype detection and move it to `File.getMimetype()`
* Add `File#createReadStream()`
* Make `Blast.Types` available as the global `Types` variable
* Manually set the mimetype of served css & javascript middleware files, so Magic doesn't have to be used
* JavaScript mimetype is now `text/javascript` instead of `application/javascript`
* Allow specifying a prefix to `Document#getDisplayFieldValue()` in case it's not translated yet
* Fix translatable field values always being queried for *any* translation instead of a specific one
* Add `has_translatable_fields` property to `Model` and `Schema`
* Add `title` property to routes
* Make the helper `Router#routeUrl()` method work without a renderer on the server side
* Rewrite `Conduit#serveFile()` using Protoblast's new typed method support
* Add `Sitemap` class for automatically generating a sitemap based on available routes
* Fix querying on a specific property of a datetime field that seperately stores its units
* Regenerate exposed route data when new routes have been added after initial generation
* Add `Conduit#setRouteParameters(parameters)` so that route parameters can be updated instead of totally replaced
* Set a default `locale` option for new `Criteria` instances when a `Conduit` is available
* Fix translatable field values not being queried correctly
* Add a `description` getter to the `Field` class
* Add `Router#isLocalUrl(url)` method to the Router helper
* Make the `Base#issueEvent()` method return a pledge
* Rewrite route parameter parsing
* Add the `option` argument to the `Alchemy#routeUrl()` method, so the prefix/locale can be set
* Let a `PathDefinition` instance know what prefix it is for
* Add the `Document#getTranslatedValueOfField()` method, which will re-query the database for translations
* Refactor the `Route#callController()` and `Route#callControllerAssignments()` methods
* Add the `visible_location` property to `Route` instances
* Eagerly supply translated route parameter values for the language switcher
* Don't use urls with missing parameters in the language switcher
* Set the response url using the `visible_location` route property if it's set
* Add support for the new `getDescendant(name)` class method of Protoblast to the `getMember()` class method
* Re-check the mimetype of uploaded files, because browsers lie
* Always store the original document's record if it contains object fields
* Accept paths in `Document#hasChanged(name)`
* Fix `Document#hasChanged()` methods reporting wrong value in `Model#beforeSave()` methods
* Don't log missing schema warnings when not debugging
* Add the `FieldSet#clear()` method to remove all added fields
* Add `Alchemy#distinctProblem(id, message, options)` logger
* Fix serving dependency files breaking after the first serve

## 1.2.8 (2022-11-13)

* Fix the info view

## 1.2.7 (2022-11-02)

* Fix uploaded files breaking since last `formidable` upgrade
* Rename `Model#displayField` property to `Model#display_field`
* Also make `Model#getDisplayTitle()` method available for client-side models
* Fix `Router` directive marking every link as being the active link
* Also use the `Conduit#active_prefix` property for translating items
* Add `allow_fallback_translations` alchemy setting and set it to false by default
* Add `Conduit#routeUrl()` method (fixes loopback urls using wrong prefix)
* Log errors thrown during plugin stage
* Make `Alchemy#findModule()` module_dir result actually return the directory of the module
* Make style middleware call the next middleware function when no style is found
* Add available methods to client-side routes data
* Make `Alchemy#getResource` helper method check available methods first
* Remove `Base.makeAbstractClass()` method, it's part of Protoblast now
* Add support for reloading Janeway's screens
* Add `keep_classnames` option to the terser minifier
* Make sure `Criteria` limit, page & skip options are numbers
* Add client-side `Alchemy#hasPermission(permission)` method
* Also set the `conduit` property to documents being sent to hawkejs

## 1.2.6 (2022-10-02)

* Don't overwrite existing `Conduit#active_prefix` property with a default value
* Also add translated nested (schemafield) fields to the `$hold.translated_fields` Document property
* Make class type_name and title configurable
* Fix records being translated twice when requested over the API
* Fix `Alchemy#downloadFile()` trying to pipe null into a stream
* Upgrade `formidable` to v2.0.1 (fixes multiple values)

## 1.2.5 (2022-07-23)

* Prevent `FieldConfig#getModel()` from throwing errors
* Always add private field info to Document when `keep_private_fields` is enabled, even if the field is empty
* Fix random fields being removed when sent to Hawkejs
* `Schema#getFieldChain()` should not return method functions as if they're fields
* Add translated fields to the `$translated_fields` held option in a Document
* Add `Criteria.cast()`
* Make stylesheet reloading smoother (remove old version *after* loading new one)
* Try to use `sass-embedded` before falling back to the slow `sass` package
* Allow setting a type in a `FieldSet`/`FieldConfig` instance
* Add basic permission support for plugins to implement
* Fix kept private fields not getting field getters
* Remember which routes a conduit instance has already been tested against
* Deduplicate `current_url` logic
* Fix `Route#generateUrl()` method
* Allow rewriting a requested url parameter
* Allow `!Route.languageSwitcher` directive to be used on single anchors
* Add `alchemy_settings(path)` SASS function

## 1.2.4 (2022-07-06)

* Fix infinite loop when looking for the `conduit` property in a Controller instance
* Add `Alchemy#getClientModel()` method
* Add `Base.getClientClass()` static method, like the existing `ClientBase.getServerClass()`
* Allow using private fields client-side when needed
* Add basic `__` translation method to `Alchemy.Element`
* Getting a model class with an empty name should just return the base model on the client-side too
* Don't add a SchemaField's associated data on the client-side

## 1.2.3 (2022-07-04)

* Fix `FieldConfig` not reviving model & association fields
* Also add a `hawkejs` property to the client-side `alchemy` instance
* Filter out certain options from serializing for `DocumentList` and `Criteria`
* Make better use of the `assoc_cache` when populating records
* Use Hawkejs as a singleton
* Upgrade `protoblast` and `hawkejs`

## 1.2.2 (2022-06-29)

* `Alchemy#requirePlugin(name)` will only execute the plugin if the `plugins` stage has already started
* Throw an error when a field does not exist during compiling of a criteria
* Fix `Conduit#handleUrlLocal()` method trying to use an undeclared conduit instance
* Make `alchemy.use()` use dynamic imports for ESM modules
* Add `DataProvider` class
* Make `FieldSet` and `FieldConfig` aware of the model they're working with
* Allow adding `field_options` when adding an association to a schema
* Update paginate component

## 1.2.1 (2022-03-16)

* `Router#routeUrl()` should strip away regexes
* Add `Alchemy#createSchema()` method
* Fix `Element#getCurrentUrl()` returning old url during render in the browser
* Emit `generate_static_variables` event when generating static variables
* Add `BackedMap` and `EnumMap` and use it for enum fields

## 1.2.0 (2022-02-20)

* Fix request files not being set correctly when using a nested form path
* Fix associated field selections not being queried
* Make `Model#getField(path)` support getting associated fields
* Allow comparing any type of field to a RegExp
* Fix `Model#eachRecord()` expecting each record to be a document instance
* Implemented `Model#beforeSave()` methods should now return a promise
* Add basic migration system
* Upgrade dependencies (that don't cause trouble)

## 1.1.8 (2021-09-12)

* Add `conduit` getter to the Base class
* Use Protoblast's temp file methods instead of `temp`
* Add `/hawkejs/static.js` middleware
* Use `sass` instead of the deprecated `node-sass`
* Use Protoblast's slug method instead of mollusc
* Add some more Directory & File methods

## 1.1.7 (2021-06-11)

* Add `Alchemy.Criteria.FieldConfig#getDisplayValueIn(data)` method to get a simple string representation of a value
* Check field class constructor in `Schema#addField()`
* Allow RegExp values for String fields during a query
* Requesting a route with the wrong method will now return a 405 error (Method Not Allowed) instead of a 404
* Fix client `Model` classes not being able to perform a query when running on the server in loopback mode
* Fix `time-ago` element refreshing every second when counting down to a date
* Fix the `Loopback` conduit sometimes setting the wrong route method

## 1.1.6 (2021-04-29)

* Switch from `uglify-es` to `terser` for minifying JavaScript files
* Allow overriding any setting from the command line
* Use `Branch` class for clearing model cache

## 1.1.5 (2021-01-21)

* Fallback to the `ENV` environment variable to set the environment
* Fix rendering of segments
* Fix Loopback conduits not setting the correct data when only provided with a route name
* Set the `Hawkejs.Renderer` language once we have a prefix
* Automatically add the `hreflang` attribute to links created with the Router helper
* Fix `Conduit#url` property having the wrong path set
* Load `helper_datasource` and `helper_field` folders before main `helper` folder
* Add `Alchemy#checksum(value)` method
* Throw an error when a class instance is used as a criteria condition
* Fix breadcrumbs for routes that contain objects
* Apply active-link breadcrumb classes while creating the anchors

## 1.1.4 (2020-12-10)

* Fix certain socket linkup packets not being json-dry encodes
* Make `Alchemy#findImagePath()` return a promise
* Make `FieldConfig` class more aware of paths
* Fix `Validator#validateFieldValue()` throwing an error when a field contains multiple violations
* Fix Schema fields not translating translatable fields
* Fix `Validations` errors always having only max 1 field error

## 1.1.3 (2020-11-12)

* Add `Schema#clone()` method
* Add `Schema#field_count` property
* Fix `Schema#addField()` throwing an error when adding a schema field on the browser side
* Added `Criteria#page(page, page_size)`
* `Conduit` classes have been moved into the `Conduit` namespace
* `Conduit.Loopback` now correctly sets the method & body
* Added `Criteria.FieldSet` and `Criteria.FieldConfig` classes
* Object responses via `Conduit.Loopback#end()` will now first be cloned with the `toHawkejs` clone option
* `Model#find()` will now reject when no `datasource` property is set
* Add support for `fonts` asset folders
* Add `CustomElement#getCurrentUrl()` method

## 1.1.2 (2020-10-08)

* Fix Client class methods not being set on the server-side for classes defined in a plugin
* Add `Criteria#isEmpty()` field check
* Add `Linkup#demand()` method
* Add `--socket` startup argument support
* When the given socket path is a directory, create a socket in that directory with the current project name
* Add `--url` startup argument, which will print the url in the console
* Add `--preload` startup argument, which will load the homepage & the client file on startup
* Allow opening redirects in a popup window

## 1.1.1 (2020-07-24)

* Add `Base.mapEventToMethod()` to register simple emitted events names to methods per class
* Add `Base#issueEvent(name, args, callback)` which will use the mapped event-to-method map to execute the method first & then emit the events
* Implement the new event-and-method flow in Controller & Models
* Already set the Hawkejs Renderer `is_for_client_side` property before calling the middleware
* All the properties of the `parameters` property will be used in the Router directive

## 1.1.0 (2020-07-21)

* Add `Schema#getDatasource()` which returns a pledge that resolves to the datasource
* `Alchemy#requirePlugin(name, attempt)` will now attempt to load the plugin if it hasn't been done yet
* Add `Criteria` class, which replaces the messy `DbQuery` class and is a query builder to boot.
* The `Datasource` & `Field` class is now also available on the client side
* Typedefs in routes can now contain fields, like `/{[Model._id]custom_id_name}/`
* Add `Models#load_external_schema` boolean property
* Add `second_format` option to Date & Datetime fields, allowing you to save Date as a timestamp
* Add `Datasource#allows(name)` to see if read/create/remove/update is allowed
* Add `Inode` namespace & `File` & `Directory` classes, as our way of dealing with files
* Also set the `method` property on the client-side `Conduit` instance
* Replace `Document.$main` object with save result
* Add `Model#findByValues` and `Model#findAllByValues`
* Add `Router#serveDependencyFile()` for when you want to serve a file from within a dependency
* Decode path parameters using `RURL.decodeUriSegment()`
* Add `$hold` property to Document class, which are also sent to the client
* `Conduit#redirect()` now has a `hard_refresh` option, to force a non-ajax redirection
* `DocumentList` can now be iterated over
* Removing the cached client file will no longer cause 404 errors
* Conduit responses can now be ended with a buffer
* Sessions will emit the `removed` event when they're being removed
* Websocket messages will no longer be resent upon reconnect
* Add `populate`  method to `DocumentList`
* When adding an association to a model, an index will automatically be made
* Uploaded files now use Alchemy's `Inode.File` class
* The `Criteria` class can now be asynchronously iterated over
* The `Fallback` datasource will now use the `read` method instead of `_read`
* Add `Schema.isSchema()` method
* `Enum` values will now also be serialized for the client-side config
* The `Router` helper directive will now look for a `url_attribute` property on the target element
* Add custom Error classes under the Classes.Alchemy.Error namespace
* Re-added validation support with the `Validator` & `Violation` classes
* Use `Blast.fetch()` in the `Alchemy#request()` method
* Rename `Model#findById()` to `Model#findByPk()`
* Add `Document#refreshValues()` to re-query the data from the database
* Allow individual associations to be resolved by the datasource itself
* Throw an error when trying to set a Document's data record to an invalid value
* Fix getting the path of fields in a subschema
* Add `Schema#getFieldChain(path)` and `Field#getFieldChain()`
* Add `FieldValue` class and use it for the new `Field#getDocumentValues(document)` method
* Add `Alchemy#getPrefixes()` to get the prefixes object on the server & client
* The `Alchemy#pickTranslation()` method now also accepts a conduit as prefix choices
* Add source-map support

## 1.0.8 (2019-01-12)

* Fix for package.json dependency version error

## 1.0.7 (2019-01-12)

* Setting `prefer: "client"` and `layout` property on a Route will let the client render the action once the base layout is loaded
* Add default `Conduit#notAuthorized()` and `Conduit#forbidden()` method
* Add support for some basic `policy` property on a Route
* Make the `Scene#interceptOpenUrl` method set the internal `breadcrumb` variable
* Add appcache support
* The `offline_clients` setting needs to be truthy in order to send an appcache manifest
* Fix `Schema#getField()` not looking in the subschema of a SchemaFieldType
* Fix `Model#find('count')` returning wrong value when result is 0
* Add `Alchemy#getMedHash()` function to get a simple, non-verification hash of a file
* The `Conduit#body` property can now be overwritten
* Allow json-dry data from logged-in users during a readDataSource request
* Add `FieldType#datasource` property
* Add `Datasource.setSupport(name, value)` and `Datasource.supports(name)`
* Use `Datasource.supports('objectid')` to see if it understands ObjectID instances
* Add `Alchemy#statPath(path, options)` function
* Allow `Model.addField()` to override already existing fields
* Add pledge support to `Alchemy#openUrl()`
* `Alchemy#findPathToBinarySync()` will now also look in the `/bin/` directory
* Deprecate `Alchemy#List()`
* Add more unit tests

## 1.0.6 (2018-12-06)

* Add `Document#is_new_record` property
* Fix `Document#[Symbol(alike)]` method
* Fix bug in SluggableBehaviour always assuming an existing record will be found
* Work around adding document methods before parent model is ready
* Make client-side Document classes inherit from correct parent
* Allow querying for extraneous, out-of-schema fields by passing the `extraneous` option
* Fix renderings of client-side Controller actions
* Use aggregate `sortByPath` in client-side IndexedDB search
* Add `Alchemy.Client.Document.getClassForUndry()` method
* `Model#saveRecord()` will now throw an error when a regular object is passed instead of a Document instance
* Add HTML field type
* Convert raw datasource data back to app-readable data after a create or update
* Add `Document#getLocalVersion()` and `Document#getLocalVersionIfNewer()` for in the browser
* Convert document data using `toServerSaveRecord` method before sending to server
* Set a reference to the current controller on the `conduit` instance

## 1.0.5 (2018-10-18)

* Submitting data over a socket will now also be JSON-DRY'd
* Allow the server to use the client-side only controller if no server-side controller is found
* Add validator classes
* Add `Document.isDocument(obj)` static method
* Make the save methods use a `Document` instance instead of a simple object
* Add `Alchemy#findPathToBinarySync()` for finding a path to a binary
* Fix copying & moving files on mac os
* `Schema#addAssociation()` will no longer add a localKey if it already exists
* Allow passing options to `Document#addAssociatedData()` and make it return a pledge
* Also clear the client-side model cache when clearing the server-side class cache
* Add export/import functionality
* Clone object with `toHawkejs` method before stringifying when calling `Conduit#end()`
* Add `undefined` "from" property to postcss options to prevent annoying warning

## 1.0.4 (2018-08-27)

* Don't create a `db` instance when the MongoDatasource fails to connect
* Add `Document#$attributes` property, where non-database values can be stored in
* Add `Document#hasChanged(name)` method, to check if values have changed
* Add `Document#resetFields()` to reset a document to its initial state
* Fix SluggableBehaviour
* Add `Document#needsToBeSaved()`
* Make `Document#hasChanged()` detect changes in object values
* Don't pass undefined `version` argument to `indexedDB.open()`
* Add `Document#[Blast.alikeSymbol]` method to check for likeness
* Add `Conduit#supports(feature)` to check for supported features (only async/await for now)
* Add `nodent-compiler` optional dependency for compiling async/await code for IE11
* The `PATH_ROOT` constant can now take its value from an environment variable
* Make `loadHelpers`  recursively load in a directory of helpers
* Add `Alchemy#isObjectId(obj)` to see if a string or object is an object id
* `Model#findById(id)` will throw an error when an invalid object id is given
* Document constructor code is now moved to `setDataRecord` method, so it can be shared with the client-side instance
* Add default `saveRecord` action to the Controller class, for client-side record saving
* Add `getModel()` method to the custom Element class
* Fix Paginate component interpreting empty filters as a regex
* Fix Paginate filter inputs not showing the filtered value
* Add `filtering` and `sorting` boolean property to `Pagination#getConfig()` method result
* Check if manual slug values are actually valid
* Add `time-ago` custom HTML element

## 1.0.3 (2018-07-12)

* Update alchemy info page
* `Schema#addField(name, type, options)` now allows you to directly pass a `Schema` instance as a type
* Fix `DocumentList#findNextBatch` looking for the `_options` property, when it should be `options`
* Also pass the `model` instance when creating a new `DocumentList` instance
* Fix `Document#remove` not finding the $model property
* `DocumentList` instances can now be created without any arguments
* Add `DocumentList#toSimpleArray()` which returns an array of simple objects with only the wanted fields
* Add `DocumentList.unDry` static method to the server-side class, because static methods don't get added by default yet
* Fix `Document#conduit` causing an infinite loop
* Change `Model.cacheDuration` to `Model.cache_duration`
* Make `Model#save()` and `Model#findById()` also return Pledges
* Make `Model#remove()`, `Document#remove()`, `Model#ensureIds()` return Pledges
* Make MongoDataSource use `findOneAndDelete` to remove a record
* Switched from `slug` dependency to `mollusc`, which is a fork with several fixes
* When the `port` setting is `null`, a random port will be tried. All other falsy values will still not start the server.
* `Alchemy#usePlugin(name, options)` now accepts a `path_to_plugin` option
* `Alchemy#usePath()` will no longer load `test` folders
* Fix paths equaling a prefix not working as you expect them to
* Don't start socket.io when `settings.websockets` is false
* Fix `Alchemy#broadcast(type, data)` not working
* Add `Model#getBehaviour(name)`, which gets an existing instance on the current model
* Add `Document#revert(revisions)` to revert to an earlier version of the document

## 1.0.2 (2018-07-07)

* Fix `DocumentList#available` always defaulting to the length of the current set
* Correctly parse `x-forwarded-for` in case there are multiple ip addresses

## 1.0.1 (2018-07-04)

* Fix `mongodb` dependency version

## 1.0.0 (2018-07-04)

* Split up old `Document` into `DocumentList` and `Document` class
* Add client-side `Document`, `Model` and `DocumentList` classes
* Class-specific `title` and `type_name` properties are now statics instead of protos
* Add simple HTTP `HEAD` method support
* `DbQuery` is now also available on the client side
* Added query matching code from nedb to `DbQuery`
* Removed nedb dependency
* Model & Controller are now their own namespace
* Added a Base class for the Client side + client conduit & controller
* Custom elements should inherit from `Alchemy.Element` from now on
* Add `Base#getClientPath` and `Base#getClientPathAfter`
* Add `Conduit#chooseBestLocale(locales)` in order to get the best locale for the connection
* Also check `data-breadcrumbs` when activating links
* Starting the server with `--debug-requirements` will print info about which files are loaded using `alchemy.use`

## 0.5.0 (2018-01-05)

* Wait for `Blast` to load before starting the `startServer` stage
* `usePath` will now always first load in files and THEN directories
* Renamed the `Alchemy.Command` class to `Alchemy.Task`
* Added `applyButton` to `Pagination` helper
* You can now set multiple `Pagination` filters
* Helpers are now under the Hawkejs namespace
* Added `Model#eachRecord(options, task, callback)`, which returns a `Pledge`
* Setting `store_units` option on a Date field will store its unit info along with it
* Parse useragents using the `useragent#lookup` method, which caches strings
* Calls to `Conduit#error` will now also be emitted as a `conduit_error` event on the main `alchemy` instance
* A `Route`'s options will now be stored in the `options` property
* `Route#generateUrl` can now also accept a regular options object instead of a `Conduit`
* Don't use `let` in the `Alchemy.Base` class, since it's also used in the browser
* If a minified cached asset (stylesheet or script) gets deleted, re-minify it instead of blocking the request
* The session store is now stored under `alchemy.sessions`
* Request URLs ending with only a prefix, and no slash, will now also work
* `Route#match` will now use `decodeURIComponent` when extracting url parameters
* The helper `Router#printRoute` can now be used to only print an opening anchor when used in combination with `Router#closeRoute`
* Added `PostCSS` and `autoprefixer` package
* `Alchemy#pickTranslation` will give correct results when given prefix is falsy
* The `StringFieldType` will now pick a translation in case the database value was an object
* Add "segments", view blocks that have a specific route
* Make `Model.find` return a `Pledge`
* Mark the `Model` class as being an abstract class
* Add UglifyJS global_defs for `Blast.isNode` and `Blast.isBrowser`

## 0.4.3 (2017-09-07)

* Fix: don't set gutter on `Janeway#print` output when Janeway is not active
* Fix: Client-side `Alchemy#switchLanguage` will now work when there are get queries
* Add `use_found_prefix` to model search options. This used to be hard-coded yes, but now it is false by default
* Calculate etag using `Object.checksum`, as fowler has too many collisions
* Set the current active prefix using `internal` and `expose` as 'active_prefix' (`Conduit#prefix` will not be set, because that is only used when it's in the path!)
* If header `x-alchemy-default-prefix` is set, use that as *default* prefix. This differs from `x-alchemy-prefix`, as that is a hard override.
* Fix `useragent` not having the `satisfies` method
* Fix `socket.io.js` not being served
* Only create a dgram socket when it is needed
* `getResource` of the `Alchemy` helper will now always add the data object as the second argument (it used to do 2 different things on loopback or client)
* Upgrade `protoblast` dependency to 0.3.10

## 0.4.2 (2017-08-27)

* Remove quotes from `content-type`'s UTF-8
* Add `Controller#safeSet`, which uses `encodeHTML` to set strings
* The session cookie has `httpOnly` enabled
* Add `Conduit#is_secure` property
* Enable the `secure` option by default when setting a cookie on a secure connection
* Fix path traversal security bug in `findAssetPath`
* The `scene_start_` cookie will only live for 15s in stead of 10 minutes

## 0.4.1 (2017-08-11)

* Setting `sort` to false will now actually disable sorting
* Fallback translations `__` will now be picked
* Send hawkejs templates using regular JSON, not JSON-dry
* Fix urls not being generated properly when using prefixes
* Add `Controller#renderDialogIn` so dialogs can be rendered from the server side, too
* Let the Mongo datasource retry to reconnect a near infinite amount of times
* `Alchemy#downloadFile` now uses `Blast#fetch`
* Alchemy will now exit when the parent process does
* Add languageSwitcher
* Number fields with value null won't be cast to 0 anymore
* `Conduit#redirect` now uses temporary (301) redirects by default
* Disabling a find's `recursive` will now also apply to a subschema
* Hidden files (starting with ".") or the "empty" file will no longer be loaded
* You can now set parameters using `Conduit#param(name, value)`
* `Conduit#param(name)` will now also look in the cookies
* Add support for `assume_https` config and `x-forwarded-proto` header
* Alchemy won't listen to multicast address by default

## 0.4.0 (2017-04-17)

* Fixed router issue in the Alchemy helper
* `PATH_*` globals are now constants
* Removed `APP_ROOT`, `PATH_APP` has been available for years
* The version of your app and alchemy itself are added to `process.versions`
* The global `alchemy` object is now an instance of the `Alchemy` class
* Added `Alchemy#makeNextRequireStrict()` which adds `use strict` to the next required module
* Fixed adding indexes to nested fields
* Automatically add 2dsphere index to Geopoint fields
* Added `qs` dependency so nested GET parameters can be decoded properly
* Add cache method to client-side `alchemy#fetch` method
* A model's Document class will now inherit from that model's parent's document class
* Self-referencing Schema fields are no longer queried for now, this causes deadlocks to occur
* Add `alchemy.__` to client-side javascript
* Also emit the full linkup packets as a 'linkup_packet' event
* Base class fixes
* Add hawkejs multiple-template serving middleware

## 0.3.3 (2017-01-21)

* Fix $or grouping during normalization of `Query` conditions
* Further split up the `Conduit` class
* Fix some `Resource` issues in the alchemy helper
* Add a `Document#toArray()` method
* Put non-translated, orphaned, strings in a '__' prefix when fetched from server
* Optimize `Model#ensureIds`
* Add router section identifiers (for in selects, ...)
* Add `conduit` property getter to `Document`
* Fix new cookies being ignored on a redirect
* Set option `set_updated` to false during saving so the `updated` field won't be changed
* Add `of_group_name` static property to classes
* Add `count` as find option
* Add `Model#beforeSave` callback support
* Pass query options to `Document`
* Set `x-history-url` on internal redirect (and expose to hawkejs)
* Change cache-control to cache for max 1 hour (in stead of 1 year)
* Add options to the `Document#save` method
* Find next batch of limited find results using `Document#findNextBatch`
* No longer die when trying to use a "priviliged" port
* Upgrade protoblast to version 0.4.0
* Upgrade hawkejs to version 1.1.2

## 0.3.2 (2016-10-19)

* Forgot to upgrade the Janeway package

## 0.3.1 (2016-10-19)

* Upgraded NPM packages
* Set terminal title using Janeway
* Fixed inheritance issues
* Janeway can now also be disabled by setting the DISABLE_JANEWAY env to 1
* Setting `alchemy.settings.silent` to true will disable the custom `log` calls

## 0.3.0 (2016-10-04)

* Added Base class in Alchemy namespace
* `alchemy.classes` has been removed in favor of `Classes`
* Added Command class
* Associated record data will now also be saved
* Sluggable behaviour has been fixed
* Add `file_path` property to `useOnce` require errors
* Bugfixes in the Router helper
* Allow registering modules as null
* Load mmmagic on-the-fly, don't preload bcrypt and chokidar
* Add `alchemy.broadcast` which broadcasts to every connected websocket scene

## 0.2.2 (2016-07-02)

* Update socket.io dependencies, fixing reconnection issues
* Added `log.once(id, ...)` to log a specific message only once
* Added `log.less(id, ...)` to log messages only once per second
* Added `log.setLessConfig` if you want to set specific limit for log.less

## 0.2.1 (2016-06-27)

* ClientSocket now has an `offset` and `latency` property plus `now()` timestamp method
* SocketConduit now has an `ip` property
* `ModelDocument` now has an `init` method that gets called on creation

## 0.2.0 (2016-06-26)

* Switched to Hawkejs v1.0.0
* Removed cruft (continuation, ...)
* Removed old Nuclei-way of defining classes
* Added new classes:
  - Conduit
  - Schema
  - Router
  - Route
  - FieldType
  - Datasource

## 0.1.0 (2014-09-10)

* Remove mongoose & MongoDB eval code (still need to add validation support)
* Added sluggable behaviour
* Added Object.isEmpty method
* Array.cast converts array-like objects to regular arrays (but not Strings),
  if the variable is undefined an empty array is returned
* Add 'score' method to String prototype, to determine how similar strings are
* Add 'alchemy.after' method, which will do something after the given event has
  been emitted, even if it has been emitted in the past
* Add hasValue and getValueKey to Object, also works on arrays
* When saving data you can pass the 'allowedIndexes' option, which should be an
  array of indexes allowed to be looked through for existing records.
  If it's an empty array, only the _id will be used. If it's false, every index
  is used.
* Add 'divide' method to Object, which creates a new array where every key-value
  pair is a new object
* Spin off prototype & inflections to new module: protoblast
* Added publishable behaviour

## 0.0.1 (2014-04-04)

* Finalise version 0.0.1 after a year of initial development,
  now we can start removing mongoose.