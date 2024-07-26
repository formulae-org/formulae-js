'use strict';

class Formulae {}

Formulae.scriptAtStart = true;
Formulae.timeZone = null;
Formulae.fontSize = null;
Formulae.ltr = true;
Formulae.readMode = true;
Formulae.parameters = new URL(window.location.href).searchParams;
//Formulae.pathName = new URL(window.location.href).pathname;

Formulae.remoteServers = [ "https://server.formulae.org" ];
Formulae.localServer = "http://localhost:8001";
Formulae.serverType = 0; // 0 - browser, 1 - local, 2 - remote

Formulae.clipboard = ""
Formulae.fileName = null;
Formulae.fileTitle = null;
Formulae.lastWidth = 0; // for dragging

Formulae.main = null;
Formulae.menu = null;
Formulae.modal = null;
Formulae.modalContent = null;
Formulae.s_info = null
Formulae.h_info = null

Formulae.hExpression  = null;
Formulae.hHandler     = null;
Formulae.sExpression  = null;
Formulae.sHandler     = null;
Formulae.handlers     = [];

Formulae.ROW_INPUT      = 0;
Formulae.ROW_OUTPUT     = 1;
Formulae.ROW_PERSISTENT = 2;
Formulae.ROW_EXPORT     = 3;

Formulae.classesMap    = new Map(); // map from tag to expression
Formulae.actionMap     = new Map(); // map from tag to action
Formulae.moduleNameMap = new Map(); // map from tag to module name

Formulae.PackageInfo = class {
	constructor(description, required, commonRequired) {
		this.description = description;
		this.required = required;
		this.commonRequired = commonRequired;
		
		this.messages = null;
		this.common = null;
		
		this.classExpression = null;
		this.classEdition = null;
		this.classReduction = null;
		
		this.reducersSet = false;
	}
};

Formulae.packages = new Map(); // Map from package name to package info

// Basic packages

//                                                                                                       default  common
Formulae.packages.set("org.formulae.math.arithmetic",     new Formulae.PackageInfo("Arithmetic",            true,  false));
Formulae.packages.set("org.formulae.algebra",             new Formulae.PackageInfo("Algebra",               true,  false));
Formulae.packages.set("org.formulae.math.complex",        new Formulae.PackageInfo("Complex",               true,  false));
Formulae.packages.set("org.formulae.relation",            new Formulae.PackageInfo("Relation",              true,  false));
Formulae.packages.set("org.formulae.logic",               new Formulae.PackageInfo("Logic",                 true,  false));
Formulae.packages.set("org.formulae.expression",          new Formulae.PackageInfo("Expression management", true,  false));
Formulae.packages.set("org.formulae.list",                new Formulae.PackageInfo("Lists",                 true,  false));
Formulae.packages.set("org.formulae.symbolic",            new Formulae.PackageInfo("Symbolic",              true,  false));
Formulae.packages.set("org.formulae.text.string",         new Formulae.PackageInfo("Strings",               true,  false));
Formulae.packages.set("org.formulae.color",               new Formulae.PackageInfo("Color",                 true,  false));
Formulae.packages.set("org.formulae.programming",         new Formulae.PackageInfo("Programming",           true,  false));
Formulae.packages.set("org.formulae.graphics.raster",     new Formulae.PackageInfo("Graphics",              true,  false));
Formulae.packages.set("org.formulae.chart",               new Formulae.PackageInfo("Charts",                false, false));
Formulae.packages.set("org.formulae.diagramming",         new Formulae.PackageInfo("Diagrams",              false, false));
Formulae.packages.set("org.formulae.time",                new Formulae.PackageInfo("Time",                  true,  true ));
Formulae.packages.set("org.formulae.typesetting",         new Formulae.PackageInfo("Typesetting",           true,  false));
Formulae.packages.set("org.formulae.visualization",       new Formulae.PackageInfo("Visualization",         true,  false));
Formulae.packages.set("org.formulae.localization",        new Formulae.PackageInfo("Localization",          false, false)); // WIP
Formulae.packages.set("org.formulae.bitwise",             new Formulae.PackageInfo("Bitwise",               false, false));
Formulae.packages.set("org.formulae.plot",                new Formulae.PackageInfo("Plots",                 false, false)); // WIP
Formulae.packages.set("org.formulae.chemistry",           new Formulae.PackageInfo("Chemistry",             false, true ));
Formulae.packages.set("org.formulae.cryptography",        new Formulae.PackageInfo("Cryptography",          false, false));
Formulae.packages.set("org.formulae.data",                new Formulae.PackageInfo("Data",                  false, false));

// Experimental packages

Formulae.packages.set("org.formulae.programming.quantum", new Formulae.PackageInfo("Quantum programming (experimental)", false, false));
Formulae.packages.set("org.formulae.filesystem",          new Formulae.PackageInfo("Filesystem (experimental)",          false, false));

///////////////
// functions //
///////////////

Formulae.beep = () => Formulae.audioBeep.play();

Formulae.setExpression = function(moduleName, tag, spec) {
	/*
	if (!(typeof spec === "function")) {
		for (let prop in spec) {
			if (spec[prop] === undefined) {
				console.log("tag: " + tag + ", property: " + prop);
			}
			else if (spec[prop] == null) {
				console.log(prop + " is null");
			}
		}
	}
	*/
	
	Formulae.classesMap.set(tag, spec);
	if (moduleName != null) Formulae.moduleNameMap.set(tag, moduleName);
};

Formulae.createExpression = function(tag, ...children) {
	let spec = Formulae.classesMap.get(tag);
	if (spec == null) {
		spec = { clazz: Formulae.UnknownExpression, tag: tag };
	}
	
	let expr;
	
	if (typeof spec === "function") {
		expr = new spec();
	}
	else {
		expr = new spec.clazz();
		for (let prop in spec) {
			if (prop != "clazz") {
				if (spec[prop] != null) {
					expr[prop] = spec[prop];
				}
			}
		}
	}
	
	if (children !== null && children.length > 0) {
		for (let i = 0, n = children.length; i < n; ++i) {
			expr.addChild(children[i]);
		}
	}
	
	return expr;
};

Formulae.scriptToXML = async function() {
	let doc = document.implementation.createDocument("", "", null);
	let scriptElement = doc.createElement("expression");
	scriptElement.setAttribute("tag", "Formulae.Script");
	
	let moduleNames = [];
	
	let rowElement;
	for (let i = 0, n = Formulae.handlers.length; i < n; ++i) {
		rowElement = doc.createElement("expression");
		rowElement.setAttribute("tag", "Formulae.Script.Row");
		rowElement.setAttribute("type", Formulae.handlers[i].type);
		rowElement.appendChild(await Formulae.handlers[i].expression.getXMLElement(doc, moduleNames));
		
		scriptElement.appendChild(rowElement);
	}
	doc.appendChild(scriptElement);
	
	scriptElement.setAttribute("Modules", moduleNames.toString());
	
	return doc;
}

// return whether it loaded new packages packages
// in order that the caller can know that it should call Formulae.loadReloadEditions()

Formulae.xmlToScript = async function(xml) {
	let parser = new DOMParser();
	let doc = parser.parseFromString(xml, "text/xml");
	let scriptElement = doc.documentElement;
	if (scriptElement.tagName != "expression" || scriptElement.getAttribute("tag") != "Formulae.Script") throw new Error(Formulae.messages.labelFileNotScript);
	
	//////////////////////////////////////
	
	scriptElement.getAttribute("Modules").split(",").forEach(packageName => {
		if (packageName !== "") { // for empty package list
			console.log(packageName);
			Formulae.packages.get(packageName).required = true;
		}
	});
	
	let newPackagesLoaded = await Formulae.loadPackages();
	
	//////////////////////////////////////
	
	let rowElement;
	let handler;
	let expression;
	let promises;
	//
	let firstPromises;
	
	for (let i = 0, n = scriptElement.childElementCount; i < n; ++i) {
		rowElement = scriptElement. children[i]; // preventing obfuscation
		if (rowElement.tagName != "expression" || rowElement.getAttribute("tag") != "Formulae.Script.Row") throw new Error(Formulae.messages.labelFileNotScript);
		promises = [];
		expression = Formulae.xmlElementToExpression(rowElement. children[0], promises); // preventing obfuscation
		handler = Formulae.addExpression(expression, rowElement.getAttribute("type"));
		
		if (promises.length == 0) {
			handler.prepareDisplay();
			handler.display();
		}
		else {
			promises.splice(0, 0, handler);
			Promise.all(promises).then(function(values) {
				let handler = values[0];
				//console.log(handler);
				handler.prepareDisplay();
				handler.display();
			});
		}
		
		if (i == 0) firstPromises = promises;
	}
	
	await Promise.all(firstPromises);
	
	return newPackagesLoaded;
}

Formulae.xmlToExpression = function(xmlText, promises) {
	let parser = new DOMParser();
	let doc = parser.parseFromString(xmlText, "text/xml");
	return Formulae.xmlElementToExpression(doc.documentElement, promises);
}

Formulae.xmlElementToExpression = function(xmlElement, promises) {
	let tag = xmlElement.getAttribute("tag");
	if (xmlElement.tagName != "expression" || tag == null) throw new Error(Formulae.messages.labelNotFormulae);
	
	let expression = Formulae.createExpression(tag);
	if (expression == null) throw new Error("Unknown expression [" + tag + "]");
	
	let n = xmlElement.childElementCount;
	
	if (expression.canHaveChildren(n)) {
		// ok
		let names = expression.getSerializationNames();
		if (names != null) {
			let strings = [];
			names.forEach(function(name, i) { strings.push(xmlElement.getAttribute(name)); });
			try {
				expression.setSerializationStrings(strings, promises);
			}
			catch (error) {
				expression = Formulae.createExpression("Error");
				expression.set("Description", error);
				expression.addChild(Formulae.createExpression("Null"));
				return expression;
			}
		}
	} else { // invalid number of arguments
		let attributes = xmlElement.getAttributeNames();
		let attribute;
		
		expression = new Formulae.IllegalArgumentsExpression(tag);
		
		for (let i = 0, n = attributes.length; i < n; ++i) {
			attribute = attributes[i];
			if (attribute != "tag") {
				expression.set(attribute, xmlElement.getAttribute(attribute));
			}
		}
	}
	
	//expression.children = new Array(n);
	
	let i, child;
	for (i = 0; i < n; ++i) {
		child = Formulae.xmlElementToExpression(xmlElement. children[i], promises); // preventing obfuscation
		//expression.children[i] = child;
		expression.children.push(child);
		child.parent = expression;
		child.index = i;
	}
	
	return expression;
}

Formulae.clearHighlightedExpression = function() {
	if (Formulae.hExpression != null) {
		let context = Formulae.hHandler.context;
		
		let bkpOperation = context.globalCompositeOperation;
		context.globalCompositeOperation = "difference";
		
		let bkpStrokeStyle = context.strokeStyle;
		context.strokeStyle = "yellow";
		
		Formulae.hExpression.drawHighlightedShape(context);
		
		context.strokeStyle = bkpStrokeStyle;
		context.globalCompositeOperation = bkpOperation;
		
		Formulae.hExpression = null;
		Formulae.h_info.textContent = null;
	}
}

Formulae.beforeChanges = function() {
	Formulae.clearHighlightedExpression();
}

Formulae.mouseMove = function(handler, mouseEvent) {
	let x = mouseEvent.offsetX;
	if (!Formulae.ltr) x = handler.context.canvas.width - x;
	let test = handler.fromPoint(x, mouseEvent.offsetY);
	
	if (test !== Formulae.hExpression) { // current expression (test) has changed
		if (Formulae.readMode) {
			if (test !== null) {
				if (test.getTag() === "Internet.UniformResourceLocator") {
					document.body.style.cursor = "pointer";
				}
				else {
					//if (Formulae.hExpression !== null && Formulae.hExpression.getTag() === "Internet.UniformResourceLocator") {
						document.body.style.cursor = "default";
					//}
				}
			}
			
			Formulae.hExpression = test;
			return;
		}
		
		let context = handler.context;
		
		let bkpOperation = context.globalCompositeOperation;
		context.globalCompositeOperation = "difference";
		
		let bkpStrokeStyle = context.strokeStyle;
		context.strokeStyle = "yellow";
		
		if (Formulae.hExpression != null) {
			//let rect = Formulae.hExpression.getRectangle(true);
			//context.strokeRect(rect.x, rect.y, rect.width, rect.height);
			
			//Formulae.hExpression.drawHighlightedShape(context);
			Formulae.hExpression.drawHighlightedShape(Formulae.hHandler.context);
		}
		
		Formulae.hExpression = test;
		if (Formulae.hExpression != null) {
			Formulae.hHandler = handler;
			//let rect = Formulae.hExpression.getRectangle(true);
			//context.strokeRect(rect.x, rect.y, rect.width, rect.height);
			Formulae.hExpression.drawHighlightedShape(context);
		}
		
		context.strokeStyle = bkpStrokeStyle;
		context.globalCompositeOperation = bkpOperation;
		
		// info
		Formulae.h_info.textContent = Formulae.hExpression != null ? Formulae.getInfo(Formulae.hExpression) : null;
	}
};

