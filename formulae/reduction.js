'use strict';

//////////////////////
// reductionmanager //
//////////////////////

class ReductionManager {}

ReductionManager.PRECEDENCE_LOW    = -1;
ReductionManager.PRECEDENCE_NORMAL =  0;
ReductionManager.PRECEDENCE_HIGH   =  1;

ReductionManager.normalMap          = new Map(); // from tag to array of reducers
ReductionManager.specialMap         = new Map(); // from tag to array of reducers
ReductionManager.normalSymbolicMap  = new Map(); // from tag to array of reducers
ReductionManager.specialSymbolicMap = new Map(); // from tag to array of reducers

ReductionManager.normalLimits          = new Map(); // from tag to array of two integers
ReductionManager.specialLimits         = new Map(); // from tag to array of two integers
ReductionManager.normalSymbolicLimits  = new Map(); // from tag to array of two integers
ReductionManager.specialSymbolicLimits = new Map(); // from tag to array of two integers

ReductionManager.addReducer = (tag, reducer, description, options = {}) => {
	//if (tag === "Math.Arithmetic.Addition" || tag === "Math.Arithmetic.Division" || description === "") {
	//	console.log("Introducing: " + tag + " - " + description);
	//}
	
	let special = options.special || false;
	let symbolic = options.symbolic || false;
	let precedence = options.precedence || ReductionManager.PRECEDENCE_NORMAL;
	
	let reducerMap;
	let limitMap;
	
	if (symbolic) {
		reducerMap = special ? ReductionManager.specialSymbolicMap : ReductionManager.normalSymbolicMap;
		limitMap = special ? ReductionManager.specialSymbolicLimits : ReductionManager.normalSymbolicLimits;
	}
	else {
		reducerMap = special ? ReductionManager.specialMap : ReductionManager.normalMap;
		limitMap = special ? ReductionManager.specialLimits : ReductionManager.normalLimits;
	}
	
	let reducers = reducerMap.get(tag);
	let limits = limitMap.get(tag);
	
	if (reducers === undefined) {
		reducerMap.set(tag, reducers = []);
		limitMap.set(tag, limits = [0, 0]);
	}
	
	switch (precedence) {
		case ReductionManager.PRECEDENCE_HIGH:
			reducers.splice(limits[0], null, { reducer: reducer, description: description });
			++limits[0];
			break;
		
		case ReductionManager.PRECEDENCE_NORMAL:
			reducers.splice(limits[1], null, { reducer: reducer, description: description });
			++limits[1];
			break;
		
		case ReductionManager.PRECEDENCE_LOW:
			reducers.splice(reducers.length, null, { reducer: reducer, description: description });
			break;
	}
};

ReductionManager.prepareReduction = expr => {
	expr.children.forEach(child => ReductionManager.prepareReduction(child));
	expr.clearReduced();
};


ReductionManager.reduceHandler = async (handler, session) => {
	let expr = handler.expression;
	ReductionManager.prepareReduction(expr);
	
	try {
		await ReductionManager.reduce(expr, session);
	}
	catch (error) {
		if (!(error instanceof ReductionError)) {
			throw error; // unknown error, rethrow it
		}
	}
	
	handler.expression.setReduced();
};

/*
ReductionManager.reduceHandler = async (handler, session) => {
	let expr = handler.expression;
	ReductionManager.prepareReduction(expr);
	
	return new Promise(resolve => {
		try {
			(async () => {
				await ReductionManager.reduce(expr, session);
			})();
		}
		catch (error) {
			if (!(error instanceof ReductionError)) {
				throw error; // unknown error, rethrow it
			}
		}
		
		handler.expression.setReduced();
		resolve();
	});
};
*/

