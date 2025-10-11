/*
Fōrmulæ expressions.
Copyright (C) 2015-2025 Laurence R. Ugalde

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

'use strict';

class Rectangle {
	constructor(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
}

class FontInfo {
	constructor(context, name, size) {
		this.name = name;
		this.size = size;
		this.bold = false;
		this.italic = false;
		
		this.semiSpace = null;
		this.semiHeight = null;
		
		this.buildFontSpec(context);
	}
	
	buildFontSpec(context) {
		this.fontSpec = "";
		
		// italic
		if (this.italic) this.fontSpec = "italic";
		
		// bold
		if (this.bold) {
			if (this.fontSpec.length > 0) this.fontSpec += " ";
			this.fontSpec += "bold";
		}
		
		// size
		if (this.fontSpec.length > 0) this.fontSpec += " ";
		this.fontSpec += this.size + "px";
		
		// name
		this.fontSpec += " " + this.name;
		
		// semi space & semi height
		this.space = context.measureText(" ").width;
		this.semiSpace = this.space / 2;
		this.semiHeight = this.size / 2;
		
		return this.fontSpec;
	}
	
	setForContext(context) {
		context.font = this.fontSpec;
	}
	
	setName(context, name) {
		if (this.name == name) return;
		
		this.name = name;
		context.font = this.buildFontSpec(context);
	}
	
	setSizeAbsolute(context, size) {
		if (this.size == size) return;
		
		this.size = size;
		context.font = this.buildFontSpec(context);
	}
	
	setSizeRelative(context, delta) {
		let bkp = this.size;
		this.size += delta;
		if (this.size < 10) this.size = 10;
		if (this.size == bkp) return;
		context.font = this.buildFontSpec(context);
	}
	
	setBold(context, bold) {
		if (this.bold == bold) return;
		
		this.bold = bold;
		context.font = this.buildFontSpec(context);
	}
	
	setItalic(context, italic) {
		if (this.italic == italic) return;
		
		this.italic = italic;
		context.font = this.buildFontSpec(context);
	}
	
	setChanges(context) {
		context.font = this.buildFontSpec(context);
	}
}

///////////
// scope //
///////////

class ScopeEntry {
	constructor(value = null) {
		this.value = value;
	}

	getValue() {
		return this.value;
	}
	
	setValue(value) {
		this.value = value;
	}
}

class Scope {
	constructor() {
		this.entries = new Map();
		this.locked = false;
	}
	
	clear() {
		this.entries.clear();
	}
}

class Scopable {
	hasScope() {
		return false;
	}
	
	createScope() {
		if (this.scope === undefined) {
			this.scope = new Scope();
			return true;
		}
		else {
			return false;
		}
	}
	
	removeScope() {
		delete this.scope;
	}
	
	lockScope() {
		if (this.scope === undefined) {
			throw "Expression has no scope";
		}
		
		this.scope.locked = true;
	}
	
	unlockScope() {
		if (this.scope === undefined) {
			throw "Expression has no scope";
		}
		
		this.scope.locked = false;
	}
	
	getFromScope(symbolName, global) {
		let p = this;
		let entry;
		
		do {
			if (p.scope !== undefined) { // expression has scope
				entry = p.scope.entries.get(symbolName);
				if (entry !== undefined) return entry;
				if (!global) return null;
			}
			else { // expression has no scope
				if (p.hasScope() && !global) { // should it have, and is it local ?
					return null;
				}
			}
			
			if (p instanceof Expression) {
				p = p.parent;
			}
			else {
				p = null;
			}
			
		} while (p != null);
		
		return null;
	}
	
	putIntoScope(symbolName, entry, global) {
		let p = this;
		let lastExpressionWithScope = null;
		
		do {
			if (p.scope !== undefined) { // it already has a scope
				if (!p.scope.locked) {
					if (global) {
						lastExpressionWithScope = p;
					}
					else {
						p.scope.entries.set(symbolName, entry);
						return;
					}
				}
			}
			else { // expression has no scope
				if (p.hasScope()) { // should it have ?
					if (global) {
						lastExpressionWithScope = p;
					}
					else {
						p.createScope();
						p.scope.entries.set(symbolName, entry);
						return;
					}
				}
			}
			
			if (p.scope !== undefined && !p.scope.locked) {
				if (global) {
					lastExpressionWithScope = p;
				}
				else {
					p.scope.entries.set(symbolName, entry);
					return;
				}
			}
			
			if (p instanceof Expression) {
				p = p.parent;
			}
			else {
				p = null;
			}
			
		} while (p != null);
		
		if (lastExpressionWithScope.scope === null) {
			lastExpressionWithScope.createScope();
		}
		
		lastExpressionWithScope.scope.entries.set(symbolName, entry);
	}
	
	removeFromScope(symbolName) {
		let p = this;
		let entry;
		
		do {
			if (p.scope !== undefined) {
				entry = p.scope.entries.get(symbolName);
				if (entry !== undefined) {
					p.scope.entries.delete(symbolName);
					return true;
				}
			}
			
			if (p instanceof Expression) {
				p = p.parent;
			}
			else {
				p = null;
			}
			
		} while (p != null);
		
		return false;
	}
}

let globalScope = new Scope();

class ExpressionHandler extends Scopable {
	constructor(expression, context, type) {
		super();
		
		this.type = type;
		this.index = 0;
		
		if (expression !== undefined) {
			this.setExpression(expression);
		}
		
		if (context !== undefined) {
			this.context = context;
			
			this.context.fontInfo = new FontInfo(this.context, "serif", Formulae.fontSize);
			this.context.fontInfo.setForContext(this.context);
		}
		
		this.scope = globalScope;
	}
	
	setExpression(expression) {
		this.expression = expression;
		expression.parent = this;
	}
	
	toString() {
		return this.constructor.name + "(" + this.expression.toString() + ")";
	}
	
	clone() {
		let n = new Object(this);
		n.setExpression(this.expression.clone());
		return n;
	}
	
	prepareDisplay(resizingCanvas = true) {
		////////////////////////////
		
		this.expression.prepareDisplay(this.context);
		
		this.expression.x = 0;
		this.expression.y = 0;
		
		if (resizingCanvas) {
			this.context.canvas.width = this.expression.width + 2;
			this.context.canvas.height = this.expression.height + 2;
		}
		
		if (window.devicePixelRatio != 1.0) {
			this.context.canvas.style.width = (this.context.canvas.width / window.devicePixelRatio) + "px";
			this.context.canvas.style.height = (this.context.canvas.height / window.devicePixelRatio) + "px";
		}
		//this.context.scale(devicePixelRatio, devicePixelRatio);
		
		this.context.fontInfo.setForContext(this.context);
		this.context.textBaseline = "bottom";
		this.context.imageSmoothingEnabled = false;
		
		////////////////////////////
		
		if (Formulae.ltr) {
			this.context.translate(1, 1);
		}
		else {
			this.context.translate(this.context.canvas.width - 1, 1);
			this.context.scale(-1, 1);
		}
	}
	
	display(x = 0, y = 0) {
		if (this.type != Formulae.ROW_EXPORT) {
			this.context.fillStyle = (this.type == Formulae.ROW_INPUT ? "white" : (this.type == Formulae.ROW_OUTPUT ? "lightgray" : "wheat"));
			this.context.fillRect(-10, -10, this.context.canvas.width + 10, this.context.canvas.height + 10);
		}
		
		this.context.fillStyle = "black";
		
		this.expression.display(this.context, x, y);
	}
	
	fromPoint(x, y) {
		return this.expression.fromPoint(x, y, 0, 0)
	}
	
	restart() {
		this.context.fontInfo = new FontInfo(this.context, "serif", Formulae.fontSize);
		this.context.fontInfo.setForContext(this.context);
		
		this.expression.restart();
	}
}

let abcxyz = 1;

class EvaluationError extends Error {};

class Expression extends Scopable {
	constructor() {
		super();
		
		if (this.constructor == Expression) throw new Error("Expression is an abstract class");
		
		this.children = [];
		this.parent = null;
		this.index = -1;
		this.id = abcxyz++;
		
		this.x = 0;
		this.y = 0;
		this.width = 0;
		this.height = 0;
		this.horzBaseline = 0;
		this.vertBaseline = 0;
		
		this.reduced = false;
	}
	
	getTag() { throw new Error("Expression is an abstract class"); }
	
	getName() { throw new Error("A name must be provided"); }
	
	getChildName(index) {
		if (this.children.length == 1) {
			return "unique argument";
		}
		else {
			switch (index) {
				case 0: return "1st. argument";
				case 1: return "2nd. argument";
				case 2: return "3rd. argument";
				default: return (index + 1) + "th. argument";
			}
		}
	}
	
	restart() {
		if (this.children.length > 0) {
			for (let i = 0; i < this.children.length; ++i) {
				this.children[i].restart();
			}
		}
	}
	
	clone() {
		let n = Object.create(this);
		
		n.id = abcxyz++;
		n.parent = null;
		//n.children = [ ... this.children ];
		n.children = [];
		n.index = -1;
		n.reduced = false;
		
		let i, ch;
		for (i = 0; i < this.children.length; ++i) {
			//ch = n.children[i].clone();
			ch = this.children[i].clone();
			//n.children[i] = ch;
			ch.parent = n;
			ch.index = i;
			
			n.children.push(ch);
		}
		
		return n;	
	}
	
	isReduced() {
		return this.reduced;
	}
	
	setReduced(reduced) {
		this.reduced = reduced;
	}
	
	clearReduced() {
		this.reduced = false;
	}
	
	toString() {
		let result;
		if (this.parent instanceof Expression) {
			result = this.constructor.name + "[" + this.id + "," + this.parent.id + "," + this.index + "](";
		}
		else {
			result = this.constructor.name + "[" + this.id + ",H," + this.index + "](";
		}
		
		this.children.forEach((child, i) => {
			if (i > 0) result += ",";
			result += child.toString();
		});
		
		result += ")"
		return result;
	}
	
	setChild(index, child) {
		if (this.children[index].parent == this) {
			this.children[index].parent = null;
		}
		
		this.children[index] = child;
		child.parent = this;
		child.index = index;
	}
	
	addChild(child) {
		this.children.push(child);
		child.parent = this;
		child.index = this.children.length - 1;
	}
	
	addChildAt(index, child) {
		this.children.splice(index, 0, child);
		child.parent = this;
		let n;
		for (n = this.children.length; index < n; ++index) this.children[index].index = index;
	}
	
	removeChildAt(index) {
		let child = this.children[index];
		this.children.splice(index, 1);
		
		let n = this.children.length;
		for (; index < n; ++index) this.children[index].index = index;
		
		return child;
	}
	
	replaceBy(replacer) {
		if (this.parent instanceof Expression) {
			this.parent.setChild(this.index, replacer);
		}
		else { // handler
			/*
			this.parent.expression = replacer;
			replacer.parent = this.parent;
			//replacer.index = -1;
			*/
			
			this.parent.setExpression(replacer);
		}
		
		this.parent = null;
	}
	
	canHaveChildren(count)  { throw new Error("Expression is an abstract class"); }
	canInsertChildAt(index) { return this.canHaveChildren(this.children.length + 1); }
	canRemoveChildAt(index) { return this.canHaveChildren(this.children.length - 1); }
	
	set(name, value) { throw new Error("Invalid attribute [" + name + "]"); }
	get(name)        { throw new Error("Invalid attribute [" + name + "]"); }
	
	getSerializationNames()                    { return null; }
	async getSerializationStrings()            { return null; }
	setSerializationStrings(strings, promises) { throw new Error("Expression has no attributes"); }
	
	async toXML() {
		let doc = document.implementation.createDocument("", "", null);
		doc.appendChild(await this.getXMLElement(doc, null));
		return doc;
	}
	
	async getXMLElement(doc, moduleNames) {
		let element = doc.createElement("expression");
		let tag = this.getTag();
		element.setAttribute("tag", tag);
		
		if (moduleNames != null) {
			let moduleName = Formulae.moduleNameMap.get(tag);
			if (moduleName !== undefined) {
				if (!moduleNames.includes(moduleName)) {
					moduleNames.push(moduleName);
				}
			}
		}
		
		let names = this.getSerializationNames();
		
		if (names != null) {
			let strings = await this.getSerializationStrings();
			let i, n = names.length;
			for (i = 0; i < n; ++i) {
				element.setAttribute(names[i], strings[i]);
			}
		}
		
		//this.children.forEach(
		//	child => {
		//		let e = await child.getXMLElement(doc, moduleNames);
		//		element.appendChild(e);
		//	}
		//);
		
		for (let i = 0, n = this.children.length; i < n; ++i) {
			element.appendChild(await this.children[i].getXMLElement(doc, moduleNames));
		}
		
		return element;
	}
	
	fromPoint(x, y, offsetX, offsetY) {
		//if (this.isAbsolutePositioning()) {
		if (this.isShapedByChunks()) {
			let rectangle;
			
			for (let r = this.rectangles.minLine, R = this.rectangles.maxLine; r <= R; ++r) {
				rectangle = this.rectangles[r];
				
				if (x >= rectangle.x && y >= rectangle.y && x < rectangle.x + rectangle.width && y < rectangle.y + rectangle.height) {
					let child, test;
					for (let i = 0, n = this.children.length; i < n; ++i) {
						child = this.children[i];
						test = child.fromPoint(x, y, rectangle.x + child.x, rectangle.y + child.y);
						if (test != null) return test;
					}
					
					return this;
				}
			}
			
			return null;
		}
		
		////////////////////////////
		
		// x -= offsetX;
		// y -= offsetY;
		
		// if (x < 0 || y < 0 || x > this.width || y > this.height) return null;
		if (x < offsetX || y < offsetY || x > offsetX + this.width || y > offsetY + this.height) return null;
		
		let child, test;
		for (let i = 0, n = this.children.length; i < n; ++i) {
			child = this.children[i];
			//test = child.fromPoint(x, y, child.x, child.y);
			test = child.fromPoint(x, y, offsetX + child.x, offsetY + child.y);
			if (test != null) return test;
		}
		
		return this;
	}
	
	getRectangle(h) {
		let rectangle;
		
		if (h) {
			rectangle = new Rectangle(this.x - 0.5, this.y - 0.5, this.width + 1, this.height + 1);
		}
		else {
			rectangle = new Rectangle(this.x, this.y, this.width, this.height);
		}
		
		let expr = this;
		while ((expr = expr.parent) instanceof Expression) {
			rectangle.x += expr.x;
			rectangle.y += expr.y;
		}
		
		return rectangle;
	}
	
	isChildAbsolutePositioning(i) {
		return false;
	}
	
	isAbsolutePositioning() { // final
		if (this.parent instanceof Expression) {
			return this.parent.isChildAbsolutePositioning(this.index);
		}
		else {
			return false;
		}
	}
	
	isChildShapedByChunks(i) {
		return false;
	}
	
	isShapedByChunks() { // final
		if (this.parent instanceof Expression) {
			return this.parent.isChildShapedByChunks(this.index);
		}
		else {
			// subexpression of an expression handler is never a chunk
			return false;
		}
	}
	
	drawHighlightedShape(context) {
		//if (this.isAbsolutePositioning()) {
		if (this.isShapedByChunks()) {
			let rectangle;
			
			for (let r = this.rectangles.minLine, R = this.rectangles.maxLine; r <= R; ++r) {
				rectangle = this.rectangles[r];
				context.strokeRect(rectangle.x - 0.5, rectangle.y - 0.5, rectangle.width + 1, rectangle.height + 1);
			}
			
			return;
		}
		
		///////////////////
		
		let x = this.x;
		let y = this.y;
		let expr = this;
		
		while ((expr = expr.parent) instanceof Expression) {
			x += expr.x;
			y += expr.y;
		}
		
		context.strokeRect(x - 0.5, y - 0.5, this.width + 1, this.height + 1);
	}
	
	drawSelecionShape(context) {
		//if (this.isAbsolutePositioning()) {
		if (this.isShapedByChunks()) {
			let rectangle;
			
			for (let r = this.rectangles.minLine, R = this.rectangles.maxLine; r <= R; ++r) {
				rectangle = this.rectangles[r];
				context.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
			}
			
			return;
		}
		
		///////////////////
		
		let x = this.x;
		let y = this.y;
		let expr = this;
		
		while ((expr = expr.parent) instanceof Expression) {
			x += expr.x;
			y += expr.y;
		}
		
		context.fillRect(x, y, this.width, this.height);
	}
	
	// final
	moveOut(direction) {
		if (this.parent instanceof Expression) {
			return this.parent.moveAcross(this.index, direction);
		}
		else {
			return null;
		}
	}
	
	moveAcross(i, direction) {
		if (direction == Expression.PREVIOUS) {
			if (i > 0) {
				return this.children[i - 1].moveTo(direction);
			}
		}
		else if (direction == Expression.NEXT) {
			if (i < this.children.length - 1) {
				return this.children[i + 1].moveTo(direction);
			}
		}
		
		return this.moveOut(direction);
	}
	
	moveTo(direction) {
		let n = this.children.length;
		
		if (n == 0) return this;
		
		if (direction == Expression.PREVIOUS) {
			return this.children[n - 1].moveTo(direction);
		}
		else {
			return this.children[0].moveTo(direction);
		}
	}
	
	// parentheses
	
	parenthesesAsOperator() { return false; }
	parenthesesWhenSuperSubscripted() { return false; }
	
	drawParentheses(context, x, y, height, opening) {
		context.beginPath();
		
		if (opening) {
			context.moveTo(x + 2, y             ); //   .
			context.lineTo(x    , y + 2         ); //  /
			context.lineTo(x    , y + height - 2); //  |
			context.lineTo(x + 2, y + height    ); //  \
		}
		else {
			context.moveTo(x - 2, y             ); // .
			context.lineTo(x    , y + 2         ); //  \
			context.lineTo(x    , y + height - 2); //  |
			context.lineTo(x - 2, y + height    ); //  /
		}
		
		context.stroke();
	}
	
	drawParenthesesAround(context, x, y) {
		this.drawParentheses(context, x - 4,              y, this.height, true );
		this.drawParentheses(context, x + 4 + this.width, y, this.height, false);
	}
	
	// display
	
	drawText(context, text, x, y, invertingOffset) {
		if (Formulae.ltr) {
			context.fillText(text, x, y);
		}
		else {
			if (invertingOffset === undefined) {
				context.scale(-1, 1);
				context.fillText(text, -x, y);
				context.scale(-1, 1);
			}
			else {
				context.fillText(text, x + invertingOffset, y);
			}
		}
	}
	
	prepareDisplayAsLiteral(context) {
		this.width = Math.round(context.measureText(this.getLiteral()).width);
		this.height = context.fontInfo.size;
		this.horzBaseline = Math.round(this.height / 2);
		this.vertBaseline = Math.round(this.width / 2);
	}
	
	displayAsLiteral(context, x, y) {
		if (this.color === undefined) {
			this.drawText(context, this.getLiteral(), x, y + context.fontInfo.size);
		}
		else {
			let bkpFillStyle = context.fillStyle;
			context.fillStyle = this.color;
			this.drawText(context, this.getLiteral(), x, y + context.fontInfo.size);
			context.fillStyle = bkpFillStyle;
		}
	}
	
	prepareDisplayAsList(context, widthBefore, widthAfter) {
		this.width = widthBefore; // mnemonic + space + opening parentheses
		
		if (this.children.length == 0) {
			this.width += widthAfter; // closing parentheses
			this.height = context.fontInfo.size;
			this.horzBaseline = Math.round(this.height / 2);
		}
		else {
			this.separatorWidth = Math.round(context.measureText("\uFF0C").width);
			//this.horzBaseline = 0;
			//let maxSemiHeight = 0;
			
			this.horzBaseline = context.fontInfo.semiHeight;
			let maxSemiHeight = context.fontInfo.semiHeight;
			
			let child;
			for (var i = 0; i < this.children.length; ++i) {
				child = this.children[i];
				child.prepareDisplay(context);
				
				//if (i > 0) this.width += 2 + this.separatorWidth + 2;
				if (i > 0) this.width += this.separatorWidth;
				
				child.x = this.width;
				
				this.width += child.width;
				
				if (child.horzBaseline > this.horzBaseline) this.horzBaseline = child.horzBaseline;
				if (child.height - child.horzBaseline > maxSemiHeight) maxSemiHeight = child.height - child.horzBaseline;
			}
			
			this.width += widthAfter; // closing parentheses
			
			for (var i = 0; i < this.children.length; ++i) {
				child = this.children[i];
				child.y = this.horzBaseline - child.horzBaseline;
			}
			
			this.height = this.horzBaseline + maxSemiHeight;
		}
		
		this.vertBaseline = Math.round(this.width / 2);
	}
	
	displayAsList(context, x, y) {
		let child;
		for (var i = 0; i < this.children.length; ++i) {
			child = this.children[i];
			if (i > 0) this.drawText(context, "\uFF0C", x + child.x - this.separatorWidth, y + this.horzBaseline + Math.round(context.fontInfo.size / 2));
			child.display(context, x + child.x, y + child.y);
		}
	}
	
	prepareDisplayAsFunction(context) {
		this.mnemonicWidth = Math.round(context.measureText(this.getMnemonic()).width);
		
		this.prepareDisplayAsList(
			context,
			this.mnemonicWidth + 2 + (this.noParentheses === undefined ? 4 : 0),
			this.noParentheses === undefined ? 4 : 0
		);
	}
	
	displayAsFunction(context, x, y) {
		if (this.color === undefined) {
			this.drawText(context, this.getMnemonic(), x, y + this.horzBaseline + Math.round(context.fontInfo.size / 2));
		}
		else {
			let bkpColor = context.fillStyle;
			context.fillStyle = this.color;
			this.drawText(context, this.getMnemonic(), x, y + this.horzBaseline + Math.round(context.fontInfo.size / 2));
			context.fillStyle = bkpColor;
		}
		
		if (this.noParentheses === undefined) this.drawParentheses(context, x + this.mnemonicWidth + 2, y, this.height, true);
		
		this.displayAsList(context, x, y);
		
		if (this.noParentheses === undefined) this.drawParentheses(context, x + this.width, y, this.height, false);
	}
	
	prepareDisplay(context) {}
	display(context, x, y) {}
	
	evaluate() {
		throw new EvaluationError();
	}
	
	isInternalNumber() {
		return false;
	}
	
	isLineIterable() { return false; };
}