Formulae.mouseOut = function(handler) {
	if (Formulae.readMode) {
		Formulae.hExpression = null;
		document.body.style.cursor = "default";
		return;
	}
	
	if (Formulae.hExpression != null) {
		let context = handler.context;
		
		let bkpOperation = context.globalCompositeOperation;
		context.globalCompositeOperation = "difference";
		
		let bkpStrokeStyle = context.strokeStyle;
		context.strokeStyle = "yellow";
		
		//let rect = Formulae.hExpression.getRectangle(true);
		//context.strokeRect(rect.x, rect.y, rect.width, rect.height);
		Formulae.hExpression.drawHighlightedShape(context);
		
		context.strokeStyle = bkpStrokeStyle;
		context.globalCompositeOperation = bkpOperation;
		
		Formulae.hExpression = null;
		Formulae.h_info.textContent = null;
	}
}

Formulae.mouseWheel = function() {
	if (Formulae.readMode) {
		Formulae.hExpression = null;
		document.body.style.cursor = "default";
		return;
	}
	
	Formulae.clearHighlightedExpression();
}

Formulae.mouseClick = function(handler, mouseEvent) {
	if (Formulae.readMode) {
		if (Formulae.hExpression !== null && Formulae.hExpression.getTag() === "Internet.UniformResourceLocator") {
			let win = window.open(Formulae.hExpression.get("Value"), "_blank");
			win.focus();
		}
		
		return;
	}
	
	if (Formulae.menu.style.visibility == "visible") {
		Formulae.menu.style.visibility = "hidden";
		return;
	}
	
	if (Formulae.hExpression != null && Formulae.hExpression != Formulae.sExpression) {
		Formulae.setSelected(handler, Formulae.hExpression, true);
	}
}

Formulae.tap = function(handler, tapEvent) {
	/*
	if (Formulae.readMode) {
		let touches = tapEvent.touches;
		if (touches.length !== 1) return;
		let touchPoint = touches.item(0);
	}
	*/
};

Formulae.clearSelected = function() {
	if (Formulae.sExpression === null) return;
	
	let context = Formulae.sHandler.context;
	
	let bkpOperation = context.globalCompositeOperation;
	context.globalCompositeOperation = "difference";
	
	let bkpFillStyle = context.fillStyle;
	context.fillStyle = "white";
	
	Formulae.sExpression.drawSelecionShape(context);
	
	context.fillStyle = bkpFillStyle;
	context.globalCompositeOperation = bkpOperation;
	
	Formulae.sExpression = null;
};

Formulae.setSelected = function(handler, expression, removePrevious) {
	Formulae.clearHighlightedExpression();
	
	if (removePrevious && Formulae.sExpression != null) {
		let context = Formulae.sHandler.context;
		
		let bkpOperation = context.globalCompositeOperation;
		context.globalCompositeOperation = "difference";
		
		let bkpFillStyle = context.fillStyle;
		context.fillStyle = "white";
		
		//let bkpGlobalAlpha = context.globalAlpha;
		//context.globalAlpha = 1.0;
		
		//let rect = Formulae.sExpression.getRectangle(false);
		//context.fillRect(rect.x, rect.y, rect.width, rect.height);
		Formulae.sExpression.drawSelecionShape(context);
		
		//context.globalAlpha = bkpGlobalAlpha;
		context.fillStyle = bkpFillStyle;
		context.globalCompositeOperation = bkpOperation;
	}
	
	Formulae.sExpression = expression;
	Formulae.sHandler = handler;
	
	let context = Formulae.sHandler.context;
	
	let bkpOperation = context.globalCompositeOperation;
	context.globalCompositeOperation = "difference";
	
	let bkpFillStyle = context.fillStyle;
	context.fillStyle = "white";
	
	//let bkpGlobalAlpha = context.globalAlpha;
	//context.globalAlpha = 1.0;
	
	let rect = Formulae.sExpression.getRectangle(false);
	//context.fillRect(rect.x, rect.y, rect.width, rect.height);
	Formulae.sExpression.drawSelecionShape(context);
	
	//context.globalAlpha = bkpGlobalAlpha;
	context.fillStyle = bkpFillStyle;
	context.globalCompositeOperation = bkpOperation;
	
	if (!removePrevious) {
		Formulae.hExpression = null;
		Formulae.h_info.textContent = null;
	}
	
	// scrolling
	
	//let e = document.documentElement;
	let e = document.getElementById("main");
	
	if (e.scrollWidth > e.clientWidth) {
		//                                 Absolute x of the point                Absolute x of the right side of the viewpoint
		//        ______________________________________^______________________________      _____________^______________
		//       /                                                                     \    /                            \
		let dx = (Formulae.sHandler.context.canvas.offsetLeft + rect.x + rect.width + 10) - (e.scrollLeft + e.clientWidth);
		if (dx < 0) {
			dx = (Formulae.sHandler.context.canvas.offsetLeft + rect.x - 10) - e.scrollLeft;
			if (dx > 0) dx = 0;
		}
		if (dx != 0) e.scrollLeft += dx;
	}
	
	if (e.scrollHeight > e.clientHeight) {
		let dy = (Formulae.sHandler.context.canvas.offsetTop + rect.y + rect.height + 10) - (e.scrollTop + e.clientHeight);
		if (dy < 0) {
			dy = (Formulae.sHandler.context.canvas.offsetTop + rect.y - 10) - e.scrollTop;
			if (dy > 0) dy = 0;
		}
		if (dy != 0) e.scrollTop += dy;
	}
	
	Formulae.s_info.textContent = Formulae.getInfo(Formulae.sExpression);
}

Formulae.getInfo = function(expr) {
	let info = expr.getName();
	
	if (expr.parent instanceof Expression) {
		info += Formulae.messages.labelIsTheChild + (expr.index + 1) + "/" + expr.parent.children.length;
		
		let name = expr.parent.getChildName(expr.index);
		if (name != null) info += " (" + name + ")";
		
		info += Formulae.messages.labelOfItsParentA + expr.parent.getName();
	}
	
	return info;
}

Formulae.editionEscape = function() {
	if (Formulae.sExpression.parent instanceof Expression) {
		Formulae.setSelected(Formulae.sHandler, Formulae.sExpression.parent, true);
	}
	else {
		Formulae.beep();
	}
}

Formulae.editionArrow = function(direction) {
	if (Formulae.readMode) {
		return;
	}
	
	let test = Formulae.sExpression.moveOut(direction);
	
	if (test != null && test != Formulae.sExpression) {
		Formulae.setSelected(Formulae.sHandler, test, true);
	}
	else { // move to upper or lower expression
		if (direction == Expression.UP && Formulae.sHandler.index > 0) {
			let previousHandler = Formulae.handlers[Formulae.sHandler.index - 1];
			let test = previousHandler.expression.moveTo(direction);
			Formulae.setSelected(previousHandler, test, true);
			return;
		}
		
		if (direction == Expression.DOWN && Formulae.sHandler.index < Formulae.handlers.length - 1) {
			let previousHandler = Formulae.handlers[Formulae.sHandler.index + 1];
			let test = previousHandler.expression.moveTo(direction);
			Formulae.setSelected(previousHandler, test, true);
			return;
		}
		
		Formulae.beep();
	}
}

Formulae.editionInsert = function(before) {
	let parent = Formulae.sExpression.parent;
	
	if (parent instanceof Expression) {
		Formulae.beforeChanges();
		
		let index = Formulae.sExpression.index + (before ? 0 : 1);
		if (parent.canInsertChildAt(index)) {
			let n = new Expression.Null();
			parent.addChildAt(index, n);
			Formulae.sHandler.prepareDisplay();
			Formulae.sHandler.display();
			Formulae.setSelected(Formulae.sHandler, n, false);
		}
	}
}

Formulae.editionDelete = function() {
	Formulae.beforeChanges();
	let newSelection = null;
	
	if (Formulae.sExpression.getTag() != "Null") { // selection is not the null expression
		if (Formulae.sExpression.children.length == 1) { // only one child, unboxing
			newSelection = Formulae.sExpression.children[0];
			Formulae.sExpression.replaceBy(newSelection);
		}
		else { // not only one child, nullifying
			newSelection = new Expression.Null();
			Formulae.sExpression.replaceBy(newSelection);
		}
	}
	else { // selection is the null expression
		let parent = Formulae.sExpression.parent;
		if (!(parent instanceof Expression)) return Formulae.beep();
		
		let index = Formulae.sExpression.index;
		
		if (parent.canRemoveChildAt(index)) { // child can be removed
			parent.removeChildAt(index);
			if (index >= parent.children.length) --index; // new index is the sibling at left
			newSelection = index >= 0 ? parent.children[index] : parent;
		}
		else { // child cannot be removed
			if (parent.children.length != 2) return;
			
			// only two children, deleting sibling
			newSelection = parent.children[1 - index];
			parent.replaceBy(newSelection);
		}
	}
	
	Formulae.sHandler.prepareDisplay();
	Formulae.sHandler.display();
	Formulae.setSelected(Formulae.sHandler, newSelection, false);
}

Formulae.editionCut = async function() {
	if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
	Formulae.beforeChanges();
	
	let nullExpression = new Expression.Null();
	Formulae.sExpression.replaceBy(nullExpression);
	navigator.clipboard.writeText(new XMLSerializer().serializeToString(await Formulae.sExpression.toXML()));
	
	Formulae.sHandler.prepareDisplay();
	Formulae.sHandler.display();
	
	Formulae.setSelected(Formulae.sHandler, nullExpression, false);
}

Formulae.editionCopy = async function() {
	Formulae.writeToClipboard(new XMLSerializer().serializeToString(await Formulae.sExpression.toXML()));
}

Formulae.writeToClipboard = function(text) {
	Formulae.clipboard = text;
	
	try {
		navigator.clipboard.writeText(text);
		console.log("via navigator.clipboard.writeText");
	}
	catch (error) {
		console.log(error);
		let textArea = document.createElement("textarea");
		textArea.value = text;
		
		// Avoid scrolling to bottom
		textArea.style.top = "0";
		textArea.style.left = "0";
		textArea.style.position = "fixed";
		
		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();
		
		document.execCommand("copy");
		
		document.body.removeChild(textArea);
		console.log("document.execCommand(copy)");
	};
}

Formulae.editionPaste = function() {
	if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
	Formulae.beforeChanges();
	
	/*
	navigator.permissions.query({ name: "clipboard-read" }).then(result => {
		console.log(result);
		if (result.state == "granted" || result.state == "prompt") {
			//navigator.clipboard.read().then(data => {
			//	if (data.items.length <= 1) {
			//		console.log(data.items.length);
			//	}
			//	else {
			//		for (let i = 0; i < data.items.length; i++) {
			//			console.log(i + ": " + data.items[i].type);
			//			//if (data.items[i].type != "image/png") {
			//			//	alert("Clipboard contains non-image data. Unable to access it.");
			//			//} else {
			//			//	const blob = data.items[i].getType("image/png");
			//			//	imgElem.src = URL.createObjectURL(blob);
			//			//}
			//		}
			//	}
			//});
			
			navigator.clipboard.readText().then(text => {
				let promises = [];
				let expr;
				
				try {
					expr = Formulae.xmlToExpression(text, promises);
					if (promises.length > 0) {
						Promise.all(promises).then(() => {
							Formulae.sExpression.replaceBy(expr);
							Formulae.sHandler.prepareDisplay();
							Formulae.sHandler.display();
							Formulae.setSelected(Formulae.sHandler, expr, false);
							return;
						});
					}
				}
				catch (err) {
					expr = Formulae.createExpression("String.String");
					expr.set("Value", text);
				}
				
				Formulae.sExpression.replaceBy(expr);
				Formulae.sHandler.prepareDisplay();
				Formulae.sHandler.display();
				Formulae.setSelected(Formulae.sHandler, expr, false);
			});
		}
	});
	*/
	
	Formulae.readClipboard().then(text => {
		let promises = [];
		let expr;
		
		/*
		try {
			expr = Formulae.xmlToExpression(text, promises);
			console.log(promises.length);
			console.log(expr);
			if (promises.length > 0) {
				Promise.all(promises).then(() => {
					Formulae.sExpression.replaceBy(expr);
					Formulae.sHandler.prepareDisplay();
					Formulae.sHandler.display();
					Formulae.setSelected(Formulae.sHandler, expr, false);
					return;
				});
			}
		}
		catch (err) {
			expr = Formulae.createExpression("String.String");
			expr.set("Value", text);
		}
		
		Formulae.sExpression.replaceBy(expr);
		Formulae.sHandler.prepareDisplay();
		Formulae.sHandler.display();
		Formulae.setSelected(Formulae.sHandler, expr, false);
		*/
		
		try {
			expr = Formulae.xmlToExpression(text, promises);
			Formulae.sExpression.replaceBy(expr);
			
			if (promises.length > 0) {
				Promise.all(promises).then(() => {
					Formulae.sHandler.prepareDisplay();
					Formulae.sHandler.display();
					Formulae.setSelected(Formulae.sHandler, expr, false);
				});
				
				return;
			}
		}
		catch (err) {
			expr = Formulae.createExpression("String.Text");
			expr.set("Value", text);
			Formulae.sExpression.replaceBy(expr);
		}
		
		Formulae.sHandler.prepareDisplay();
		Formulae.sHandler.display();
		Formulae.setSelected(Formulae.sHandler, expr, false);
	});
}

