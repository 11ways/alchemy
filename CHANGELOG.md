## 0.4.2 (WIP)

* Remove quotes from `content-type`'s UTF-8
* Add `Controller#safeSet`, which uses `encodeHTML` to set strings
* The session cookie has `httpOnly` enabled
* 

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