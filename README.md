<h1 align="center">
  <img src="https://protoblast.elevenways.be/media/static/alchemy-small.png" width=30 alt="Alchemy logo"/>
  <b>Alchemy</b>
</h1>
<div align="center">
  <!-- CI - TravisCI -->
  <a href="https://travis-ci.org/11ways/alchemy">
    <img src="https://travis-ci.org/11ways/alchemy.svg?branch=master" alt="Mac/Linux Build Status" />
  </a>

  <!-- Coverage - Codecov -->
  <a href="https://codecov.io/gh/11ways/alchemy">
    <img src="https://img.shields.io/codecov/c/github/11ways/alchemy/master.svg" alt="Codecov Coverage report" />
  </a>

  <!-- DM - Snyk -->
  <a href="https://snyk.io/test/github/11ways/alchemy?targetFile=package.json">
    <img src="https://snyk.io/test/github/11ways/alchemy/badge.svg?targetFile=package.json" alt="Known Vulnerabilities" />
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

You can find all the documentation on [https://alchemy.elevenways.be](https://alchemy.elevenways.be)


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