Formulae.readClipboard = async function() {
	try {
		let promise = navigator.clipboard.readText();
		console.log("via navigator.clipboard.readText");
		return promise;
	}
	catch (error) {
		console.log(error);
		try {
			let text = window.clipboardData.getData('Text');
			console.log("via window.clipboardData.getData");
			return Promise.resolve(text);
		}
		catch (error) {
			console.log(error);
			try {
				let textArea = document.createElement("textarea");
				
				// Avoid scrolling to bottom
				textArea.style.top = "0";
				textArea.style.left = "0";
				textArea.style.position = "fixed";
				
				document.body.appendChild(textArea);
				textArea.focus();
				let success = document.execCommand("paste");
				
				let text = textArea.value;
				document.body.removeChild(textArea);
				
				if (!success) {
					throw null;
				}
				
				console.log("via document.execCommand(paste)");
				return Promise.resolve(text);
			}
			catch (error) {
				console.log(error);
				console.log("via Formulae.clipboard");
				return Promise.resolve(Formulae.clipboard);
			}
		}
	}
}

Formulae.editionInsertRowAfter = function() {
	Formulae.beforeChanges();
	
	let index = Formulae.sHandler.index;
	let n = Formulae.handlers.length - 1;
	
	do ++index; while (index < n && Formulae.handlers[index].type == Formulae.ROW_OUTPUT);
	
	let hNull = Formulae.insertExpression(new Expression.Null(), Formulae.ROW_INPUT, index);
	
	hNull.prepareDisplay();
	hNull.display();
	
	Formulae.setSelected(Formulae.handlers[index], Formulae.handlers[index].expression.moveTo(Expression.DOWN), true);
}

Formulae.editionInsertRowBefore = function() {
	Formulae.beforeChanges();
	
	let index = Formulae.sHandler.index;
	
	while (index > 0 && Formulae.handlers[index].type == Formulae.ROW_OUTPUT) --index;
	
	let hNull = Formulae.insertExpression(new Expression.Null(), Formulae.ROW_INPUT, index);
	
	hNull.prepareDisplay();
	hNull.display();
	
	Formulae.setSelected(Formulae.handlers[index], Formulae.handlers[index].expression.moveTo(Expression.DOWN), true);
}

Formulae.editionDeleteRow = function() {
	let index = Formulae.sHandler.index;
	
	if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) {
		Formulae.deleteExpressions(index, 1);
	}
	else {
		let count = 1;
		let i = index + 1;
		let n = Formulae.handlers.length - 1;
		
		while (i < n && Formulae.handlers[i].type == Formulae.ROW_OUTPUT) {
			++i;
			++count;
		}
		
		Formulae.deleteExpressions(index, count);
	}
	
	if (Formulae.handlers.length == 0) {
		let hNull = Formulae.insertExpression(new Expression.Null(), Formulae.ROW_INPUT, index);
		
		hNull.prepareDisplay();
		hNull.display();
	}
	
	if (index >= Formulae.handlers.length) {
		index = Formulae.handlers.length - 1;
	}
	
	Formulae.setSelected(Formulae.handlers[index], Formulae.handlers[index].expression.moveTo(Expression.DOWN), true);
}

Formulae.editionAction = function() {
	let actions = Formulae.actionMap.get(Formulae.sExpression.getTag());
	
	if (actions == null) return Formulae.beep();
	
	Formulae.beforeChanges();
	
	if (!actions[0].isAvailableNow()) return Formulae.beep();
	actions[0].doAction();
}

/*
Formulae.copyAsImage = function() {
	let newCanvas = document.createElement("canvas");
	let newContext = newCanvas.getContext('2d');
	let e = Formulae.sHandler.expression;
	let newHandler = new ExpressionHandler(e, newContext, Formulae.ROW_EXPORT);
	newHandler.prepareDisplay(newContext);
	newHandler.display(newContext, 0, 0);
	
	newCanvas.toBlob(function(blob) {
		const item = new ClipboardItem({ "image/png": blob });
		navigator.clipboard.write([item]); 
	});
	
	// restore parentship
	Formulae.sHandler.setExpression(e);
}
*/

Formulae.saveAsImage = function() {
	if (Formulae.saveAsImageForm === undefined) {
		let table;

		table = document.createElement("table");
		table.classList.add("bordered");
		table.innerHTML =
`
<tr>
<th colspan=2>Save expression as image
<tr>
<td>Background
<td><input type='radio' name='radio' value='t' checked>Transparent
<br><input type='radio' name='radio' value='w'>White
<br><input type='radio' name='radio' value='a'>Answer
<br><input type='radio' name='radio' value='d'>Definition
<tr>
<td>Border (pixels):
<td><input type="number" value="10" min="-9999" max="9999">
<tr>
<th colspan=2><button>Ok</button>

`;

		Formulae.saveAsImageForm = table;
	}

	let tableRows  = Formulae.saveAsImageForm.rows;
	let background = tableRows[1].cells[1].childNodes;
	let border     = tableRows[2].cells[1].firstChild;
	let ok         = tableRows[3].cells[0].firstChild;
	
	ok.onclick = () => {
		let b = parseInt(border.value);
		if (isNaN(b)) {
			alert("Invalid value");
			return;
		}
		
		Formulae.resetModal();
		
		let a = document.createElement('a');
		a.download = 'download.png';
		
		let e = Formulae.sExpression.clone();
		
		let newCanvas = document.createElement("canvas");
		newCanvas.width = e.width + 2 * b;
		newCanvas.height = e.height + 2 * b;
		
		let newContext = newCanvas.getContext('2d');
		let newHandler = new ExpressionHandler(e, newContext, Formulae.ROW_EXPORT);
		
		newHandler.prepareDisplay(false);
		
		if (!background[0].checked) { // white
			newContext.save();
			if (background[3].checked) newContext.fillStyle = "white";
			if (background[6].checked) newContext.fillStyle = "lightgray";
			if (background[9].checked) newContext.fillStyle = "wheat";
			newContext.fillRect(-1, -1, newCanvas.width, newCanvas.height);
			newContext.restore();
		}
		
		// newHandler.prepareDisplay set the coordinates at (1, 1)
		newHandler.display(b - 1, b - 1);
		
		a.href = newCanvas.toDataURL();
		a.textContent = 'Download ready';
		a.style='display:none';
		a.click();
	};
	
	Formulae.setModal(Formulae.saveAsImageForm);
	
	/*
	let a = document.createElement('a');
	a.download = 'download.png';
	
	let newCanvas = document.createElement("canvas");
	let newContext = newCanvas.getContext('2d');
	let e = Formulae.sExpression.clone();
	let newHandler = new ExpressionHandler(e, newContext, Formulae.ROW_EXPORT);
	newHandler.prepareDisplay(newContext);
	newHandler.display(newContext, 0, 0);
	
	a.href = newCanvas.toDataURL();
	a.textContent = 'Download ready';
	a.style='display:none';
	a.click();
	*/
}

Formulae.f1 = function() {
	window.open("/?reference=" + Formulae.sExpression.getTag());
}

//Formulae.showSelectionXML = function xml() {
Formulae.showSelectionXML = async function () {
	//console.log(Formulae.sExpression.toXML());
	//console.log(new XMLSerializer().serializeToString(Formulae.sExpression.toXML()));
	
	/*
	let win = window.open('', '');
	//win.document.open("text/xml");
	//win.document.open("text/plain");
	win.document.write(new XMLSerializer().serializeToString(Formulae.sExpression.toXML()));
	//win.document.write('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>' + new XMLSerializer().serializeToString(Formulae.sExpression.toXML()));
	win.focus();
	*/
	
	let blob = new Blob([new XMLSerializer().serializeToString(await Formulae.sExpression.toXML())], { type: 'text/xml' });
	let dataURI = window.URL.createObjectURL(blob);
	let win = window.open(dataURI);
	
	if (!Formulae.ltr) win.document.body.style.direction = "rtl"; // it does not work
}

Formulae.showScriptXML = async function() {
	//console.log(Formulae.sExpression.toXML());
	//console.log(new XMLSerializer().serializeToString(Formulae.sExpression.toXML()));
	
	/*
	let win = window.open('', '');
	//win.document.open("text/xml");
	//win.document.open("text/plain");
	win.document.write(new XMLSerializer().serializeToString(Formulae.sExpression.toXML()));
	//win.document.write('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>' + new XMLSerializer().serializeToString(Formulae.sExpression.toXML()));
	win.focus();
	*/
	
	let xmlDocument = await Formulae.scriptToXML();
	let blob = new Blob([new XMLSerializer().serializeToString(xmlDocument)], {type: 'text/xml'});
	let dataURI = window.URL.createObjectURL(blob);
	let win = window.open(dataURI);
	
	if (!Formulae.ltr) win.document.body.style.direction = "rtl"; // it does not work
}

Formulae.changeType = function() {
	if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
	Formulae.beforeChanges();
	
	Formulae.sHandler.type = (Formulae.sHandler.type == Formulae.ROW_INPUT ? Formulae.ROW_PERSISTENT : Formulae.ROW_INPUT);
	
	let container = document.getElementById("container");
	container. children[Formulae.sHandler.index].style.backgroundColor = (Formulae.sHandler.type == Formulae.ROW_INPUT ? "white" : "wheat"); // preventing obfuscation
	
	Formulae.sHandler.display();
	
	Formulae.setSelected(Formulae.sHandler, Formulae.sExpression, false);
}

Formulae.sendSticky = async function() {
	switch (Formulae.serverType) {
		case 0: { // browser
			}
			break;
		
		case 1: { // local
				let m = 0;
				let errors = false;
				
				for (let i = 0, n = Formulae.handlers.length; i < n; ++i) {
					if (Formulae.handlers[i].type == Formulae.ROW_PERSISTENT) {
						fetch(
							Formulae.localServer + "/noanswer",
							{
								method: "POST",
								headers: {
									"locale"  : Formulae.locale,
									"timezone": Formulae.timeZone
								},
								body: new XMLSerializer().serializeToString(await Formulae.handlers[i].expression.toXML())
							}
						)
						.catch(error => {
							if (!errors) {
								alert(Formulae.messages.labelLocalConnectionError);
								errors = true;
							}
						});
						
						++m;
					}
				}
				
				alert(m + Formulae.messages.labelExpressionsSent);
			}
			break;
		
		case 2:  // remote
			alert(Formulae.messages.labelToolRemoteServerOnly);
			break;
	}
}

/*
Formulae.onEnter = function(alt) {
	if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
	
	if (Formulae.sHandler.type == Formulae.ROW_PERSISTENT && Formulae.serverType == 2) return Formulae.beep();
	
	if (Formulae.sHandler.expression.getTag().startsWith("Typesetting")) {
		alert("Expression does not seem to be computable");
		return;
	}
	
	//////////////////////////////////////////////////////////////////
	
	Formulae.beforeChanges();
	
	//Formulae.clearHighlightedExpression();
	
	let index = Formulae.sHandler.index;
	
	let wait = Formulae.createExpression("Formulae.WaitingExpression");
	
	let hResult, hNull = null;
	
	if (index == Formulae.handlers.length - 1) { // new result
		hResult = Formulae.addExpression(wait, Formulae.ROW_OUTPUT);
		hNull = Formulae.addExpression(new Expression.Null(), Formulae.ROW_INPUT);
	}
	else {
		hResult = Formulae.handlers[index + 1];
		
		if (hResult.type == Formulae.ROW_OUTPUT) { // previous result
			hResult.setExpression(wait);
		}
		else { // no previous result, it needs to be created
			hResult = Formulae.insertExpression(wait, Formulae.ROW_OUTPUT, index + 1);
		}
	}
	
	hResult.prepareDisplay();
	hResult.display();
	
	if (hNull != null) {
		hNull.prepareDisplay();
		hNull.display();
	}
	
	if (index + 2 <= Formulae.handlers.length - 1) {
		Formulae.setSelected(Formulae.handlers[index + 2], Formulae.handlers[index + 2].expression.moveTo(Expression.DOWN), true);
	}
	else {
		Formulae.setSelected(Formulae.handlers[index + 1], Formulae.handlers[index + 1].expression.moveTo(Expression.DOWN), true);
	}
	
	let promises = [];
	
	let remote = Formulae.serverType == 1;
	let expr = remote ? Formulae.buildExpressionForRemoteServer(index) : Formulae.handlers[index].expression;
	
	Formulae.toServer(expr, remote, alt, promises)
	.then(expr => {
		if (alt && expr.getTag() == "Null") {
			Formulae.deleteExpressions(hResult.index, 1);
			//alert("Expression sent lo local server");
			return;
		}
		
		if (promises.length == 0) {
			hResult.setExpression(expr)
			hResult.prepareDisplay();
			hResult.display();
			
			if (hResult == Formulae.sHandler) {
				Formulae.setSelected(hResult, hResult.expression.moveTo(Expression.DOWN), false);
			}
		}
		else {
			Promise.all(promises).then(() => {
				hResult.setExpression(expr)
				hResult.prepareDisplay();
				hResult.display();
				
				if (hResult == Formulae.sHandler) {
					Formulae.setSelected(hResult, hResult.expression.moveTo(Expression.DOWN), false);
				}
			});
		}
	});
}
*/