// static fields

Expression.UP       = 1;
Expression.DOWN     = 2;
Expression.PREVIOUS = 3;
Expression.NEXT     = 4;

Expression.FixedExpression = class extends Expression {
	canInsertChildAt(index) { return false; }
	canRemoveChildAt(index) { return false; }
}

Expression.NullaryExpression = class extends Expression.FixedExpression {
	canHaveChildren(count) { return count == 0; }
	isReduced() { return true; }
}

Expression.UnaryExpression = class extends Expression.FixedExpression {
	canHaveChildren(count) { return count == 1; }
}

Expression.BinaryExpression = class extends Expression.FixedExpression {
	canHaveChildren(count) { return count == 2; }
}

Expression.OperatorExpression = class extends Expression {
	canHaveChildren(count)  { return count >= 2; }
}

Expression.Function = class extends Expression {
	constructor() {
		super();
		this.min = this.max = 1;
	}
	
	canHaveChildren(count) {
		if (this.min < 0) {
			return count >= -this.min;
		}
		else {
			return count >= this.min && count <= this.max;
		}
	}
	
	prepareDisplay(context) { this.prepareDisplayAsFunction(context); }
	display(context, x, y) { this.displayAsFunction(context, x, y); }
}

Expression.Infix = class extends Expression {
	constructor() {
		super();
		this.parentheses = true;
		this.gap = 5;
	}
	
	canHaveChildren(count) {
		if (this.min < 0) {
			return count >= -this.min;
		}
		else {
			return count >= this.min && count <= this.max;
		}
	}
	
	parenthesesAsOperator() { return true; }
	parenthesesWhenSuperSubscripted() { return true; }
	
	prepareDisplay(context) {
		if (this.bold === undefined) {
			this.operatorWidth = Math.round(context.measureText(this.getOperator()).width);
		}
		else {
			let bkpBold = context.fontInfo.bold;
			context.fontInfo.setBold(context, true);
			this.operatorWidth = Math.round(context.measureText(this.getOperator()).width);
			context.fontInfo.setBold(context, bkpBold);
		}
		
		this.width = 0;
		this.horzBaseline = 0;
		
		let i, n = this.children.length;
		let child;
		let parentheses;
		let maxSemiHeight = 0;
		
		for (i = 0; i < n; ++i) {
			(child = this.children[i]).prepareDisplay(context);
			parentheses = this.parentheses && child.parenthesesAsOperator();
			
			if (parentheses) this.width += 4;
			
			if (i > 0) this.width += this.gap + this.operatorWidth + this.gap; // gap
			
			child.x = this.width;
			this.width += child.width;
			
			if (parentheses) this.width += 4;
			
			if (child.horzBaseline > this.horzBaseline) this.horzBaseline = child.horzBaseline;
			if (child.height - child.horzBaseline > maxSemiHeight) maxSemiHeight = child.height - child.horzBaseline;
		}
		
		for (i = 0; i < n; ++i) {
			child = this.children[i];
			child.y = this.horzBaseline - child.horzBaseline;
		}
		
		this.vertBaseline = Math.round(this.width / 2);
		this.height = this.horzBaseline + maxSemiHeight;
	}
	
	display(context, x, y) {
		let i, n = this.children.length;
		let child;
		let parentheses;
		
		for (i = 0; i < n; ++i) {
			child = this.children[i];
			parentheses = this.parentheses && child.parenthesesAsOperator();
			
			if (i > 0) {
				let bkpBold, bkpFillStyle;
				
				if (this.bold !== undefined) {
					bkpBold = context.fontInfo.bold;
					context.fontInfo.setBold(context, true);
				}
				
				if (this.color !== undefined) {
					bkpFillStyle = context.fillStyle;
					context.fillStyle = this.color;
				}
				
				super.drawText(
					context,
					this.getOperator(), x + child.x - this.gap - this.operatorWidth - (parentheses ? 4 : 0), // 5 = gap
					y + this.horzBaseline + Math.round(context.fontInfo.size / 2),
					this.inverted === undefined ? undefined : this.operatorWidth
				);
				
				if (this.color !== undefined) {
					context.fillStyle = bkpFillStyle;
				}
				
				if (this.bold !== undefined) {
					context.fontInfo.setBold(context, bkpBold);
				}
			}
			
			if (parentheses) {
				child.drawParenthesesAround(context, x + child.x, y + child.y);
			}
			
			child.display(context, x + child.x, y + child.y);
		}
	}
}

