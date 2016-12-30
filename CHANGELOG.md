## 0.3.3 (WIP)

* Fix $or grouping during normalization of `Query` conditions
* Further split up the `Conduit` class
* Fix some `Resource` issues in the alchemy helper
* Add a `Document#toArray()` method
* Put non-translated, orphaned, strings in a '__' prefix when fetched from server

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