Formulae.onEnter = alt => {
	if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
	
	let isPersistent = Formulae.sHandler.type == Formulae.ROW_PERSISTENT;
	
	if (isPersistent && Formulae.serverType == 2) return Formulae.beep();
	
	if (Formulae.sHandler.expression.getTag().startsWith("Typesetting")) {
		alert("Expression does not seem to be computable");
		return;
	}
	
	//////////////////////////////////////////////////////////////////
	/*
	
	if (Formulae.sHandler.type == Formulae.ROW_PERSISTENT) {
		let index = Formulae.sHandler.index;
		let handler = Formulae.handlers[index].clone();
		handler.setExpression(Formulae.handlers[index].expression.clone());
		ReductionManager.prepareReduction(handler.expression);
		let session = new ReductionSession(null, null, 20); // locale, timezone, max precision
		await ReductionManager.reduce(handler.expression, session);
		alert("Ok");
		return;
	}
	
	*/
	//////////////////////////////////////////////////////////////////
	
	Formulae.beforeChanges();
	
	//Formulae.clearHighlightedExpression();
	
	let index = Formulae.sHandler.index;
	
	let wait = Formulae.createExpression("Formulae.WaitingExpression");
	
	let hResult, hNull = null;
	
	if (index == Formulae.handlers.length - 1) { // new result
		hResult = Formulae.addExpression(wait, Formulae.ROW_OUTPUT);
		hNull = Formulae.addExpression(new Expression.Null(), Formulae.ROW_INPUT);
	}
	else {
		hResult = Formulae.handlers[index + 1];
		
		if (hResult.type == Formulae.ROW_OUTPUT) { // previous result
			hResult.setExpression(wait);
		}
		else { // no previous result, it needs to be created
			hResult = Formulae.insertExpression(wait, Formulae.ROW_OUTPUT, index + 1);
		}
	}
	
	hResult.prepareDisplay();
	hResult.display();
	
	if (hNull != null) {
		hNull.prepareDisplay();
		hNull.display();
	}
	
	if (index + 2 <= Formulae.handlers.length - 1) {
		Formulae.setSelected(Formulae.handlers[index + 2], Formulae.handlers[index + 2].expression.moveTo(Expression.DOWN), true);
	}
	else {
		Formulae.setSelected(Formulae.handlers[index + 1], Formulae.handlers[index + 1].expression.moveTo(Expression.DOWN), true);
	}
	
	///////////// reduction
	
	let hReduction = hResult.clone();
	hReduction.setExpression(Formulae.handlers[index].expression.clone());
	
	CanonicalArithmetic.internalizeNumbersHandler(hReduction); /////
	
	let session = new ReductionSession(null, null, 20);
	
	let start = new Date().valueOf();
	
	setTimeout(async () => {
		await ReductionManager.reduceHandler(hReduction, session);
		console.log(Formulae.ellaspedTime(new Date().valueOf() - start));
		
		if (alt || isPersistent) {
			Formulae.deleteExpressions(hResult.index, 1);
			return;
		}
		
		hResult.setExpression(hReduction.expression);
		
		CanonicalArithmetic.externalizeNumbersHandler(hResult); /////
		
		hResult.prepareDisplay();
		hResult.display();
	}, 0);
	
	/*
	await ReductionManager.reduceHandler(hReduction, session);
	console.log(Formulae.ellaspedTime(new Date().valueOf() - start));
	
	hResult.setExpression(hReduction.expression);
	hResult.prepareDisplay();
	hResult.display();
	*/
};

Formulae.ellaspedTime = millis => {
	let h = Math.floor(millis / (60 * 60 * 1000));
	millis %= (60 * 60 * 1000);
	let m = Math.floor(millis / (60 * 1000));
	millis %= (60 * 1000);
	let s = Math.floor(millis / 1000);
	millis %= 1000;
	
	let result = "";
	if (h > 0)      result += h      + " hours ";
	if (m > 0)      result += m      + " minutes ";
	if (s > 0)      result += s      + " seconds ";
	if (millis > 0) result += millis + " milliseconds";
	
	return result;
};

Formulae.toEchoServer = function(expression, alt, promises) {
	return expression.clone();
}

Formulae.buildExpressionForRemoteServer = function(index) {
	let block = null;
	
	for (let i = 0; i < index; ++i) {
		if (Formulae.handlers[i].type == Formulae.ROW_PERSISTENT) {
			if (block == null) {
				block = Formulae.createExpression("Programming.Block");
			}
			
			block.addChild(Formulae.handlers[i].expression.clone());
		}
	}
	
	if (block == null) {
		return Formulae.handlers[index].expression;
	}
	else {
		block.addChild(Formulae.handlers[index].expression.clone());
		return block;
	}
}

Formulae.toServer = async function(expression, remote, alt, promises) {
	let url = remote ? Formulae.remoteServers[Math.floor(Math.random() * Formulae.remoteServers.length)] : Formulae.localServer;
	if (alt) url += "/noanswer";
	
	return fetch(
		url,
		{
			method: "POST",
			headers: {
				"locale"  : Formulae.locale,
				"timezone": Formulae.timeZone
			},
			body: new XMLSerializer().serializeToString(await expression.toXML())
		}
	)
	.then(response => {
		if (!response.ok) throw Error();
		return response.text()
	})
	.then(
		text => Formulae.xmlToExpression(text, promises)
	)
	.catch(error => {
		return Formulae.createExpression(remote ? "Formulae.RemoteConnectionError" : "Formulae.LocalConnectionError");
	});
}

Formulae.onKey = function(e) {
	if (Formulae.menu.style.visibility == "visible") {
		Formulae.menu.style.visibility = "hidden";
		e.preventDefault();
		return;
	}
	
	e = e || window.event;
	// console.log("code = " + e.code + ", charCode = " + e.charCode + ", key = " + e.key + ", keyCode = " + e.keyCode);
	
	Formulae.clearHighlightedExpression();
	
	// ctrl+x or cmd+x pressed?
	if ((e.ctrlKey || e.metaKey) && e.keyCode == 88) {
		if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
		Formulae.editionCut();
		return;
	}
	
	// ctrl+c or cmd+c pressed?
	if ((e.ctrlKey || e.metaKey) && e.keyCode == 67) {
		Formulae.editionCopy();
		return;
	}
	
	// ctrl+v or cmd+v pressed?
	if ((e.ctrlKey || e.metaKey) && e.keyCode == 86) {
		if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
		Formulae.editionPaste();
		return;
	}
	
	switch (e.key) {
		case "n":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Formulae.editionNumber();
			return;
			
		case "+":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			(e.altKey ? Formulae.editionAdditionAlt : Formulae.editionAddition)();
			return;
			
		case "-":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			(e.altKey ? Formulae.editionSubtractionAlt : Formulae.editionSubtraction)();
			return;
			
		case "_":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Formulae.editionNegative();
			return;
			
		case "*":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			(e.altKey ? Formulae.editionMultiplicationAlt : Formulae.editionMultiplication)();
			return;
			
		case "/":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Expression.binaryEdition("Math.Arithmetic.Division", e.altKey);
			return;
			
		case "=":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Expression.binaryEdition(e.altKey ? "Relation.Different" : "Relation.Equals", false);
			return;
			
		case ">":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Expression.binaryEdition(e.altKey ? "Relation.GreaterOrEquals" : "Relation.Greater", false);
			return;
			
		case "<":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Expression.binaryEdition(e.altKey ? "Relation.LessOrEquals" : "Relation.Less", false);
			return;
			
		case "a":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Expression.binaryEdition("Logic.Conjunction", e.altKey);
			return;
			
		case "o":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Expression.binaryEdition("Logic.Disjunction", e.altKey);
			return;
			
		case "N":
		case "¬":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Expression.wrapperEdition("Logic.Negation");
			return;
			
		case "c":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Expression.binaryEdition("Expression.Child", false);
			return;
			
		case "{":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Expression.wrapperEdition("List.List");
			return;
			
		case "s":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Formulae.editionSymbol();
			return;
			
		case "l":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Expression.wrapperEdition("Symbolic.Local");
			return;
			
		case "f":
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Formulae.editionFunction();
			return;
			
		case '"':
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Formulae.editionString();
			return;
			
		case 't':
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Formulae.editionText();
			return;
		
		case 'b':
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Expression.wrapperEdition("Programming.Block");
			return;
	}
	
	switch (e.keyCode) {
		case 222: // <^> ???
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Expression.binaryEdition("Math.Arithmetic.Exponentiation", false);
			return;
			
		case 8: // <backspace>
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Expression.binaryEdition("Symbolic.Assignment", false);
			return;
			
		case 27: // <esc>
			e.preventDefault(); // for Safari
			Formulae.editionEscape();
			return;
			
		case 45: // <insert>, <alt><insert>
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Formulae.editionInsert(e.altKey);
			//console.log(Formulae.sHandler.toString());
			return;
			
		case 46: // <delete>
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Formulae.editionDelete();
			//console.log(Formulae.sHandler.toString());
			return;
			
		case 38: // up arrow
			Formulae.editionArrow(Expression.UP);
			return;
			
		case 40: // down arrow
			Formulae.editionArrow(Expression.DOWN);
			return;
			
		case 37: // left arrow
			Formulae.editionArrow(Formulae.ltr ? Expression.PREVIOUS : Expression.NEXT);
			return;
			
		case 39: // right arrow
			Formulae.editionArrow(Formulae.ltr ? Expression.NEXT : Expression.PREVIOUS);
			return;
			
		case 13: // <enter>
			e.preventDefault();
			if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
			Formulae.onEnter(e.altKey);
			return;
			
		case 32: // space
			e.preventDefault();
			Formulae.editionAction();
			return;
			
		case 112: // f1
			e.preventDefault();
			Formulae.f1();
			return;
	}
}

// Appends a new expression at the end of the script
// It creates a new handler with the expression
// It creates the elements in the tree: A div with class 'input' or 'output' (containing a canvas), and appended into the container div
// It adds a mouseout, mousemove and click event listener to the canvas
// It DOES NOT call prepareDisplay() and display() on the new handler
// It returns the new handler

Formulae.addExpression = function(expression, type) {
	let div = document.createElement("div");
	div.classList.add("row");
	div.style.backgroundColor = (type == Formulae.ROW_INPUT ? "white" : (type == Formulae.ROW_OUTPUT ? "lightgray" : "wheat"));
	
	let canvas = document.createElement("canvas");
	div.appendChild(canvas);
	
	let handler = new ExpressionHandler(expression, canvas.getContext("2d"), type);
	
	// do not uncomment !!! (see below)
	// handler.prepareDisplay();
	// handler.display();
	
	Formulae.handlers.push(handler);
	handler.index = Formulae.handlers.length - 1;
	
	canvas.addEventListener("mouseout", function(event) {
		Formulae.mouseOut(handler);
	});
	
	canvas.addEventListener("mousemove", function(event) {
		Formulae.mouseMove(handler, event);
	});
	
	canvas.addEventListener("click", function(event) {
		Formulae.mouseClick(handler, event);
	});
	
	canvas.addEventListener("touchstart", function(event) {
		Formulae.tap(handler, event);
	});
	
	document.getElementById("container").appendChild(div);
	
	// https://bugs.webkit.org/show_bug.cgi?id=169922
	// it should be above (see comments)
	
	//handler.prepareDisplay();
	//handler.display();
	
	return handler;
}

// Inserts a new expression at a given position of the script
// It creates a new handler with the expression
// It creates the elements in the tree: A div with class 'input' or 'output' (containing a canvas), and appended into the container div
// It adds a mouseout, mousemove and click event listener to the canvas
// It DOES NOT call prepareDisplay() and display() on the new handler
// It returns the new handler

Formulae.insertExpression = function(expression, type, index) {
	let div = document.createElement("div");
	div.classList.add("row");
	div.style.backgroundColor = (type == Formulae.ROW_INPUT ? "white" : (type == Formulae.ROW_OUTPUT ? "lightgray" : "wheat"));
	
	let canvas = document.createElement("canvas");
	div.appendChild(canvas);
	
	let handler = new ExpressionHandler(expression, canvas.getContext("2d"), type);
	
	// do not uncomment !!! (see below)
	// handler.prepareDisplay();
	// handler.display();
	
	//Formulae.handlers.push(handler);
	//handler.index = Formulae.handlers.length - 1;
	Formulae.handlers.splice(index, 0, handler);
	for (let i = index, n = Formulae.handlers.length; i < n; ++i) {
		Formulae.handlers[i].index = i;
	}
	
	canvas.addEventListener("mouseout", function(event) {
		Formulae.mouseOut(handler);
	});
	
	canvas.addEventListener("mousemove", function(event) {
		Formulae.mouseMove(handler, event);
	});
	
	canvas.addEventListener("click", function(event) {
		Formulae.mouseClick(handler, event);
	});
	
	let container = document.getElementById("container");
	container.insertBefore(div, container.childNodes[index + 1]);
	
	// https://bugs.webkit.org/show_bug.cgi?id=169922
	// it should be above (see comments)
	
	//handler.prepareDisplay();
	//handler.display();
	
	return handler;
}