Expression.Exponentiation = class extends Expression.BinaryExpression {
	prepareDisplay(context) {
		let base = this.children[0];
		let exponent = this.children[1];
		
		let parenthesesBase =
			base.parenthesesAsOperator() ||
			base.parenthesesWhenSuperSubscripted() ||
			base.getTag() == this.getTag()
		;
		//let parenthesesExponent = exponent.getTag() == this.getTag();
		let parenthesesExponent = false;
		
		base.prepareDisplay(context);
		
		{
			let bkp = context.fontInfo.size;
			context.fontInfo.setSizeRelative(context, -4);
			
			exponent.prepareDisplay(context);
			
			context.fontInfo.setSizeAbsolute(context, bkp);
		}
		
		this.width = 0;
		
		if (parenthesesBase) this.width += 4;
		base.x = this.width;
		this.width += base.width;
		if (parenthesesBase) this.width += 4;
		
		this.width += 2; // space between base & exponent
		
		if (parenthesesExponent) this.width += 4;
		exponent.x = this.width;
		this.width += exponent.width;
		if (parenthesesExponent) this.width += 4;
		
		exponent.y = 0;
		
		if (base.height >= exponent.height) {
			this.horzBaseline = exponent.horzBaseline + base.horzBaseline;
			this.height = exponent.horzBaseline + base.height;
			base.y = exponent.horzBaseline;
		}
		else {
			this.horzBaseline = exponent.height;
			this.height = exponent.height + base.height - base.horzBaseline;
			base.y = exponent.height - base.horzBaseline;
		}
		
		this.vertBaseline = base.x + base.vertBaseline;
	}
	
	display(context, x, y) {
		// base
		let expr = this.children[0];
		
		expr.display(context, x + expr.x, y + expr.y);
		
		if (
			expr.parenthesesAsOperator() ||
			expr.parenthesesWhenSuperSubscripted() ||
			expr.getTag() == this.getTag()
		) {
			expr.drawParenthesesAround(context, x + expr.x, y + expr.y);
		}
		
		// exponent
		expr = this.children[1];
		
		{
			let bkp = context.fontInfo.size;
			context.fontInfo.setSizeRelative(context, -4);
			
			expr.display(context, x + expr.x, y + expr.y);
			
			context.fontInfo.setSizeAbsolute(context, bkp);
		}
		
		//if (expr.getTag() == this.getTag()) {
		//	expr.drawParenthesesAround(context, x + expr.x, y + expr.y);
		//}
	}
}