ReductionManager.reduce = async (expression, session) => {
	let tag = expression.getTag();
	let reducerInfo;
	let result;
	
	//////////////////////
	// special reducers //
	//////////////////////
	
	let reducerInfos = ReductionManager.specialMap.get(tag);
	if (reducerInfos !== undefined) {
		//reducers.forEach(reducer => { if (reducer(expression, session)) return true; });
		for (let i = 0, n = reducerInfos.length; i < n; ++i) {
			reducerInfo = reducerInfos[i];
			result = await reducerInfo.reducer(expression, session);
			//console.log("SPECIAL: TAG: " + tag + ", REDUCER: " + reducerInfo.description + ", RESULT: " + result);
			if (result) return true;
		}
	}
	
	if (session.symbolic) {
		reducerInfos = ReductionManager.specialSymbolicMap.get(tag);
		if (reducerInfos !== undefined) {
			//reducers.forEach(reducer => { if (reducer(expression, session)) return true; });
			for (let i = 0, n = reducerInfos.length; i < n; ++i) {
				reducerInfo = reducerInfos[i];
				result = await reducerInfo.reducer(expression, session);
				//console.log("SPECIAL SYMBOLIC: TAG: " + tag + ", REDUCER: " + reducerInfo.description + ", RESULT: " + result);
				if (result) return true;
			}
		}
	}
	
	/////////////////////////////////
	// reduction of subexpressions //
	/////////////////////////////////
	
	let child;
	//expression.children.forEach((child, i) => {
	for (let i = 0, n = expression.children.length; i < n; ++i) {
		child = expression.children[i];
		if (!child.isReduced()) {
			await ReductionManager.reduce(child, session);
			expression.children[i].setReduced();
		}
	};
	
	/////////////////////
	// normal reducers //
	//////////////////////
	
	reducerInfos = ReductionManager.normalMap.get(tag);
	if (reducerInfos !== undefined) {
		//reducers.forEach(reducer => { if (reducer(expression, session)) return true; });
		for (let i = 0, n = reducerInfos.length; i < n; ++i) {
			reducerInfo = reducerInfos[i];
			result = await reducerInfo.reducer(expression, session);
			//console.log("NORMAL: TAG: " + tag + ", REDUCER: " + reducerInfo.description + ", RESULT: " + result);
			if (result) return true;
		}
	}
	
	if (session.symbolic) {
		reducerInfos = ReductionManager.normalSymbolicMap.get(tag);
		if (reducerInfos !== undefined) {
			//reducers.forEach(reducer => { if (reducer(expression, session)) return true; });
			for (let i = 0, n = reducerInfos.length; i < n; ++i) {
				reducerInfo = reducerInfos[i];
				result = await reducerInfo.reducer(expression, session);
				//console.log("NORMAL SYMBOLIC: TAG: " + tag + ", REDUCER: " + reducerInfo.description + ", RESULT: " + result);
				if (result) return true;
			}
		}
	}
	
	return false;
};

ReductionManager.setInError = (expression, description) => {
	let errorExpression = Formulae.createExpression("Error");
	errorExpression.set("Description", description);
	expression.replaceBy(errorExpression);
	errorExpression.addChild(expression);
};

///////////////////////
// reduction session //
///////////////////////

class ReductionSession {
	constructor(locale, timeZone, precision) {
		this.locale   = locale;
		this.timeZone = timeZone;
		this.Decimal  = Decimal.clone({ precision: precision, rounding: 1 });
		this.symbolic = false;
	}
	
	async reduceAndGet(expression, indexOfChild) {
		let parent = expression.parent;
		
		await ReductionManager.reduce(expression, this);
		
		if (indexOfChild >= 0) {
			expression = parent.children[indexOfChild];
		}
		else { // Expression handler
			expression = parent.expression;
		}
		
		return expression;
	}
	
	async reduce(expression) {
		await ReductionManager.reduce(expression, this);
	}
}

//ReductionSession.UnlimitedDecimal = Decimal.clone({ precision: 1e+9 });
//ReductionSession.UnlimitedDecimal = Decimal.clone({ precision: 1000 });

/////////////////////
// reduction error //
/////////////////////

class ReductionError extends Error {};

//////////////
// reducers //
//////////////

// A(X(e1, e2 .., eN)) -> X(A(e1), A(e2), ..., A(eN))
//
// i.e. N(x + y + z)   ->   N(x) + N(y) + N(z)