Formulae.deleteExpressions = function(index, count) {
	let container = document.getElementById("container");
	let div, canvas;
	
	for (let i = 0; i < count; ++i) {
		div = container. children[index];  // preventing obfuscation
		canvas = div. children[0];         // preventing obfuscation
		
		// remove canvas listeners MISSING
		div.removeChild(canvas);
		container.removeChild(div);
	}
	
	Formulae.handlers.splice(index, count);
	for (let i = index, n = Formulae.handlers.length; i < n; ++i) {
		Formulae.handlers[i].index = i;
	}
}

Formulae.deleteAllExpressions = function() {
	let container = document.getElementById("container");
	let div, canvas;
	
	while (Formulae.handlers.length > 0) {
		div = container. children[0]; // preventing obfuscation
		canvas = div. children[0];    // preventing obfuscation
		
		// remove canvas listeners MISSING
		div.removeChild(canvas);
		container.removeChild(div);
		
		Formulae.handlers.splice(Formulae.handlers.length - 1, 1);
	}
};

Formulae.addEdition = function(spec, image, name, edition) {
	let ul = document.getElementById("tree");
	let tokens = spec.split(".");
	let token;
	
	outer: for (let t = 0, T = tokens.length; t < T; ++t) {
		token = tokens[t];
		let liList = ul. children;                // preventing obfuscation
		
		for (let i = 0, n = liList.length; i < n; ++i) {
			let liChildren = liList[i]. children; // preventing obfuscation
			
			if (liChildren.length == 2 && liChildren[0].tagName == "SPAN" && liChildren[0].textContent == token && liChildren[1].tagName == "UL") {
				ul = liChildren[1];
				continue outer;
			}
		}
		
		let span = document.createElement("SPAN");
		span.className = "caret";
		span.textContent = token;
		span.addEventListener("click", function() {
			//this.parentElement.querySelector(".nested").classList.toggle("active");
			//this.classList.toggle("caret-down");
			
			span.parentElement.querySelector(".nested").classList.toggle("active");
			span.classList.toggle("caret-down");
		});
		
		let ul2 = document.createElement("UL");
		ul2.className = "nested";
		
		let newLi = document.createElement("LI");
		newLi.appendChild(span);
		newLi.appendChild(ul2);
		
		ul.appendChild(newLi);
		
		ul = ul2;
	}
	
	let img = null;
	if (image != null) {
		img = document.createElement("IMG");
		img.src = image;
	}
	
	let span = null;
	if (name != null) {
		span = document.createElement("SPAN");
		span.textContent = name;
	}
	
	let newLi = document.createElement("LI");
	newLi.className = "edition";
	newLi.addEventListener("click", () => {
		if (Formulae.sHandler.type == Formulae.ROW_OUTPUT) return Formulae.beep();
		Formulae.clearHighlightedExpression();
		edition();
	});
	
	if (img != null) newLi.appendChild(img);
	if (span != null) newLi.appendChild(span);
	
	ul.appendChild(newLi);
}

Formulae.addAction = function(tag, action) {
	let actions = Formulae.actionMap.get(tag);
	if (actions == null) {
		Formulae.actionMap.set(tag, [ action ]);
	}
	else {
		actions.push(action);
	}
}

/*
Formulae.doesFileExist = async function(url) {
	//let req = new XMLHttpRequest();
	//req.open("HEAD", url, false);
	//req.send();
	//return req.status == 200;
	
	let response = fetch(url, { method: "HEAD" }).then(response => {
		console.log(response);
		return response.status == 200;
	});
	
	let x = await response;
	console.log(x);
	return x;
};
*/

// returns: a promise that fulfills to a messages object

Formulae.loadMessages = async function(packageName) {
	let path;
	
	if (packageName === null) {
		path = "i18n/";
	}
	else {
		path = "packages/" + packageName + "/i18n/";
	}
	
	let response = await fetch(path + "messages_" + Formulae.locale + ".json");
	if (response.status != 200) {
		response = await fetch(path + "messages_" + Formulae.locale.substring(0, 2) + ".json");
		if (response.status != 200) {
			response = await fetch(path + "messages.json");
			if (response.status != 200) {
				//throw "Error loading messages";
				return null;
			}
		}
	}
	
	return await response.json();
}

Formulae.home = function() {
	window.open("/?article=Main_page");
};

Formulae.newFile = function() {
	Formulae.deleteAllExpressions();
	Formulae.fileName = null;
	
	let expression = new Expression.Null();
	let handler = Formulae.addExpression(expression, Formulae.ROW_INPUT);
	handler.prepareDisplay();
	handler.display();
	
	if (Formulae.readMode) {
		Formulae.toggleMode();
	}
	else {
		Formulae.setSelected(handler, expression, false);
	}
}

Formulae.openFile = function(e) {
	let file = e.target.files[0];
	if (!file) return;
	
	Formulae.fileName = file.name;
	console.log(file.name);
	
	let reader = new FileReader();
	reader.onload = async function(e) {
		Formulae.deleteAllExpressions();
		
		//let promises = Formulae.xmlToScript(e.target.result);
		//if (promises.length == 0) {
		//	Formulae.setSelected(Formulae.handlers[0], Formulae.handlers[0].expression.moveTo(Expression.DOWN), false);
		//}
		//else {
		//	Promise.all(promises).then(() => {
		//		Formulae.setSelected(Formulae.handlers[0], Formulae.handlers[0].expression.moveTo(Expression.DOWN), false);
		//	});
		//}
		
		let newPackagesLoaded = await Formulae.xmlToScript(e.target.result);
		
		if (!Formulae.readMode) {
			Formulae.setSelected(Formulae.handlers[0], Formulae.handlers[0].expression.moveTo(Expression.DOWN), false);
		}
		
		if (newPackagesLoaded) {
			Formulae.loadReloadEditions();
		}
		
		// TODO set new title
	};
	
	reader.readAsText(file);
	
	// in order to the change event can be fired with the same file
	document.getElementById("file-input").value = "";
}

// https://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings

Formulae.pull = async function() {
	let repository = window.localStorage.getItem("gitHubRepository");
	let branch     = window.localStorage.getItem("gitHubBranch");
	let path       = window.localStorage.getItem("gitHubPath");
	let owner      = window.localStorage.getItem("gitHubOwner");
	let auth       = window.localStorage.getItem("gitHubAuth");
	
	let json = await (await fetch(
		`https://api.github.com/repos/${owner}/${repository}/contents/${path}?ref=${branch}`,
		{
			method: 'GET',
			headers: {
				Accept: 'application/vnd.github+json',
				Authorization: `Bearer ${auth}`
			}
		}
	)).json();
	
	Formulae.lastDigest = json.sha;
	
	//let xml = atob(json.content);
	let xml = decodeURIComponent(
		atob(json.content).split('').map(
			c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
		).join('')
	);
	
	Formulae.deleteAllExpressions();
	
	let newPackagesLoaded = await Formulae.xmlToScript(xml);
	
	if (!Formulae.readMode) {
		Formulae.setSelected(Formulae.handlers[0], Formulae.handlers[0].expression.moveTo(Expression.DOWN), false);
	}
	
	if (newPackagesLoaded) {
		Formulae.loadReloadEditions();
	}
}

Formulae.push = async function() {
	let repository = window.localStorage.getItem("gitHubRepository");
	let branch     = window.localStorage.getItem("gitHubBranch");
	let path       = window.localStorage.getItem("gitHubPath");
	let owner      = window.localStorage.getItem("gitHubOwner");
	let auth       = window.localStorage.getItem("gitHubAuth");
	
	let xmlDocument = await Formulae.scriptToXML();
	let xml = Formulae.formatXML(new XMLSerializer().serializeToString(xmlDocument));
	
	let base64 = btoa(
		encodeURIComponent(xml).
		replace(
			/%([0-9A-F]{2})/g,
			(match, p1) => String.fromCharCode('0x' + p1)
		)
	);
	
	//console.log(xml);
	
	const json = await (await fetch(
		`https://api.github.com/repos/${owner}/${repository}/contents/${path}`,
		{
			method: 'PUT',
			headers: {
				Accept: 'application/vnd.github+json',
				Authorization: `Bearer ${auth}`
			},
			body: JSON.stringify({
				message : "Updated with Fōrmulæ",
				content : base64,
				sha     : Formulae.lastDigest,
				branch  : branch
			}),
		}
	)).json();
	
	Formulae.lastDigest = json.content.sha;
	
	alert("Script saved");
}

// https://stackoverflow.com/questions/376373/pretty-printing-xml-with-javascript

Formulae.formatXML = function(xml, tab = '\t') {
	var formatted = '', indent= '';
	xml.split(/>\s*</).forEach(function(node) {
		if (node.match(/^\/\w/)) indent = indent.substring(tab.length); // decrease indent by one 'tab'
		formatted += indent + '<' + node + '>\r\n';
		if (node.match(/^<?\w[^>]*[^\/]$/)) indent += tab;              // increase indent
	});
	
	return formatted.substring(1, formatted.length - 3);
}

Formulae.saveFile = async function(e) {
	let xmlDocument = await Formulae.scriptToXML();
	
	let blob = new Blob([ Formulae.formatXML(new XMLSerializer().serializeToString(xmlDocument)) ], { type: 'text/xml' });
	
	let a = document.createElement('a');
	//a.download = (Formulae.fileName != null ? Formulae.fileTitle : 'download') + ".formulae";
	a.download = (Formulae.fileName != null ? Formulae.fileName : 'download.formulae');
	a.href = window.URL.createObjectURL(blob);
	a.textContent = 'Download ready';
	a.style = 'display:none';
	a.click(); 
}

Formulae.print = function() {
	let mywindow = window.open('', 'PRINT', 'height=400,width=600');
	
	mywindow.document.write('<html><head><title>' + document.title  + '</title>');
	mywindow.document.write('</head><body >');
	mywindow.document.write('<h1>' + document.title  + '</h1>');
	mywindow.document.write(document.getElementById("container").innerHTML);
	mywindow.document.write('</body></html>');
	
	mywindow.document.close(); // necessary for IE >= 10
	mywindow.focus(); // necessary for IE >= 10*/
	
	mywindow.print();
	mywindow.close();
}

Formulae.fillFileInfo = function() {
	let f;
	
	f = Formulae.parameters.get("script");
	if (f !== null) {
		f = "content/" + f;
	}
	else { // backward compatibility, specially Rosetta code
		f = Formulae.parameters.get("example");
		if (f !== null) {
			f = "content/examples/" + f;
		}
	}
	
	if (f == null) {
		f = "content/articles/Main_page";
	}
	
	//f = f.replaceAll('_', ' ') + ".formulae";
	f = f.replace(/\_/g, ' ');
	
	Formulae.fileName = f + '.formulae?' + (new Date()).getTime();
	Formulae.fileTitle = f.substring(f.indexOf("/") + 1);
	
	document.title = Formulae.fileTitle;
}

Formulae.loadFile = async () => {
	let response = await fetch(Formulae.fileName);
	if (!response.ok) {
		Formulae.fileName = "content/articles/404.formulae?" + (new Date()).getTime();
		response = await fetch(Formulae.fileName);
	}
	
	let xml = await response.text();
	let newPackagesLoaded = await Formulae.xmlToScript(xml);
	
	if (!Formulae.readMode) {
		Formulae.setSelected(Formulae.handlers[0], Formulae.handlers[0].expression.moveTo(Expression.DOWN), false);
	}
	
	if (newPackagesLoaded) {
		Formulae.loadReloadEditions();
	}
	
	if (Formulae.fileName != "Main page.formulae") {
		let description = "Fōrmulæ - " + Formulae.fileTitle;
		document.title = description;
		document.head.children.namedItem('description').content = description;
	}
	
	/*
	fetch(Formulae.fileName)
	.then(result => {
		if (!result.ok) {
			//throw new Error(Formulae.messages.labelFileNotFound);
			throw new Error;
		}
		
		return result.text();
	})
	.then(xml => {
		//try {
			//Formulae.xmlToScript(text);
			//Formulae.setSelected(Formulae.handlers[0], Formulae.handlers[0].expression.moveTo(Expression.DOWN), false);
			
			let promises = Formulae.xmlToScript(xml);
			if (promises.length == 0) {
				Formulae.setSelected(Formulae.handlers[0], Formulae.handlers[0].expression.moveTo(Expression.DOWN), false);
			}
			else {
				Promise.all(promises).then(() => {
					Formulae.setSelected(Formulae.handlers[0], Formulae.handlers[0].expression.moveTo(Expression.DOWN), false);
				});
			}
			
			if (Formulae.fileName != "Main page.formulae") {
				let description = "Fōrmulæ - " + Formulae.fileTitle;
				document.title = description;
				document.head. children.namedItem('description').content = description;
			}
		//}
		//catch (err) {
		//	console.error(err);
		//	alert(err);
		//}
	//});
	})
	.catch (error => {
		//let expression = new Expression.Null();
		//let handler = Formulae.addExpression(expression, Formulae.ROW_INPUT);
		//handler.prepareDisplay();
		//handler.display();
		//Formulae.setSelected(handler, expression, false);
		
		//alert(error);
		
		//window.location.href = "/404";
	});
	*/
}

