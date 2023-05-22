# Fōrmulæ for JavaScript

Fōrmulæ is a software framework for visualization, edition and manipulation of complex expressions (either mathematical expressions or expressions from many other fields). If you want to know more about Fōrmulæ, please refer to its website [formulae.org](https://formulae.org).

The JavaScript edition for Fōrmulæ runs in as web application.

This repository contains:

* The JavaScript implementation of the Fōrmulæ specification for visualizing, editing and manipulating expressions.
* A front-end —written in JavaScript—, an interface where the user can visualize, create and edit expressions. It works in a [read–eval–print loop](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop) mode. The user can save a created scrip as a local file in order to be retrieved later or shared.
* A back-end —written in JavaScript—, is a background program that evaluates the expressions created by the user and returns the result to the front-end, in order to be shown.
* Message files —written in JSON— for messages in several human languages, in order to the main program can be used for different locales.
* Because the main program runs as a web page, it requires some additional resources, such as a HTML file, a CSS file, images, icons, etc.

### Fōrmulæ packages

Please notice that this repository contains the code for the main program only. Code for visualizing, editing and manipulating expressions for a specific field —i.e. arithmetics— is grouped in a separate unit called a Fōrmulæ package. Every package has its own repository, you can check [here](https://github.com/formulae-org) the list of packages.

The main program is able to dynamically load packages. When the main program starts, it loads a set of base packages. The user can also choose for additional packages to be loaded. 

### The Fōrmulæ programming language

There is a Fōrmulæ package for structured programming [(repository)](https://github.com/formulae-org/package-programming-js). This package makes that a new programming language emerges. This language, called **The Fōrmulæ programming language** is [proven](https://formulae.org/?script=examples/Universal_Turing_machine) to be [Turing-complete](https://en.wikipedia.org/wiki/Turing_completeness), in other words, it is able to run every possible algorithm.

Since the expressions for programming —as well as the expressions for the packages you choose— are pretty-print, it makes the Fōrmulæ language a visual programming language. Moreover, because you decide which packages to load and to use, you can use the Fōrmulæ language to create and inter-operate with expressions from these packages.

### Formatting documents

Because text, paragraphs, tables, colors, images, etc. can be abstracted as expressions, Fōrmulæ can also be used to format complex documents. There is a Fōrmulæ package for typesetting [(repository)](https://github.com/formulae-org/package-typesetting-js).

All the content of the Fōrmulæ website [formulae.org](https://formulae.org), consisting of hundreds of pages with articles, examples, tutorials, etc. are written entirely as Fōrmulæ files.

That content is stored and mantained as a separate [repository](https://github.com/formulae-org/web-content).