Expression.Literal = class extends Expression.NullaryExpression {
	prepareDisplay(context) { this.prepareDisplayAsLiteral(context); }
	display(context, x, y) { this.displayAsLiteral(context, x, y); }
}

Expression.PrefixedLiteral = class extends Expression.UnaryExpression {
	constructor() {
		super();
		this.parentheses = true;
		this.space = 3;
	}
	
	prepareDisplay(context) {
		let bkpBold;
		
		if (this.bold) {
			bkpBold = context.fontInfo.bold;
			context.fontInfo.setBold(context, true);
		}
		
		this.width = Math.round(context.measureText(this.getLiteral()).width) + this.space;
		
		if (this.bold) {
			context.fontInfo.setBold(context, bkpBold);
		}
		
		let child = this.children[0];
		child.prepareDisplay(context);
		
		let parentheses = this.parentheses && child.parenthesesAsOperator();
		if (parentheses) this.width += 4;
		
		child.x = this.width;
		child.y = 0;
		this.vertBaseline = child.x + child.vertBaseline;
		this.width += child.width;
		
		if (parentheses) this.width += 4;
		
		this.height = child.height;
		this.horzBaseline = child.horzBaseline;
	}
	
	display(context, x, y) {
		let child = this.children[0];
		
		let bkpBold, bkpFillStyle;
		
		if (this.bold) {
			bkpBold = context.fontInfo.bold;
			context.fontInfo.setBold(context, true);
		}
		
		if (this.color !== undefined) {
			bkpFillStyle = context.fillStyle;
			context.fillStyle = this.color;
		}
		
		super.drawText(context, this.getLiteral(), x, y + child.y + child.horzBaseline + Math.round(context.fontInfo.size / 2));
		
		if (this.bold) {
			context.fontInfo.setBold(context, bkpBold);
		}
		
		if (this.color !== undefined) {
			context.fillStyle = bkpFillStyle;
		}
		
		if (this.parentheses && child.parenthesesAsOperator()) child.drawParenthesesAround(context, x + child.x, y + child.y);
		child.display(context, x + child.x, y + child.y);
	}
}