Formulae.xmlToCrawling = function(element, container) {
	switch (element.getAttribute("tag")) {
		case "String.Text": {
			let span = document.createElement("span");
			span.innerHTML = element.getAttribute("Value").replace(/[\u00A0-\u9999<>\&]/g, i => '&#' + i.charCodeAt(0) + ';') + ' ';
			container.appendChild(span);
			return;
		}
		
		case "String.String": {
			let code = document.createElement("code");
			code.innerHTML = element.getAttribute("Value").replace(/[\u00A0-\u9999<>\&]/g, i => '&#' + i.charCodeAt(0) + ';') + ' ';
			container.appendChild(code);
			return;
		}
		
		case "Internet.UniformResourceLocator": {
			let a = document.createElement("a");
			a.href = element.getAttribute("Value");
			a.innerHTML = element.getAttribute("Description").replace(/[\u00A0-\u9999<>\&]/g, i => '&#' + i.charCodeAt(0) + ';') + ' ';
			container.appendChild(a);
			return;
		}
		
		case "Graphics.RasterGraphics": {
			let p = document.createElement("p");
			let img = document.createElement("img");
			img.src = "data:image/png;base64," + element.getAttribute("Value");
			container.appendChild(p);
			p.appendChild(img);
			return;
		}
		
		case "Typesetting.Paragraph": {
			let p = document.createElement("p");
			container.appendChild(p);
			container = p;
		}
	}
	
	for (let i = 0, n = element.childElementCount; i < n; ++i) {
		Formulae.xmlToCrawling(element .children[i], container); // preventing obfuscation
	}
}

Formulae.outputForCrawling = function() {
	fetch(Formulae.fileName)
	.then(result => {
		if (!result.ok) {
			throw new Error;
		}
		
		return result.text();
	})
	.then(xmlText => {
		let parser = new DOMParser();
		let doc = parser.parseFromString(xmlText, "text/xml");
		let body = document.createElement("body");
		Formulae.xmlToCrawling(doc.documentElement, body);
		document.body = body;
	})
	.catch (error => {
		window.location.href = "/404";
	});
}

Formulae.toggleMode = function() {
	Formulae.readMode = !Formulae.readMode;
	let display = Formulae.readMode ? "none" : "block";
	
	[
		"button-home", "button-save", "button-pull", "button-push", "button-cut",
		"button-copy", "button-paste",
		"button-ins-after", "button-ins-before", "button-delete",
		"button-change-type", "button-execute_sticky",
		"button-tools", "button-settings"
	].forEach(element => {
		document.getElementById(element).style.display = display;
	});
	
	document.getElementById("sidebar").style.width = Formulae.readMode ? "0px" : "300px";
	document.getElementById("dragbar").style.left = Formulae.readMode ? "0px" : "301px";
	document.getElementById("main").style.left = Formulae.readMode ? "0px" : "308px";
	
	document.getElementById("main").style.bottom = Formulae.readMode ? "0px" : "50px";
	document.getElementById("footer").style.height = Formulae.readMode ? "0px" : "50px";
	
	document.getElementById("sidebar").style.display = display;
	document.getElementById("dragbar").style.display = display;
	document.getElementById("footer").style.display = display;
	
	document.getElementById("button-mode").innerHTML = Formulae.readMode ? "Edit&nbsp;/&nbsp;run" : "Exit&nbsp;edit&nbsp;/&nbsp;run";
	
	if (Formulae.readMode) {
		Formulae.clearSelected();
	}
	else {
		Formulae.setSelected(Formulae.handlers[0], Formulae.handlers[0].expression.moveTo(Expression.DOWN), false);
	}
	
	document.getElementById("main").focus();
};

Formulae.start = async function() {
	Formulae.fillFileInfo();
	
	if (
		new RegExp(
			"bot|spider|crawl|" + // generic
			"APIs-Google|AdsBot|Googlebot|mediapartners|Google Favicon|FeedFetcher|Google-Read-Aloud|DuplexWeb-Google|googleweblight|" + // Google
			"bing|yandex|baidu|duckduck|yahoo|ecosia|ia_archiver|" + // other engines
			"facebook|instagram|pinterest|reddit|slack|twitter|whatsapp|youtube|" + // social
			"semrush", // other
			"i"
		).test(navigator.userAgent)
	) { // a web crawer
		Formulae.outputForCrawling();
		return;
	}
	
	Formulae.loadPreferences();
	
	Formulae.main = document.getElementById("main");
	Formulae.menu = document.getElementById("menu");
	Formulae.modal = document.getElementById("mymodal");
	Formulae.modalContent = document.getElementById("modalContent");
	Formulae.s_info = document.getElementById("s_info");
	Formulae.h_info = document.getElementById("h_info");
	
	Formulae.setExpression(null, "Null",                           Expression.Null);
	Formulae.setExpression(null, "Error",                          Expression.ErrorExpression);
	Formulae.setExpression(null, "Formulae.WaitingExpression",     Formulae.WaitingExpressionClass);
	Formulae.setExpression(null, "Formulae.LocalConnectionError",  Formulae.LocalConnectionErrorClass);
	Formulae.setExpression(null, "Formulae.RemoteConnectionError", Formulae.RemoteConnectionErrorClass);
	Formulae.setExpression(null, "Formulae.QuotaExceeded",         Formulae.QuotaExceededClass);
	
	//////////////////////////////////////////////////////////////
	
	// preventing scroll using arrow keys
	// direction keys
	
	document.addEventListener("keydown", function(e) {
		if (Formulae.readMode) {
			return;
		}
		
		if([37, 38, 39, 40].indexOf(e.keyCode) > -1) {
			e.preventDefault();
		}
		
		Formulae.onKey(e);
	}, false);
	
	/////////////////
	// mouse wheel //
	/////////////////
	
	document.addEventListener("wheel", Formulae.mouseWheel);
	
	///////////
	// Modal //
	///////////
	
	Formulae.modal.addEventListener("keydown", event => {
		if (event.keyCode == 27) {
			event.preventDefault(); // for Safari
			Formulae.modal.style.display = "none";
		}
		event.stopPropagation();
	});
	
	//Formulae.modal.addEventListener("keydown", e => event.stopPropagation(), true);
	
	/////////////
	// buttons //
	/////////////
	
	document.getElementById("button-home").addEventListener("click", () => Formulae.home());
	
	document.getElementById("button-new") .addEventListener("click", () => Formulae.newFile());
	document.getElementById("button-open").addEventListener("click", () => document.getElementById("file-input").click());
	document.getElementById("file-input") .addEventListener("change", e => Formulae.openFile(e), false);
	document.getElementById("button-save").addEventListener("click", () => Formulae.saveFile());
	
	document.getElementById("button-pull").addEventListener("click", () => Formulae.pull());
	document.getElementById("button-push").addEventListener("click", () => Formulae.push());
	
	document.getElementById("button-cut")  .addEventListener("click", () => Formulae.editionCut());
	document.getElementById("button-copy") .addEventListener("click", () => Formulae.editionCopy());
	document.getElementById("button-paste").addEventListener("click", () => Formulae.editionPaste());
	
	document.getElementById("button-ins-after") .addEventListener("click", () => Formulae.editionInsertRowAfter());
	document.getElementById("button-ins-before").addEventListener("click", () => Formulae.editionInsertRowBefore());
	document.getElementById("button-delete")    .addEventListener("click", () => Formulae.editionDeleteRow());
	
	document.getElementById("button-change-type")   .addEventListener("click", () => Formulae.changeType());
	document.getElementById("button-execute_sticky").addEventListener("click", () => Formulae.sendSticky());
	
	document.getElementById("button-tools")   .addEventListener("click", () => Formulae.Tools.showTools());
	document.getElementById("button-settings").addEventListener("click", () => Formulae.Settings.showSettings());
	
	document.getElementById("button-mode").addEventListener("click", () => Formulae.toggleMode());
	
	//////////////
	// drag bar //
	//////////////
	
	let dragBar = document.getElementById("dragbar");
	let dragging = false;
	
	function drag(e) {
		if (e.pageX >= 50 && e.pageX <= (document.documentElement.clientWidth - 50)) {
			if (Formulae.ltr) {
				document.getElementById("sidebar").style.width = (e.pageX + 2) + "px";
				document.getElementById("dragbar").style.left = (e.pageX + 2) + "px";
				document.getElementById("main").style.left = (e.pageX + 9) + "px";
			}
			else {
				let x = document.documentElement.clientWidth - e.pageX;
				document.getElementById("sidebar").style.width = (x + 2) + "px";
				document.getElementById("dragbar").style.right = (x + 2) + "px";
				document.getElementById("main").style.right = (x + 9) + "px";
			}
		}
	}
	
	dragBar.addEventListener("mousedown", function(e) {
		e.preventDefault();
		dragging = true;
		document.addEventListener("mousemove", drag);
	});
	
	document.addEventListener("mouseup", function(e) {
		if (dragging) {
			document.removeEventListener("mousemove", drag);
			dragging = false;
		}
	});
	
	////////////////////////
	// resizing work area //
	////////////////////////
	
	//window.addEventListener("resize", Formulae.refreshTypesettingHandlers);
	new ResizeObserver(() => {
		if (Formulae.lastWidth != Formulae.main.clientWidth) {
			Formulae.lastWidth = Formulae.main.clientWidth;
			Formulae.refreshTypesettingHandlers();
		}
	}).observe(Formulae.main);
	
	/////////////////
	// right click //
	/////////////////
	
	//if (document.addEventListener) {
		Formulae.main.addEventListener(
			'contextmenu',
			function(e) {
				if (Formulae.readMode) {
					return;
				}
				
				if (Formulae.menu.style.visibility == "visible") {
					Formulae.menu.style.visibility = "hidden";
				}
				else {
					if (Formulae.hExpression == null) {
						Formulae.beep();
					}
					else {
						if (Formulae.hExpression != Formulae.sExpression) {
							Formulae.setSelected(Formulae.hHandler, Formulae.hExpression, true);
						}
						
						Formulae.prepareMenu();
						
						let x = e.clientX;
						let y = e.clientY;
						Formulae.menu.style.top = 0;
						Formulae.menu.style.left = 0;
						//if (x + Formulae.menu.offsetWidth  > Formulae.main.innerWidth ) x = Formulae.main.innerWidth  - Formulae.menu.offsetWidth;
						//if (y + Formulae.menu.offsetHeight > Formulae.main.innerHeight) y = Formulae.main.innerHeight - Formulae.menu.offsetHeight;
						if (x + Formulae.menu.offsetWidth  > Formulae.main.parentElement.clientWidth ) x = Formulae.main.parentElement.clientWidth  - Formulae.menu.offsetWidth;
						if (y + Formulae.menu.offsetHeight > Formulae.main.parentElement.clientHeight) y = Formulae.main.parentElement.clientHeight - Formulae.menu.offsetHeight;
						Formulae.menu.style.left = x + "px";
						Formulae.menu.style.top  = y + "px";
						Formulae.menu.style.visibility = "visible";
					}
				}
				
				e.preventDefault();
			},
			false
		);
	//} 
	//else {
	//	document.attachEvent('oncontextmenu', function() { // <-- why ?
	//		alert("You've tried to open context menu2");
	//		window.event.returnValue = false;
	//	});
	//}
	
	document.addEventListener(
		'click',
		function(e) {
			if (Formulae.menu.style.visibility == "visible") {
				Formulae.menu.style.visibility = "hidden";
			}
		},
		false
	);
	
	document.addEventListener(
		'dblclick',
		function(e) {
			if (Formulae.readMode) {
				return;
			}
			
			if (Formulae.menu.style.visibility == "visible") {
				Formulae.menu.style.visibility = "hidden";
			}
			else {
				if (Formulae.hExpression == null) {
					Formulae.beep();
				}
				else {
					if (Formulae.hExpression != Formulae.sExpression) {
						Formulae.setSelected(Formulae.hHandler, Formulae.hExpression, true);
					}
					
					Formulae.prepareMenu();
					
					let x = e.clientX;
					let y = e.clientY;
					Formulae.menu.style.top = 0;
					Formulae.menu.style.left = 0;
					//if (x + Formulae.menu.offsetWidth  > Formulae.main.innerWidth ) x = Formulae.main.innerWidth  - Formulae.menu.offsetWidth;
					//if (y + Formulae.menu.offsetHeight > Formulae.main.innerHeight) y = Formulae.main.innerHeight - Formulae.menu.offsetHeight;
					if (x + Formulae.menu.offsetWidth  > Formulae.main.parentElement.clientWidth ) x = Formulae.main.parentElement.clientWidth  - Formulae.menu.offsetWidth;
					if (y + Formulae.menu.offsetHeight > Formulae.main.parentElement.clientHeight) y = Formulae.main.parentElement.clientHeight - Formulae.menu.offsetHeight;
					Formulae.menu.style.left = x + "px";
					Formulae.menu.style.top  = y + "px";
					Formulae.menu.style.visibility = "visible";
				}
			}
				
			e.preventDefault();
		},
		false
	);
	
	// tree && messages
	
	//window.addEventListener("unhandledrejection", event => event.preventDefault(), false); // does not work
	
	//await Formulae.loadRefreshLocalization(true); // first time
	
	Formulae.setOrientation();
	
	Formulae.messages = await Formulae.loadMessages(null);
	Formulae.setLocalizationCodes();
	
	if (Formulae.scriptAtStart) {
		// it calls loadPackages and loadReloadEdition)
		await Formulae.loadFile(); // if any
	}
	else {
		await Formulae.loadPackages();
		Formulae.newFile();
		Formulae.loadReloadEditions();
	}
	
	//if (!Formulae.supportsMouse()) {
	//	alert("x");
	//}
	
	document.getElementById("main").focus();
}

