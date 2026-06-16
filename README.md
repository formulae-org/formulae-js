![Fōrmulæ banner](banner.png)

# Fōrmulæ — web application (`formulae-js`)

Fōrmulæ is a web-based visual environment for **computing**, **composing**, and **conversing** with tree-structured expressions. You build expressions by navigating and editing a tree — never by typing syntax — and they are rendered as mathematical and scientific notation on an HTML canvas. It runs entirely in the browser; there is nothing to install.

🌐 **Live at [formulae.org](https://formulae.org)** · 📦 **Organization: [formulae-org](https://github.com/formulae-org)**

This repository is the **main program** — the part that is always present, whatever fields you work in:

- The **engine** that visualizes, edits and manipulates expressions.
- The **editing interface**, a [read–eval–print loop](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop): each input expression is followed by its result. Unlike a typical REPL, you can select an earlier input, modify it, and request the result again. Scripts can be saved as local files to be retrieved later or shared.
- The **reduction engine** that evaluates expressions and returns results to be displayed.
- **AI connections** for the Converse mode (OpenAI, Anthropic, Google, and local models via Ollama).
- Message files (JSON) for several human languages, plus the HTML, CSS, images and icons the web app needs.

## The three modes

- **Compute** — evaluate expressions: arithmetic, symbolic algebra, logic, lists, strings, control flow, and more.
- **Compose** — present expressions: paragraphs, tables, equations, images, links, colors and lists. Because composing and computing share the same expressions, one file is both a runnable program and a formatted, human-readable document.
- **Converse** — send an expression to an AI model as a prompt. The model replies with a Fōrmulæ expression that renders in place, so equations, tables, code and inline images can appear in both the prompt and the response. Seet the [AI Converse demo](https://formulae.org/?script=examples/AI%20converse).

## Packages

The main program handles expressions only in the abstract; the expressions for a specific field — arithmetic, typesetting, programming, … — live in separate **packages**, each in its own repository (`package-{name}-js`, listed under [formulae-org](https://github.com/formulae-org)). The program loads a base set of packages at startup and can load others on demand. Because the [programming package](https://github.com/formulae-org/package-programming-js) makes Fōrmulæ [Turing-complete](https://formulae.org/?script=examples/Universal_Turing_machine) and its expressions are pretty-printed, Fōrmulæ is also a **visual programming language**.

## Content

The entire [formulae.org](https://formulae.org) website — articles, showcases, examples and reference — is authored as Fōrmulæ `.formulae` files, not HTML, in the separate [web-content](https://github.com/formulae-org/web-content) repository.

## Running it

The easiest way to use Fōrmulæ is at [formulae.org](https://formulae.org). The app is plain JavaScript ES modules with no build step — to run a copy locally, serve this directory with any static HTTP server.

## License

[GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html).
