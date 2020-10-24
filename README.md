<h1 align="center">
  <img src="https://protoblast.develry.be/media/static/alchemy-small.png" width=30 alt="Alchemy logo"/>
  <b>Alchemy</b>
</h1>
<div align="center">
  <!-- CI - TravisCI -->
  <a href="https://travis-ci.org/11ways/alchemy">
    <img src="https://travis-ci.org/11ways/alchemy.svg?branch=master" alt="Mac/Linux Build Status" />
  </a>

  <!-- CI - AppVeyor -->
  <a href="https://ci.appveyor.com/project/skerit/alchemy">
    <img src="https://img.shields.io/appveyor/ci/skerit/alchemy/master.svg?label=Windows" alt="Windows Build status" />
  </a>

  <!-- Coverage - Codecov -->
  <a href="https://codecov.io/gh/11ways/alchemy">
    <img src="https://img.shields.io/codecov/c/github/11ways/alchemy/master.svg" alt="Codecov Coverage report" />
  </a>

  <!-- DM - Snyk -->
  <a href="https://snyk.io/test/github/skerit/alchemy?targetFile=package.json">
    <img src="https://snyk.io/test/github/skerit/alchemy/badge.svg?targetFile=package.json" alt="Known Vulnerabilities" />
  </a>

  <!-- DM - David -->
  <a href="https://david-dm.org/skerit/alchemy">
    <img src="https://david-dm.org/skerit/alchemy/status.svg" alt="Dependency Status" />
  </a>
</div>

<div align="center">
  <!-- Version - npm -->
  <a href="https://www.npmjs.com/package/alchemymvc">
    <img src="https://img.shields.io/npm/v/alchemymvc.svg" alt="Latest version on npm" />
  </a>

  <!-- License - MIT -->
  <a href="https://github.com/11ways/alchemy#license">
    <img src="https://img.shields.io/github/license/11ways/alchemy.svg" alt="Project license" />
  </a>
</div>
<br>
<div align="center">
  A node.js MVC framework
</div>
<div align="center">
  <sub>
    Coded with ❤️ by <a href="#authors">Eleven Ways</a>.
  </sub>
</div>

# Getting started

You can create a new, empty app by executing this npm command:

```bash
npm init alchemy your-app-name
```

Then `npm install` the package.json contents.
This is only `alchemymvc` by default.

# Installation

Just installing the npm package can be done like this:

    $ npm install alchemymvc

# Quick start guide

Alchemy makes heavy use of the **Protoblast** utility library, which extends the native objects with many new methods.
Especially the `Function.inherits()` method is interesting, as that is the basis for the Alchemy class system.
You can find extensive documentation on the library here: [https://protoblast.develry.be](https://protoblast.develry.be)

## File structure

All of your project code should go into an `app` directory.
That directory can contain many subdirectories. Most of those files are auto-required on boot.

The directories (and some of their basic files) are:

* **assets**:
  * **images**: Static images
  * **scripts**: Client-side only javascript files. Accessible through `/scripts/` url.
  * **stylesheets**: SCSS and LESS stylesheet files. Accessible through `/stylesheets/` url.
* **config**:
  * **bootstrap.js**: Place where all plugins should be loaded
  * **default.js**: Default configuration
  * **local.js**: Configuration file that overrides all others. Is required for the `environment` definition. Should not be checked into git.
  * **prefixes.js**: Place to define which prefixes (locales/languages) are used on the site
  * **routes.js**: Routes should be defined here
* **controller**:
  * **app_controller.js**: Basic controller instance your other controllers should inherit from
* **element**:
  * **app_element.js**: Basic custom element your other custom elements should inherit from.
* **helper**:
  * **app_helper.js**: Basic helper your other helpers should inherit from.
* **lib**:
  * Put classes here that are only needed on the server.
* **model**:
  * **app_model.js**: Basic model your other models should inherit from.
* **public**:
  * Files put in here will be publicly available under the `/public/` url.
* **root**:
  * Files put in here will be publicly available under the root url (So `/`)
* **view**:
  * Template files go in here, preferably with a `.hwk` extension, though regular `.ejs` files also work.

## Code convention

### Naming:

* Class names are written using upper camel case: **MyClassName**
* Method names are written using lower camel case: **myMethodName**
* Property names and variables are written using snake case: **my_property_name**

### Whitespaces

* Tabs are used for indentations, spaces are used for positioning.

## Base class

Most Alchemy classes inherit from the `Base` class (which in turn inherits from the `Informer` class, a custom event emitter class)

Here are some important static methods:

### Base.setProperty([key,] getter, setter)

This will create a property getter/setter on the class. For example:

```js
MyClass.setProperty(function test_me() {
  return 'test!'
});
```

Will create a property getter called 'test_me' that will always return the string "test!"

```js
var instance = new MyClass();
instance.test_me;
// »»» "test!"
```

### Base.setMethod([key,] fnc)

This will add a method to the class. For example:

```js
MyClass.setMethod(function testMe() {
  return 'test!'
});
```

Now you can call this method:

```js
var instance = new MyClass();
instance.testMe();
// »»» "test!"
```

## Models

Creating a server-side model is easy, you need to inherit from the `Alchemy.Model.App`:

```js
var Block = Function.inherits('Alchemy.Model.App', function Block(conduit, options) {
  Block.super.call(this, conduit, options);
});
```

### Model schema

After that you probably want to define the schema to use, that has to be done in a `constitute` call:

```js
Block.constitute(function addFields() {

  // Add a simple unique string field
  this.addField('name', 'String', {unique: true});

  // Another string field, that is not unique
  this.addField('title', 'String');

  // Longer piece of text
  this.addField('content', 'Text');
});
```

By default 3 fields are already added to the schema:

* **_id**: An ObjectID field
* **created**: A datetime field with the creation date
* **updated**: A datetime field that gets updated whenever the record is saved

## Authors

AlchemyMVC is developed at [Eleven Ways](https://www.elevenways.be/), a team of [IAAP Certified Accessibility Specialists](https://www.accessibilityassociation.org/).