/*
Formulae.supportsMouse = function() {
	//try{
	//	document.createEvent("MouseEvent");
	//	return true;
	//}
  	//catch(e) {
	//	return false;
	//}
	
	return !('ontouchstart' in document.documentElement);
}
*/

Formulae.prepareMenu = function() {
	while (Formulae.menu.firstChild) {
		Formulae.menu.removeChild(Formulae.menu.lastChild);
	}
	
	let actions = Formulae.actionMap.get(Formulae.sExpression.getTag());
	let n = 0;
	let span;
	
	if (actions != null) {
		n = actions.length;
		
		for (let i = 0; i < n; ++i) {
			span = document.createElement("span");
			span.innerHTML = actions[i].getDescription();
			span.onclick = () => { setTimeout(actions[i].doAction, 10) };
			Formulae.menu.appendChild(span);
		}
	}
	
	if (n > 0) {
		span = document.createElement("hr");
		Formulae.menu.appendChild(span);
	}
	
	if (Formulae.sHandler.type == Formulae.ROW_INPUT) {
		span = document.createElement("span");
		span.innerHTML = "Cut";
		span.onclick = Formulae.editionCut;
		Formulae.menu.appendChild(span);
	}
	
	span = document.createElement("span");
	span.innerHTML = "Copy";
	span.onclick = Formulae.editionCopy;
	Formulae.menu.appendChild(span);
	
	if (Formulae.sHandler.type == Formulae.ROW_INPUT) {
		span = document.createElement("span");
		span.innerHTML = "Paste";
		span.onclick = Formulae.editionPaste;
		Formulae.menu.appendChild(span);
	}
};

Formulae.loadPreferences = function() {
	Formulae.locale = Formulae.parameters.get("locale");
	if (Formulae.locale == null || Formulae.locales[Formulae.locale] === undefined) {
		Formulae.locale = window.localStorage.getItem("locale");
		if (Formulae.locale == null || Formulae.locales[Formulae.locale] === undefined) {
			Formulae.locale = navigator.language;
			if (Formulae.locale == null || Formulae.locales[Formulae.locale] === undefined) {
				Formulae.locale = "en-US";
			}
		}
	}
	
	Formulae.timeZone = Formulae.parameters.get("timeZone");
	if (Formulae.timeZone == null || Formulae.timeZones[Formulae.timeZone] === undefined) {
		Formulae.timeZone = window.localStorage.getItem("timeZone");
		if (Formulae.timeZone == null || Formulae.timeZones[Formulae.timeZone] === undefined) {
			Formulae.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			if (Formulae.timeZone == null || Formulae.timeZones[Formulae.timeZone] === undefined) {
				Formulae.timeZone = "UTC";
			}
		}
	}
	
	Formulae.fontSize = parseInt(Formulae.parameters.get("fontSize"));
	if (Formulae.fontSize == null || isNaN(Formulae.fontSize) || Formulae.fontSize < 6) {
		Formulae.fontSize = parseInt(window.localStorage.getItem("fontSize"));
		if (Formulae.fontSize == null || isNaN(Formulae.fontSize) || Formulae.fontSize < 6) {
			Formulae.fontSize = 14;
		}
	}
};

Formulae.savePreferences = function() {
	window.localStorage.setItem("locale", Formulae.locale);
	window.localStorage.setItem("timeZone", Formulae.timeZone);
	window.localStorage.setItem("fontSize", Formulae.fontSize);
	
	alert(Formulae.messages.labelSettingsSaved);
};


// returns: whether new packages were loaded

Formulae.doesURLExist = function(url) {
	let http = new XMLHttpRequest();
	http.open("HEAD", url, false);
	http.send();
	return http.status != 404;
}

Formulae.loadPackages = async () => {
	let newPackagesLoaded = false;
	
	//let promises = [];
	
	//Formulae.packages.forEach(async (packageInfo, packageName) => {
	//	if (packageInfo.required && packageInfo.module === null) {
	//		console.log("loading " + packageName);
			/*
			try {
				let promise = import("../packages/" + packageName + "/frontend.js").then(
					async m => {
						let module = m[Object.keys(m)[0]];
						packageInfo.module = module;
						
						module.messages = await Formulae.loadMessages(packageName);
						module.setExpressions(packageName);
						//module.setEditions();
						module.setActions();
						module.setReducers();
					}
				);
				
				promises.push(promise);
				newPackagesLoaded = true;
			}
			catch (error) {
				console.error(error);
			}
			*/

			/*			
			let promiseMessages = Formulae.loadMessages(packageName);
			promises.push(promiseMessages);
			
			let promiseBody = promiseMessages.then(
				messages => {
					console.log(messages);
					let promiseModule = import("../packages/" + packageName + "/frontend.js");
					promises.push(promiseModule);
					promiseModule.then(
						module => {
							let clazz = module[Object.keys(module)[0]];
							console.log(clazz);
							packageInfo.module = clazz;
							
							clazz.messages = messages;
							clazz.setExpressions(packageName);
							//module.setEditions();
							clazz.setActions();
							clazz.setReducers();
						}
					);
				}
			);
			promises.push(promiseBody);
			*/
			
			/*
			let messages = await Formulae.loadMessages(packageName);
			let module = await import("../packages/" + packageName + "/frontend.js");
			let clazz = module[Object.keys(module)[0]];
			packageInfo.module = clazz;
			
			clazz.messages = messages;
			clazz.setExpressions(packageName);
			//module.setEditions();
			clazz.setActions();
			clazz.setReducers();
			
			newPackagesLoaded = true;
			*/
	//	}
	//});
	
	//console.log(promises.length);
	//console.log(newPackagesLoaded);
	//await Promise.all(promises);
	
	/////////////
	// commons //
	/////////////
	
	let packagesArray = Array.from(Formulae.packages);
	let promises;
	
	promises = [];
	packagesArray.map(async p => {
		let packageName = p[0];
		let packageInfo = p[1];
		
		if (packageInfo.required) {
			if (packageInfo.messages === null) {
				let promise = Formulae.loadMessages(packageName);
				promises.push(promise);
				promise.then(messages => {
					packageInfo.messages = messages;
					console.log(packageName + " MESSAGES DONE");
				});
			}
			
			if (packageInfo.commonRequired && packageInfo.common === null) {
				let fileName = "../packages/" + packageName + "/common.js";
				let promise = import(fileName);
				promises.push(promise);
				promise.then(module => {
					packageInfo.common = module[Object.keys(module)[0]];
					console.log(packageName + " COMMON DONE");
				});
			}
		}
	});
	
	await Promise.all(promises);
	
	////////////////////////////////////
	// expressions, editions, reducers //
	////////////////////////////////////
	
	promises = [];
	packagesArray.map(async p => {
		let packageName = p[0];
		let packageInfo = p[1];
		
		if (packageInfo.required) {
			let fileName = "../packages/" + packageName + "/expression.js";
			if (packageInfo.classExpression === null) {
				let promiseExpression = import(fileName);
				promises.push(promiseExpression);
				promiseExpression.then(module => {
					packageInfo.classExpression = module[Object.keys(module)[0]];
					packageInfo.classExpression.messages = packageInfo.messages;
					packageInfo.classExpression.common = packageInfo.common;
					packageInfo.classExpression.setExpressions(packageName);
					console.log(packageName + " EXPRESSIONS DONE");
				});
			}
			
			fileName = "../packages/" + packageName + "/edition.js";
			if (packageInfo.classEdition === null) {
				let promiseEdition = import(fileName);
				promises.push(promiseEdition);
				promiseEdition.then(module => {
					packageInfo.classEdition = module[Object.keys(module)[0]];
					packageInfo.classEdition.messages = packageInfo.messages;
					packageInfo.classEdition.common = packageInfo.common;
					packageInfo.classEdition.setEditions();
					packageInfo.classEdition.setActions();
					console.log(packageName + " EDITIONS DONE");
				});
			}
			
			fileName = "../packages/" + packageName + "/reduction.js";
			if (packageInfo.classReduction === null) {
				let promiseReduction = import(fileName);
				promises.push(promiseReduction);
				promiseReduction.then(module => {
					packageInfo.classReduction = module[Object.keys(module)[0]];
					packageInfo.classReduction.messages = packageInfo.messages;
					packageInfo.classReduction.common = packageInfo.common;
					//packageInfo.classReduction.setReducers();
					console.log(packageName + " REDUCERS DONE");
				});
			}
		}
	});
	
	await Promise.all(promises);
	
	/*
	promises = Array.from(Formulae.packages.keys()).map(
		async packageName => {
			let packageInfo = Formulae.packages.get(packageName);
			if (packageInfo.required && packageInfo.classExpression === null) {
				newPackagesLoaded = true;
				console.log("loading " + packageName);
				
				//if (packageInfo.messages === null) {
				//	packageInfo.messages = await Formulae.loadMessages(packageName);
				//}
				
				let module;
				
				module = await import("../packages/" + packageName + "/expression.js");
				packageInfo.classExpression = module[Object.keys(module)[0]];
				packageInfo.classExpression.messages = packageInfo.messages;
				packageInfo.classExpression.common = packageInfo.common;
				packageInfo.classExpression.setExpressions(packageName);
				
				module = await import("../packages/" + packageName + "/edition.js");
				packageInfo.classEdition = module[Object.keys(module)[0]];
				packageInfo.classEdition.messages = packageInfo.messages;
				packageInfo.classEdition.common = packageInfo.common;
				packageInfo.classEdition.setActions(); // <-- here ???
				
				module = await import("../packages/" + packageName + "/reduction.js");
				packageInfo.classReduction = module[Object.keys(module)[0]];
				packageInfo.classReduction.messages = packageInfo.messages;
				packageInfo.classReduction.common = packageInfo.common;
				//packageInfo.classReduction.setReducers();
			}
		}
	);
	await Promise.all(promises);
	*/
	
	///////////////////////////////////////////////////////
	// Reducers only, in order to ensure order they load //
	///////////////////////////////////////////////////////
	
	for (let p of packagesArray) {
		let packageName = p[0];
		let packageInfo = p[1];
		
		if (packageInfo.required && !packageInfo.reducersSet) {
			//let module = await import("../packages/" + packageName + "/reduction.js");
			//packageInfo.classReduction = module[Object.keys(module)[0]];
			//packageInfo.classReduction.messages = packageInfo.messages;
			//packageInfo.classReduction.common = packageInfo.common;
			packageInfo.classReduction.setReducers();
			packageInfo.reducersSet = true;
			console.log(packageName + " REDUCERSET DONE");
		}
	}
	
	return newPackagesLoaded;
};

Formulae.loadReloadEditions = () => {
	console.log("Loading editions")
	document.getElementById("tree").innerHTML = '';
	
	Formulae.packages.forEach((packageInfo, packageName) => {
		if (packageInfo.classEdition !== null) {
			console.log("set editions for " + packageName);
			//packageInfo.module.setEditions();
			packageInfo.classEdition.setEditions();
		}
	});
}

Formulae.setLocalizationCodes = () => {
	Formulae.languageCodes.sort((c1, c2) => Formulae.messages["language_" + c1].localeCompare(Formulae.messages["language_" + c2], Formulae.locale));
	Formulae.countryCodes.sort((c1, c2) => Formulae.messages["country_" + c1].localeCompare(Formulae.messages["country_" + c2], Formulae.locale));
	
	Formulae.scriptCodes = Object.keys(Formulae.scripts);
	Formulae.scriptCodes.sort((c1, c2) => Formulae.messages["script_" + c1].localeCompare(Formulae.messages["script_" + c2], Formulae.locale));
	
	Formulae.numeralCodes = Object.keys(Formulae.numerals);
	Formulae.numeralCodes.sort((c1, c2) => Formulae.messages["numeral_" + c1].localeCompare(Formulae.messages["numeral_" + c2], Formulae.locale));
	
	Formulae.calendarCodes.sort((c1, c2) => Formulae.messages["calendar_" + c1].localeCompare(Formulae.messages["calendar_" + c2], Formulae.locale));
	
	Formulae.localeCodes = Object.keys(Formulae.locales);
	Formulae.localeCodes.sort((c1, c2) => Formulae.getLocaleName(c1).localeCompare(Formulae.getLocaleName(c2), Formulae.locale));
}

