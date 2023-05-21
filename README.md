# Fōrmulæ for JavaScript

Fōrmulæ is a software framework for visualization, edition and mianipulation of complex expressions (either mathematical expressions or expressions from many other fields). If you want to know more about Fōrmulæ, please refer to its website [formulae.org](https://formulae.org).

The JavaScript edition for Fōrmulæ runs in a web browser.

This repository contains:

* The JavaScript implementation of the Fōrmulæ specification for visualizing, editing and manipulating expressions.
* A front-end —written in JavaScript—, an interface where the user can visualize, create and edit expressions. It works in a [read–eval–print loop](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop) mode. The user can save a created scrip as a local file in order to be retrieved later or shared.
* A back-end —written in JavaScript—, is a background program that evaluates the expressions created by the user and returns the result to the front-end, in order to be shown.
* Message files —written in JSON— for messages in several human languages, in order to the main program can be used for different locales.
* Because the main program runs as a web page, it requires some additional resources, such as HTML files, CSS files, images, icons, etc.

### Fōrmulæ packages

Please notice that this repository contains only the core code (the framework). Code for visualizing, editing and manipulating expressions for a specific field —i.e. arithmetics— is grouped in a separate unit called a Fōrmulæ package. Every package has its own repository, you can check [here](https://github.com/formulae-org) the list of packages.

The main program is able to dynamically load packages. When the main program starts, it loads a set of base packages. The user can also choose for additional packages to be loaded. 

### The Fōrmulæ programming language




