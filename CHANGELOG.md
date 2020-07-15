## 1.1.0 (WIP)

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