Expression.SuperscriptedLiteral = class extends Expression.UnaryExpression {
	prepareDisplay(context) {
		let child = this.children[0];
		
		let parentheses =
			child.parenthesesAsOperator() ||
			child.parenthesesWhenSuperSubscripted()
		;
		
		this.literalWidth = Math.round(context.measureText(this.getLiteral()).width);
		
		child.prepareDisplay(context);
		
		this.width = 0;
		
		if (parentheses) this.width += 4;
		
		child.x = this.width;
		child.y = Math.round(context.fontInfo.size / 2);
		this.width += child.width;
		
		if (parentheses) this.width += 4;
		
		this.width += 2 + this.literalWidth;
		
		this.height = child.y + child.height;
		this.horzBaseline = child.y + child.horzBaseline;
		this.vertBaseline = child.vertBaseline;
	}
	
	display(context, x, y) {
		let child = this.children[0];
		
		if (child.parenthesesAsOperator() || child.parenthesesWhenSuperSubscripted()) {
			child.drawParenthesesAround(context, x + child.x, y + child.y);
		}
		
		child.display(context, x + child.x, y + child.y);
		super.drawText(context, this.getLiteral(), x + this.width - this.literalWidth, y + context.fontInfo.size);
	}
}

Expression.SummationLike = class extends Expression {
	constructor() {
		super();
		
		this.widthSymbol = 0;
		this.heightSymbol = 0;
		
		this.vertBaselineSymbol = 0;
	}
	
	canHaveChildren(count) { return count >= 2 && count <= 5; }
	parenthesesAsOperator() { return true; }
	parenthesesWhenSuperSubscripted() { return true; }
	
	prepareDisplay(context) {
		let n = this.children.length;
		let baselineTop,    maxSemiHeightTop,    widthTop;
		let baselineBottom, maxSemiHeightBottom, widthBottom;
		
		let ch0 = this.children[0];
		ch0.prepareDisplay(context);
		
		{
			let bkp = context.fontInfo.size;
			context.fontInfo.setSizeRelative(context, -4);
			
			for (let i = 1; i < n; ++i) {
				this.children[i].prepareDisplay(context);
			}
			
			this.commaWidth = Math.floor(context.measureText(", ").width);
			this.equalsWidth = Math.floor(context.measureText("=").width);
			
			context.fontInfo.setSizeAbsolute(context, bkp);
		}
		
		// top
		
		if (n === 5) { // with increment
			let ch3 = this.children[3];
			let ch4 = this.children[4];
			baselineTop = Math.max(ch3.horzBaseline, ch4.horzBaseline);
			maxSemiHeightTop = Math.max(ch3.height - ch3.horzBaseline, ch4.height - ch4.horzBaseline);
			widthTop = ch3.width + 2 + this.commaWidth + 2 + ch4.width;
		}
		else {
			let ch = this.children[n - 1];
			baselineTop = ch.horzBaseline;
			maxSemiHeightTop = ch.height - ch.horzBaseline;
			widthTop = ch.width;
		}
		
		// bottom
		
		if (n >= 4) {
			let ch1 = this.children[1];
			let ch2 = this.children[2];
			baselineBottom = Math.max(ch1.horzBaseline, ch2.horzBaseline);
			maxSemiHeightBottom = Math.max(ch1.height - ch1.horzBaseline, ch2.height - ch2.horzBaseline);
			widthBottom = ch1.width + 1 + this.equalsWidth + ch2.width;
		}
		else if (n == 3) {
			let ch1 = this.children[1];
			baselineBottom = ch1.horzBaseline;
			maxSemiHeightBottom = ch1.height - ch1.horzBaseline;
			widthBottom = ch1.width;
		}
		else { // n == 2
			baselineBottom = 0;
			maxSemiHeightBottom = 0;
			widthBottom = 0;
		}
		
		this.width = Math.max(widthTop, this.widthSymbol, widthBottom);
		let SPACE = 0;
		this.horzBaseline = Math.max(
			baselineTop + maxSemiHeightTop + SPACE + Math.floor(this.heightSymbol / 2),
			ch0.horzBaseline
		);
		this.vertBaselineSymbol = Math.floor(this.width / 2);
		this.height = this.horzBaseline + Math.max(
			Math.floor(this.heightSymbol / 2) + SPACE + baselineBottom + maxSemiHeightBottom,
			ch0.height - ch0.horzBaseline
		);
		baselineTop = this.horzBaseline - Math.floor(this.heightSymbol / 2) - SPACE - maxSemiHeightTop;
		baselineBottom += this.horzBaseline + Math.floor(this.heightSymbol / 2) + SPACE;
		
		// child position
		
		if (n == 2) {
			let ch1 = this.children[1];
			ch1.x = Math.floor((this.width - widthTop) / 2);
			ch1.y = baselineTop - ch1.horzBaseline;
		}
		else if (n == 3) {
			let ch1 = this.children[1];
			let ch2 = this.children[2];
			ch1.x = Math.floor((this.width - widthBottom) / 2); ch1.y = baselineBottom - ch1.horzBaseline;
			ch2.x = Math.floor((this.width - widthTop   ) / 2); ch2.y = baselineTop    - ch2.horzBaseline;
		}
		else if (n == 4) {
			let ch1 = this.children[1];
			let ch2 = this.children[2];
			let ch3 = this.children[3];
			ch1.x = Math.floor((this.width - widthBottom) / 2);   ch1.y = baselineBottom - ch1.horzBaseline;
			ch2.x = ch1.x + ch1.width + 2 + this.equalsWidth + 2; ch2.y = baselineBottom - ch2.horzBaseline;
			ch3.x = Math.floor((this.width - widthTop   ) / 2);   ch3.y = baselineTop    - ch3.horzBaseline;
		}
		else { // n == 5
			let ch1 = this.children[1];
			let ch2 = this.children[2];
			let ch3 = this.children[3];
			let ch4 = this.children[4];
			ch1.x = Math.floor((this.width - widthBottom) / 2);   ch1.y = baselineBottom - ch1.horzBaseline;
			ch2.x = ch1.x + ch1.width + 2 + this.equalsWidth + 2; ch2.y = baselineBottom - ch2.horzBaseline;
			ch3.x = Math.floor((this.width - widthTop   ) / 2);   ch3.y = baselineTop    - ch3.horzBaseline;
			ch4.x = ch3.x + ch3.width + 1 + this.commaWidth;      ch4.y = baselineTop    - ch4.horzBaseline;
		}
		
		this.width += 5;
		ch0.x = this.width;
		this.width += ch0.width;
		ch0.y = this.horzBaseline - ch0.horzBaseline;
		this.vertBaseline = Math.floor(this.width / 2);
		
	}
	
	display(context, x, y) {
		let n = this.children.length;
		
		let child = this.children[0];
		child.display(context, x + child.x, y + child.y);
		
		/////////////////////////////////////////////
		
		let bkp = context.fontInfo.size;
		context.fontInfo.setSizeRelative(context, -4);
		
		if (n >= 4) {
			let ch2 = this.children[2];
			super.drawText(context, "=", x + ch2.x - 2 - this.equalsWidth, y + ch2.y + ch2.horzBaseline + Math.round(context.fontInfo.size / 2));
		}
		
		if (n == 5) {
			let ch4 = this.children[4];
			super.drawText(context, ", ", x + ch4.x - this.commaWidth, y + ch4.y + ch4.horzBaseline + Math.round(context.fontInfo.size / 2));
		}
		
		for (let i = 1; i < n; ++i) {
			(child = this.children[i]).display(context, x + child.x, y + child.y);
		}
		
		context.fontInfo.setSizeAbsolute(context, bkp);
	}
	
	moveAcross(i, direction) {
		let n = this.children.length;
		let newSon = 0;
		
		if (direction == Expression.PREVIOUS) {
			newSon = Expression.SummationLike.P[n - 2][i];
		}
		else if (direction == Expression.NEXT) {
			newSon = Expression.SummationLike.N[n - 2][i];
		}
		else if (direction == Expression.UP) {
			newSon = Expression.SummationLike.U[n - 2][i];
		}
		else if (direction == Expression.DOWN) {
			newSon = Expression.SummationLike.D[n - 2][i];
		}
		
		if (newSon != -1) return this.children[newSon].moveTo(direction);
		
		return this.moveOut(direction);
	}
	
	moveTo(direction) {
		let n = this.children.length;
		
		if (direction != Expression.UP) {
			if (n <= 4) {
				return this.children[n - 1].moveTo(direction);
			}
			else { // n == 5
				return this.children[3].moveTo(direction);
			}
		}
		
		if (direction != Expression.UP) {
			return this.children[0].moveTo(direction);
		}
		else { // UP
			return this.children[n == 2 ? 0 : 1].moveTo(Expression.UP);
		}
	}
}