ReductionManager.expansionReducer = async (expression, session) => {
	// It works for unary expressions only, i.e. N(x)
	if (expression.children.length != 1) return false; // Ok, forward to different cardinality forms
	
	let target = expression.children[0];
	
	let i, n = target.children.length;
	if (n > 0) {
		let tag = expression.getTag();
		let ch;
		
		for (i = 0; i < n; ++i) {
			ch = Formulae.createExpression(tag);
			ch.addChild(target.children[i]);
			target.setChild(i, ch);
		}
	}
	
	expression.replaceBy(target);
	//session.log(n == 0 ? "absorption" : "expansion");
	
	if (n > 0) {
		for (i = 0; i < n; ++i) {
			await session.reduce(target.children[i]);
		}
	}
	
	await session.reduce(target); // <------ Ok ???
	
	return true;
};

// a @ (b @ c) @ d   =>   a @ b @ c @ d
ReductionManager.itselfReducer = async (expr, session) => {
	let operator = expr.getTag();
	let child;
	let updates = 0;
	
	for (let i = 0, n = expr.children.length; i < n; ++i) {
		child = expr.children[i];
		
		if (child.getTag() == operator) {
			expr.removeChildAt(i);
			--n;
			++updates;
			
			for (let j = 0, J = child.children.length; j < J; ++j) {
				expr.addChildAt(i, child.children[j]);
				
				++i;
				++n;
			}
		}
	}
	
	if (updates > 0) {
		await session.reduce(expr);
		return true;
	}
	
	return false; // Ok, forward to other patterns
};

////////////////////////
// canonical indexing //
////////////////////////

class CanonicalIndexing {}

CanonicalIndexing.getChildByIndex = (expr, index) => {
	let i = CanonicalArithmetic.getInteger(index);
	if (i !== undefined) {
		let n = expr.children.length;
		
		if (i > 0) {
			if (i <= n) {
				return expr.children[i - 1];
			}
		}
		else if (i < 0) {
			if (-i <= n) {
				return expr.children[n + i];
			}
		}
	}
	
	ReductionManager.setInError(index, "Index out of range");
	console.trace();
	throw new ReductionError();
};

CanonicalIndexing.getChildBySpec = (expr, spec) => {
	if (spec.getTag() === "List.List") {
		let result = expr;
		
		for (let i = 0, n = spec.children.length; i < n; ++i) {
			result = CanonicalIndexing.getChildByIndex(result, spec.children[i]);
		}
		
		return result;
	}
	
	return CanonicalIndexing.getChildByIndex(expr, spec);
};

///////////////////////
// canonical options //
///////////////////////

class CanonicalOptions {
	checkOptions(tag, options) {
		if (options.getTag() === "List.List") {
			if (
				options.children.length == 2 &&
				options.children[0].getTag() === "String.String"
			) { // one option
				if (!this.checkOption(tag, options)) return false;
			}
			else { // list of options
				let option;
				for (let i = 0, n = options.children.length; i < n; ++i) {
					option = options.children[i];
					if (
						option.getTag() === "List.List" &&
						option.children.length == 2 &&
						option.children[0].getTag() === "String.String"
					) {
						if (!this.checkOption(tag, option)) return false;
					}
					else {
						ReductionManager.setInError(option, "Invalid format for option");
						return false;
					}
				}
			}
		}
		else {
			ReductionManager.setInError(options, "Invalid format for options");
			return false;
		}
	
		return true;
	}
		
	checkOption(tag, option) {
		return false;
	}
}

///////////
// utils //
///////////

class Utils {}

Utils.isMatrix = expr => {
	if (expr.getTag() !== "List.List") return -1;
	
	let rows = expr.children.length;
	if (rows == 0) return -1;
	
	let cols = expr.children[0].children.length;
	if (cols == 0) return -1;
	
	let row;
	for (let r = 0; r < rows; ++r) {
		row = expr.children[r];
		if (row.getTag() != "List.List") return -1;
		if (row.children.length != cols) return -1;
	}
	
	return cols;
};


