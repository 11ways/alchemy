## 0.1.0 (WIP)

* Remove mongoose & MongoDB eval code (still need to add validation support)
* Added sluggable behaviour
* Added Object.isEmpty method
* Array.cast converts array-like objects to regular arrays (but not Strings),
  if the variable is undefined an empty array is returned
* Add 'score' method to String prototype, to determine how similar strings are
* Add 'alchemy.after' method, which will do something after the given event has
  been emitted, even if it has been emitted in the past
* Add hasValue and getValueKey to Object, also works on arrays

## 0.0.1 (2014-04-04)

* Finalise version 0.0.1 after a year of initial development,
  now we can start removing mongoose.