Expression.SummationLikeSymbol = class extends Expression.SummationLike {
	constructor() {
		super();
		
		this.symbol = "";
	}
	
	prepareDisplay(context) {
		this.heightSymbol = Math.floor(context.fontInfo.size * 2);
		
		let bkp = context.fontInfo.size;
		context.fontInfo.setSizeAbsolute(context, this.heightSymbol);
		this.widthSymbol = Math.floor(context.measureText(this.symbol).width);
		console.log(context.measureText(this.symbol));
		context.fontInfo.setSizeAbsolute(context, bkp);
		
		super.prepareDisplay(context);
	}
	
	display(context, x, y) {
		let bkpSize = context.fontInfo.size;
		let bkpTextBaseline = context.textBaseline;
		
		context.fontInfo.setSizeAbsolute(context, this.heightSymbol);
		context.textBaseline = "middle";
		
		super.drawText(
			context,
			this.symbol,
			x + this.vertBaselineSymbol - Math.round(this.widthSymbol / 2),
			//y + this.horzBaseline + Math.round(this.heightSymbol / 2)
			y + this.horzBaseline
		);
		
		context.fontInfo.setSizeAbsolute(context, bkpSize);
		context.textBaseline = bkpTextBaseline;
		
		super.display(context, x, y);
	}
}