Formulae.loadRefreshLocalization = async function(firstTime) {
	Formulae.setOrientation();
	
	if (firstTime) {
		Formulae.messages = await Formulae.loadMessages(null);
	}
	
	/*
	Formulae.languageCodes.sort((c1, c2) => Formulae.messages["language_" + c1].localeCompare(Formulae.messages["language_" + c2], Formulae.locale));
	Formulae.countryCodes.sort((c1, c2) => Formulae.messages["country_" + c1].localeCompare(Formulae.messages["country_" + c2], Formulae.locale));
	
	Formulae.scriptCodes = Object.keys(Formulae.scripts);
	Formulae.scriptCodes.sort((c1, c2) => Formulae.messages["script_" + c1].localeCompare(Formulae.messages["script_" + c2], Formulae.locale));
	
	Formulae.numeralCodes = Object.keys(Formulae.numerals);
	Formulae.numeralCodes.sort((c1, c2) => Formulae.messages["numeral_" + c1].localeCompare(Formulae.messages["numeral_" + c2], Formulae.locale));
	
	Formulae.calendarCodes.sort((c1, c2) => Formulae.messages["calendar_" + c1].localeCompare(Formulae.messages["calendar_" + c2], Formulae.locale));
	
	Formulae.localeCodes = Object.keys(Formulae.locales);
	Formulae.localeCodes.sort((c1, c2) => Formulae.getLocaleName(c1).localeCompare(Formulae.getLocaleName(c2), Formulae.locale));
	*/
	
	Formulae.setLocalizationCodes();
	
	if (firstTime) {
		/*
		Array.from(Formulae.defaultModules, (moduleName, i) => {
			let name = Object.keys(modules[i])[0];
			
			modules[i][name].setExpressions(moduleName);
			modules[i][name].setEditions();
			modules[i][name].setActions();
		});
		*/
		
		//await Formulae.loadModules();
		
		await Formulae.loadFile(); // if any
	}
	else {
		Formulae.loadReloadEdition();
		
		Formulae.refreshHandlers();
	}
};

Formulae.setOrientation = function() {
	//let ltr = Formulae.scripts[Formulae.locales[Formulae.locale][2]];
	let ltr = true;
	
	if (Formulae.ltr != ltr) {
		Formulae.ltr = ltr;
		
		let sideBar = document.getElementById("sidebar");
		let main = document.getElementById("main");
		let dragBar = document.getElementById("dragbar");	
		
		if (Formulae.ltr) {
			sideBar.style.left = "0px";
			sideBar.style.right = "auto";
			//sideBar.style.width = "300px";
			
			main.style.left = "308px";
			main.style.right = "0px";
			
			document.body.setAttribute('dir', 'ltr');
			
			dragBar.style.left = "301px";
			dragBar.style.right = "auto";
		}
		else {
			sideBar.style.left = "auto";
			sideBar.style.right = "0px";
			//sideBar.style.width = "300px";
			
			main.style.left = "0px";
			main.style.right = "308px";
			
			document.body.setAttribute('dir', 'rtl');
			
			dragBar.style.left = "auto";
			dragBar.style.right = "301px";
		}
	}
}

Formulae.refreshHandlers = function() {
	let handler;
	for (let i = 0, n = Formulae.handlers.length; i < n; ++i) {
		handler = Formulae.handlers[i];
		
		handler.restart();
		handler.prepareDisplay();
		handler.display();
	}
	
	Formulae.setSelected(Formulae.sHandler, Formulae.sExpression, false);
};

Formulae.refreshTypesettingHandlers = function() {
	Formulae.clearHighlightedExpression();

	let expression;
	
	for (let i = 0, n = Formulae.handlers.length; i < n; ++i) {
		expression = Formulae.handlers[i].expression;
		if (expression.getTag().startsWith("Typesetting")) {
			Formulae.handlers[i].prepareDisplay();
			Formulae.handlers[i].display();
			
			if (Formulae.sHandler == Formulae.handlers[i]) { // restore selected expression
				if (!Formulae.readMode) {
					Formulae.setSelected(Formulae.sHandler, Formulae.sExpression, false);
				}
			}
		}
	}
};

Formulae.UnknownExpression = class extends Expression {
	//constructor() { // tag is set by createExpression
	//	super();
	//	this.description = "Unknown expression";
	//}
	
	getTag() { return this.tag; }
	getName() { return Formulae.messages.nameUnknownExpression; }
	getMnemonic() { return this.tag; }
	//canHaveChildren(count) { return count == this.children.length; }
	canHaveChildren(count) { return true; }
	
	prepareDisplay(context) {
		let offsetX = 10;
		let offsetY = 10 + context.fontInfo.size + 20;
		
		this.prepareDisplayAsFunction(context);
		
		this.oldWidth = this.width;
		
		this.width += offsetX + 10;
		
		let w = offsetX + Math.round(context.measureText(Formulae.messages.labelUnknownExpression).width) + 10;
		if (w > this.width) this.width = w;
		this.vertBaseline += offsetX;
		
		this.height += offsetY + 10;
		this.horzBaseline += offsetY;
		
		for (let i = 0, n = this.children.length; i < n; ++i) {
			this.children[i].x += offsetX;
			this.children[i].y += offsetY;
		}
	}
	
	display(context, x, y) {
		let offsetX = 10;
		let offsetY = 10 + context.fontInfo.size + 20;
		
		let bkp = this.width;
		
		this.width = this.oldWidth;
		this.height -= offsetY + 10;
		this.horzBaseline -= offsetY;
		this.vertBaseline -= offsetX;
		
		for (let i = 0, n = this.children.length; i < n; ++i) {
			this.children[i].x -= offsetX;
			this.children[i].y -= offsetY;
		}
		
		this.displayAsFunction(context, x + offsetX, y + offsetY);
		
		this.width = bkp;
		this.height += offsetY + 10;
		this.horzBaseline += offsetY;
		this.vertBaseline += offsetX;
		
		for (let i = 0, n = this.children.length; i < n; ++i) {
			this.children[i].x += offsetX;
			this.children[i].y += offsetY;
		}
		
		//////////////////////////////////
		
		let bkpFillStyle = context.fillStyle;
		let bkpStrokeStyle = context.strokeStyle;
		
		context.fillStyle = "red";
		context.strokeStyle = "red";
		
		context.strokeRect(x, y, this.width, this.height);
		context.beginPath();
		context.moveTo (x, y + 10 + context.fontInfo.size + 10);              // preventing obfuscation
		context.lineTo (x + this.width, y + 10 + context.fontInfo.size + 10); // preventing obfuscation
		context.stroke();
		
		super.drawText(context, Formulae.messages.labelUnknownExpression, x + 10, y + 10 + context.fontInfo.size);
		
		context.fillStyle = bkpFillStyle;
		context.strokeStyle = bkpStrokeStyle;
	}
};

Formulae.IllegalArgumentsExpression = class extends Expression {
	constructor(tag) {
		super();
		this.tag = tag;
		
		this.names = [];
		this.values = [];
	}
	
	getTag() { return this.tag; }
	getName() { return Formulae.messages.nameInvalidNumberExpressions; }
	getMnemonic() { return this.tag; }
	canHaveChildren(count) { return count == this.children.length; }
	
	set(name, value) {
		this.names.push(name);
		this.values.push(value);
	}
	
	get(name)                                  { throw new Error("Invalid attribute [" + name + "]"); }
	setSerializationStrings(strings, promises) { throw new Error("Expression has no attributes"); }
	getSerializationNames()                    { return this.names; }
	async getSerializationStrings()            { return this.values; }
	
	prepareDisplay(context) {
		let offsetX = 10;
		let offsetY = 10 + context.fontInfo.size + 20;
		
		this.prepareDisplayAsFunction(context);
		
		this.oldWidth = this.width;
		
		this.width += offsetX + 10;
		
		let w = offsetX + Math.round(context.measureText(Formulae.messages.labelInvalidNumberExpressions).width) + 10;
		if (w > this.width) this.width = w;
		this.vertBaseline += offsetX;
		
		this.height += offsetY + 10;
		this.horzBaseline += offsetY;
		
		for (let i = 0, n = this.children.length; i < n; ++i) {
			this.children[i].x += offsetX;
			this.children[i].y += offsetY;
		}
	}
	
	display(context, x, y) {
		let offsetX = 10;
		let offsetY = 10 + context.fontInfo.size + 20;
		
		let bkp = this.width;
		
		this.width = this.oldWidth;
		this.height -= offsetY + 10;
		this.horzBaseline -= offsetY;
		this.vertBaseline -= offsetX;
		
		for (let i = 0, n = this.children.length; i < n; ++i) {
			this.children[i].x -= offsetX;
			this.children[i].y -= offsetY;
		}
		
		this.displayAsFunction(context, x + offsetX, y + offsetY);
		
		this.width = bkp;
		this.height += offsetY + 10;
		this.horzBaseline += offsetY;
		this.vertBaseline += offsetX;
		
		for (let i = 0, n = this.children.length; i < n; ++i) {
			this.children[i].x += offsetX;
			this.children[i].y += offsetY;
		}
		
		//////////////////////////////////
		
		let bkpFillStyle = context.fillStyle;
		let bkpStrokeStyle = context.strokeStyle;
		
		context.fillStyle = "red";
		context.strokeStyle = "red";
		
		context.strokeRect(x, y, this.width, this.height);
		context.beginPath();
		context.moveTo (x, y + 10 + context.fontInfo.size + 10);              // preventing obfuscation
		context.lineTo (x + this.width, y + 10 + context.fontInfo.size + 10); // preventing obfuscation
		context.stroke();
		
		super.drawText(context, Formulae.messages.labelInvalidNumberExpressions, x + 10, y + 10 + context.fontInfo.size);
		
		context.fillStyle = bkpFillStyle;
		context.strokeStyle = bkpStrokeStyle;
	}
};

Formulae.WaitingExpressionClass = class extends Expression.LabelExpression {
	getTag()   { return "Formulae.WaitingExpression"; }
	getLabel() { return Formulae.messages.labelWaiting; }
	getName()  { return Formulae.messages.nameWaiting; }
};

Formulae.LocalConnectionErrorClass = class extends Expression.LabelExpression {
	getTag()   { return "Formulae.LocalConnectionError"; }
	getLabel() { return Formulae.messages.labelLocalConnectionError; }
	getName()  { return Formulae.messages.nameLocalConnectionError; }
	getColor() { return "orangered"; }
};

Formulae.RemoteConnectionErrorClass = class extends Expression.LabelExpression {
	getTag()   { return "Formulae.RemoteConnectionError"; }
	getLabel() { return Formulae.messages.labelRemoteConnectionError; }
	getName()  { return Formulae.messages.nameRemoteConnectionError; }
	getColor() { return "orangered"; }
};

Formulae.QuotaExceededClass = class extends Expression.LabelExpression {
	getTag()   { return "Formulae.QuotaExceeded"; }
	getLabel() { return Formulae.messages.nameQuotaExceededError; }
	getName()  { return Formulae.messages.labelQuotaExceededError; }
	getColor() { return "orangered"; }
};

Formulae.getLocaleName = function(locale) {
	//console.log(locale);
	let arr = Formulae.locales[locale];
	let hasCountry = arr[1] != null;
	
	let name = Formulae.messages["language_" + arr[0]];
	if (hasCountry || arr[6]) {
		name += " (\u200e";
		
		if (hasCountry) {
			name += Formulae.messages["country_" + arr[1]];
		}
		
		if (arr[6]) {
			if (hasCountry) name += ", ";
			
			name += Formulae.messages["variant_" + locale];
		}
		
		name += ")\u200e";
	}
	
	return name;
}

Formulae.appendTimeOffset = function(offset) {
	let s;
	
	if (offset >= 0) {
		s = "+";
	}
	else {
		s = "-";
		offset = -offset;
	}
	
	offset = Math.floor(offset / 60000);
	
	let h = Math.floor(offset / 60);
	if (h < 10) s += "0";
	
	s += h + ":";

	let m = offset % 60;
	if (m < 10) s += "0";
	
	s += m;
	return s;
};

Formulae.getTimeZoneName = function(tz) {
	let s = "(UTC ";
	let offset1 = Formulae.timeZones[tz][0];
	let offset2 = Formulae.timeZones[tz][1];
	
	s += Formulae.appendTimeOffset(offset1);
	if (offset2 != 0) {
		s += " " + Formulae.appendTimeOffset(offset1 + offset2);
	}
	
	s += ") " + tz;
	
	return s;
};

Formulae.setModal = element => {
	while (Formulae.modalContent.firstChild) {
		Formulae.modalContent.removeChild(Formulae.modalContent.firstChild);
	}
	Formulae.modalContent.appendChild(element);
	Formulae.modal.style.display = "block";
	Formulae.modal.focus();
};

Formulae.resetModal = () => Formulae.modal.style.display = "none";


Formulae.Package = class {};
Formulae.Package.setExpressions = (module) => {};
Formulae.Package.setEditions = () => {};
Formulae.Package.setActions = () => {};
Formulae.Package.setReducers = () => {};
Formulae.Package.isConfigurable = () => false;
Formulae.Package.onConfiguration = () => {};

Formulae.ExpressionPackage = class {};
Formulae.ExpressionPackage.isConfigurable = () => false;
Formulae.ExpressionPackage.onConfiguration = () => {};
Formulae.ExpressionPackage.setExpressions = (module) => {};

Formulae.EditionPackage = class {};
Formulae.EditionPackage.setEditions = () => {};
Formulae.EditionPackage.setActions = () => {};

Formulae.ReductionPackage = class {};
Formulae.ReductionPackage.setReducers = () => {};