Expression.SummationLike.P = [
	[ 1, -1, -1, -1, -1 ],
	[ 2, -1, -1, -1, -1 ],
	[ 3, -1,  1, -1, -1 ],
	[ 4, -1,  1, -1,  3 ]
];
Expression.SummationLike.N = [
	[ -1, 0, -1, -1, -1 ],
	[ -1, 0,  0, -1, -1 ],
	[ -1, 2,  0,  0, -1 ],
	[ -1, 2,  0,  4,  0 ]
];
Expression.SummationLike.U = [
	[ -1, -1, -1, -1, -1 ],
	[ -1,  2, -1, -1, -1 ],
	[ -1,  3,  3, -1, -1 ],
	[ -1,  3,  4, -1, -1 ]
];
Expression.SummationLike.D = [
	[ -1, -1, -1, -1, -1 ],
	[ -1, -1,  1, -1, -1 ],
	[ -1, -1, -1,  1, -1 ],
	[ -1, -1, -1,  1,  2 ]
];

Expression.LabelExpression = class extends Expression.NullaryExpression {
	getColor() { return "#FFFF99"; }
	
	prepareDisplay(context) {
		this.width = Math.ceil(context.measureText(this.getLabel()).width);
		this.height = context.fontInfo.size;
		this.vertBaseline = Math.round(this.width / 2);
		this.horzBaseline = Math.round(this.height / 2);
	}
	
	display(context, x, y) {
		let bkpFillStyle = context.fillStyle;
		let bkpStrokeStyle = context.strokeStyle;
		
		context.fillStyle = this.getColor();
		context.strokeStyle = "lightGray";
		
		context.fillRect(x, y, this.width, this.height);
		context.strokeRect(x, y, this.width, this.height);
		
		context.fillStyle = bkpFillStyle;
		context.strokeStyle = bkpStrokeStyle;
		
		super.drawText(context, this.getLabel(), x, y + this.height);
	}
}

Expression.CodeLabelExpression = class extends Expression.LabelExpression {
	set(name, value) {
		if (name == "Value") {
			this.code = value;
		}
		else {
			super.set(name, value);
		}
	}
	
	get(name) {
		if (name == "Value") {
			return this.code;
		}
		
		super.get(name);
	}
	
	setSerializationStrings(strings, promises) {
		this.set("Value", strings[0]);
	}
	
	getSerializationNames() {
		return [ "Value" ];
	}
	
	async getSerializationStrings() {
		return [ this.code ];
	}
};

Expression.Null = class extends Expression.NullaryExpression {
	getTag() { return "Null"; }
	getName() { return "Null"; }
	
	prepareDisplay(context) {
		this.x = this.y = 0;
		this.width = Math.round(context.fontInfo.size * 0.618); // golden ratio
		this.height = context.fontInfo.size;
		this.horzBaseline = Math.round(this.height / 2);
		this.vertBaseline = Math.round(this.width / 2);
	}
	
	display(context, x, y) {
		//context.fillRect(x, y, this.width, this.height);
		context.strokeRect(x + 0.5, y + 0.5, this.width - 1, this.height - 1);
	}
}

Expression.Undefined = class extends Expression.LabelExpression {
	getTag() { return "Undefined"; }
	getName() { return "Undefined"; }
	getLabel() { return "Undefined"; }
}

Expression.ErrorExpression = class extends Expression.UnaryExpression {
	getTag() { return "Error"; }
	getName() { return "Error"; }
	
	set(name, value) {
		if (name == "Description") {
			this.description = value;
		}
		else {
			super.set(name, value);
		}
	}
	
	get(name) {
		if (name == "Description") {
			return this.description;
		}
		
		super.get(name);
	}
	
	setSerializationStrings(strings, promises) {
		this.set("Description", strings[0]);
	}
	
	getSerializationNames() {
		return [ "Description" ];
	}
	
	async getSerializationStrings() {
		return [ this.description ];
	}
	
	prepareDisplay(context) {
		let expr = this.children[0];
		
		expr.prepareDisplay(context);
		
		expr.x = 10;
		expr.y = 10 + context.fontInfo.size + 20;
		
		this.width = 10 + Math.max(expr.width, Math.round(context.measureText(this.description).width)) + 10;
		this.height = expr.y + expr.height + 10;
		
		this.horzBaseline = expr.y + expr.horzBaseline;
		this.vertBaseline = 10 + expr.vertBaseline;
	}
	
	display(context, x, y) {
		let expr = this.children[0];
		
		let bkpFillStyle = context.fillStyle;
		let bkpStrokeStyle = context.strokeStyle;
		
		context.fillStyle = "red";
		context.strokeStyle = "red";
		
		context.strokeRect(x, y, this.width, this.height);
		context.beginPath();
		context.moveTo (x, y + expr.y - 10); context.lineTo(x + this.width, y + expr.y - 10); // preventing obfuscation
		context.stroke();
		
		super.drawText(context, this.description, x + 10, y + 10 + context.fontInfo.size);
		
		context.fillStyle = bkpFillStyle;
		context.strokeStyle = bkpStrokeStyle;
		
		expr.display(context, x + expr.x, y + expr.y);
	}
}

// editions

Expression.replacingEdition = function(tag) {
	let newExpression = Formulae.createExpression(tag);
	Formulae.sExpression.replaceBy(newExpression);
	
	Formulae.sHandler.prepareDisplay();
	Formulae.sHandler.display();
	Formulae.setSelected(Formulae.sHandler, newExpression, false);
}

Expression.wrapperEdition = function(tag) {
	let newExpression = Formulae.createExpression(tag);
	Formulae.sExpression.replaceBy(newExpression);
	newExpression.addChild(Formulae.sExpression);
	
	Formulae.sHandler.prepareDisplay();
	Formulae.sHandler.display();
	Formulae.setSelected(Formulae.sHandler, Formulae.sExpression, false);
}

Expression.binaryEdition = function(tag, nullFirst) {
	let nullExpr = new Expression.Null();
	let newExpr = Formulae.createExpression(tag);
	
	Formulae.sExpression.replaceBy(newExpr);
	newExpr.addChild(nullFirst ? nullExpr : Formulae.sExpression);
	newExpr.addChild(nullFirst ? Formulae.sExpression : nullExpr);
	
	Formulae.sHandler.prepareDisplay();
	Formulae.sHandler.display();
	Formulae.setSelected(Formulae.sHandler, nullExpr, false);
}

Expression.multipleEdition = function(tag, n, i) {
	let newExpr = Formulae.createExpression(tag);
	Formulae.sExpression.replaceBy(newExpr);
	
	for (let x = 0; x < n; ++x) {
		newExpr.addChild(x == i ? Formulae.sExpression : new Expression.Null());
	}
	
	Formulae.sHandler.prepareDisplay();
	Formulae.sHandler.display();
	Formulae.setSelected(Formulae.sHandler, Formulae.sExpression, false);
}

