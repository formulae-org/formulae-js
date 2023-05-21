'use strict';

//////////////////////
// reductionmanager //
//////////////////////

class ReductionManager {}

ReductionManager.PRECEDENCE_LOW    = -1;
ReductionManager.PRECEDENCE_NORMAL =  0;
ReductionManager.PRECEDENCE_HIGH   =  1;

ReductionManager.normalMap  = new Map();
ReductionManager.specialMap = new Map();

ReductionManager.normalLimits = new Map();
ReductionManager.specialLimits = new Map();

ReductionManager.addReducer = (tag, reducer, special = false, precedence = ReductionManager.PRECEDENCE_NORMAL) => {
	let reducerMap = special ? ReductionManager.specialMap : ReductionManager.normalMap;
	let limitMap = special ? ReductionManager.specialLimits : ReductionManager.normalLimits;
	
	let reducers = reducerMap.get(tag);
	let limits = limitMap.get(tag);
	
	if (reducers === undefined) {
		reducerMap.set(tag, reducers = []);
		limitMap.set(tag, limits = [0, 0]);
	}
	
	switch (precedence) {
		case ReductionManager.PRECEDENCE_HIGH:
			reducers.splice(limits[0], null, reducer);
			++limits[0];
			break;
		
		case ReductionManager.PRECEDENCE_NORMAL:
			//reducers.splice(reducers.length - limits[1], null, reducer);
			reducers.splice(limits[1], null, reducer);
			++limits[1];
			//console.log(reducers);
			break;
		
		case ReductionManager.PRECEDENCE_LOW:
			reducers.splice(reducers.length, null, reducer);
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
	let result;
	
	let reducers = ReductionManager.specialMap.get(tag);
	if (reducers !== undefined) {
		//reducers.forEach(reducer => { if (reducer(expression, session)) return true; });
		for (let i = 0, n = reducers.length; i < n; ++i) {
			result = await reducers[i](expression, session);
			//console.log("TAG: " + tag + ", REDUCER: " + reducers[i].displayName + ", RESULT: " + result);
			if (result) return true;
		}
	}
	
	let child;
	//expression.children.forEach((child, i) => {
	for (let i = 0, n = expression.children.length; i < n; ++i) {
		child = expression.children[i];
		if (!child.isReduced()) {
			await ReductionManager.reduce(child, session);
			expression.children[i].setReduced();
		}
	};
	
	reducers = ReductionManager.normalMap.get(tag);
	if (reducers !== undefined) {
		//reducers.forEach(reducer => { if (reducer(expression, session)) return true; });
		for (let i = 0, n = reducers.length; i < n; ++i) {
			result = await reducers[i](expression, session);
			//console.log("TAG: " + tag + ", REDUCER: " + reducers[i].displayName + ", RESULT: " + result);
			if (result) return true;
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
		this.locale = locale;
		this.timeZone = timeZone;
		this.Decimal = Decimal.clone({ precision: precision });
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

// A(X(expr1, expr2 .., exprN)) -> X(A(expr1), A(expr2), ..., A(exprN))
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

//////////////////////////
// canonical arithmetic //
//////////////////////////

class CanonicalArithmetic {}

CanonicalArithmetic.isZero = expr => {
	if (expr.getTag() !== "Math.Number") return false;
	let number = expr.get("Value");
	return (typeof number === "bigint") ? (number == 0n) : number.isZero();
};

CanonicalArithmetic.isOne = expr => {
	if (expr.getTag() !== "Math.Number") return false;
	let number = expr.get("Value");
	return (typeof number === "bigint") ? (number == 1n) : number.equals(1);
};

CanonicalArithmetic.isNegative = expr => expr.getTag() === "Math.Arithmetic.Negative";

// input: a BigInt or Decimal
// output: a Math.Number expression

CanonicalArithmetic.createCanonicalNumber = number => {
	let value;
	let negative;
	
	if (typeof number === "bigint") {
		if (negative = (number < 0n)) {
			value = -number;
		}
		else {
			value = number;
		}
	}
	else { // Decimal
		if (negative = number.isNegative()) {
			value = number.negated();
		}
		else {
			value = number;
		}
	}
	
	let numberExpr = Formulae.createExpression("Math.Number");
	numberExpr.set("Value", value);
	
	if (negative) {
		let negativeExpr = Formulae.createExpression("Math.Arithmetic.Negative");
		negativeExpr.addChild(numberExpr);
		return negativeExpr;
	}
	else {
		return numberExpr;
	}
};

CanonicalArithmetic.getCanonicalRational = expr => {
	let tag = expr.getTag();
	let n, d;
	
	if (
		tag === "Math.Arithmetic.Division" &&
		(n = expr.children[0]).getTag() === "Math.Number" && typeof n.get("Value") === "bigint" &&
		(d = expr.children[1]).getTag() === "Math.Number" && typeof d.get("Value") === "bigint"
	) return expr;
	
	if (
		tag === "Math.Arithmetic.Negative" &&
		(expr = expr.children[0]).getTag() === "Math.Arithmetic.Division" &&
		(n = expr.children[0]).getTag() === "Math.Number" && typeof n.get("Value") === "bigint" &&
		(d = expr.children[1]).getTag() === "Math.Number" && typeof d.get("Value") === "bigint"
	) return expr;
	
	return null;
};

/*
//CanonicalArithmetic.isCanonicalNumberOrRational = expr => CanonicalArithmetic.isCanonicalNumber(expr) || CanonicalArithmetic.isCanonicalRational(expr);

CanonicalArithmetic.isCanonicalNumber = expr => {
	let tag = expr.getTag();
	return tag === "Math.Number" || (
			tag === "Math.Arithmetic.Negative" &&
			expr.children[0].getTag() === "Math.Number"
		)
	;
};

CanonicalArithmetic.isCanonicalRational = expr => {
	let tag = expr.getTag();
	let n, d;
	
	return (
		tag === "Math.Arithmetic.Division" &&
		(n = expr.children[0]).getTag() === "Math.Number" &&
		!n.get("IsDecimal") &&
		(d = expr.children[1]).getTag() == "Math.Number" &&
		!d.get("IsDecimal")
	) ||
	(
		tag == "Math.Arithmetic.Negative" &&
		(expr = expr.children[0]).getTag == "Math.Arithmetic.Division" &&
		(n = expr.children[0]).getTag() === "Math.Number" &&
		!n.get("IsDecimal") &&
		(d = expr.children[1]).getTag() == "Math.Number" &&
		!d.get("IsDecimal")
	);
};
*/


//CanonicalArithmetic.gcd = (dec1, dec2, session) => dec2.isZero() ? dec1 : CanonicalArithmetic.gcd(dec2, session.Decimal.mod(dec1, dec2), session);

// input: a, b: BigInt
// output: GCD as a Bigint, always positive, possibly 1n

CanonicalArithmetic.gcd = (a, b) => {
	let tmp;
	while (b != 0n) {
		tmp = b;
		b = a % b;
		a = tmp;
	}
	return CanonicalArithmetic.abs(a);
};

// input: a BigInt
// output: |a| as a Bigint

CanonicalArithmetic.abs = a => a < 0n ? -a : a;

/*
	D, d: Decimal
	isDiv, isMod: boolean
*/

CanonicalArithmetic.divMod = (D, d, isDiv, isMod, session) => {
	let bkpRounding = session.Decimal.rounding;
	let bkpModulo = session.Decimal.modulo;
	
	let euclidean = false;
	
	if (session.Decimal.modulo == 9) {
		euclidean = true;
		session.Decimal.modulo = 1;
	}
	
	session.Decimal.rounding = session.Decimal.modulo;
	
	let q, r;
	
	//if (isDiv) q = (new session.Decimal(D)).div(d).round();
	//if (isMod) r = (new session.Decimal(D)).mod(d);
	
	if (isDiv) q = session.Decimal.div(D, d).round();
	if (isMod) r = session.Decimal.mod(D, d);
	
	//session.Decimal.rounding = bkpRounding;
	//session.Decimal.modulo = bkpModulo;
	
	if (isMod && euclidean && r.lessThan(0)) {
		let s = session.Decimal.sign(d);
		
		//if (isDiv) q = q.minus(s);
		//if (isMod) r = r.plus(d.mul(s));
		
		if (isDiv) q = session.Decimal.sub(q, s);
		if (isMod) r = session.Decimal.add(r, session.Decimal.mul(d, s));
	}
	
	session.Decimal.rounding = bkpRounding;
	session.Decimal.modulo = bkpModulo;
	
	return [ q, r ];
};

/*
	this.integer: BigInt (native)
*/

CanonicalArithmetic.Integer = class {
	constructor(value) { // number, string of BigInt
		if (typeof value === "bigint") {
			this.integer = value;
		}
		else {
			this.integer = BigInt(value);
		}
	}
	
	toString() {
		return "(int) " + this.integer.toString();
	}
	
	isZero() {
		return this.integer === 0n;
	}
	
	isOne() {
		return this.integer === 1n;
	}
	
	isPositive() {
		return this.integer > 0n;
	}
	
	isNegative() {
		return this.integer < 0n;
	}
	
	hasIntegerValue() {
		return true;
	}
	
	negate() {
		return new CanonicalArithmetic.Integer(-this.integer);
	}
	
	toDecimal(session) {
		return new CanonicalArithmetic.Decimal(new session.Decimal(this.integer.toString()));
	}
	
	addition(other, session) {
		if (other instanceof CanonicalArithmetic.Integer) { // int + int
			return new CanonicalArithmetic.Integer(
				this.integer + other.integer
			);
		}
		else if (other instanceof CanonicalArithmetic.Rational) { // int + n / d
			return new CanonicalArithmetic.Rational(
				(this.integer * other.denominator) + other.numerator,
				other.denominator
			);
			//rational.minimize();
			//if (rational.denominator == 1n) return new CanonicalArithmetic.Integer(rational.numerator);
			//return rational;
		}
		else { // int + dec
			return new CanonicalArithmetic.Decimal(
				session.Decimal.add(this.integer.toString(), other.decimal)
			);
		}
	}
	
	multiplication(other, session) {
		if (other instanceof CanonicalArithmetic.Integer) { // int x int
			return new CanonicalArithmetic.Integer(
				this.integer * other.integer
			);
		}
		else if (other instanceof CanonicalArithmetic.Rational) { // int x (n / d)
			let rational = new CanonicalArithmetic.Rational(
				this.integer * other.numerator,
				other.denominator
			);
			rational.minimize();
			if (rational.denominator == 1n) return new CanonicalArithmetic.Integer(rational.numerator);
			return rational;
		}
		else { // int x dec
			return new CanonicalArithmetic.Decimal(
				session.Decimal.mul(this.integer.toString(), other.decimal)
			);
		}
	}
	
	division(other, session) {
		if (other instanceof CanonicalArithmetic.Integer) {
			if (this.integer % other.integer === 0n) { // denominator exactly divides numerator
				return new CanonicalArithmetic.Integer(
					this.integer / other.integer
				);
			}
			else {
				let rational = new CanonicalArithmetic.Rational(
					this.integer,
					other.integer
				);
				rational.minimize();
				rational.normalize();
				return rational;
			}
		}
		else if (other instanceof CanonicalArithmetic.Rational) {
			let numerator = this.integer * other.denominator;
			if (numerator % other.numerator === 0n) { // denominator exactly divides numerator
				return new CanonicalArithmetic.Integer(numerator / other.numerator);
			}
			else {
				let rational = new CanonicalArithmetic.Rational(
					this.integer * other.denominator,
					other.numerator
				);
				rational.minimize();
				rational.normalize();
				return rational;
			}
		}
		else { // decimal
			return new CanonicalArithmetic.Decimal(
				session.Decimal.div(this.integer.toString(), other.decimal)
			);
		}
	}
	
	exponentiation(other, session) {
		if (other instanceof CanonicalArithmetic.Integer) {
			return new CanonicalArithmetic.Integer(this.integer ** other.integer);
		}
		else if (other instanceof CanonicalArithmetic.Decimal) {
			return new CanonicalArithmetic.Decimal(
				session.Decimal.pow(this.integer.toString(), other.decimal)
			);
		}
		else { // rational
			return null;
		}
	}
	
	comparison(other, session) {
		if (other instanceof CanonicalArithmetic.Integer) {
			return this.integer == other.integer ?
				0 :
				(this.integer < other.integer ? -1 : 1)
			;
		}
		else if (other instanceof CanonicalArithmetic.Rational) {
			let x = this.integer * other.denominator;
			return x == other.numerator ?
				0 :
				(x < other.numerator ? -1 : 1)
			;
		}
		else { // decimal
			return (new session.Decimal(this.integer.toString())).comparedTo(other.decimal);
		}
	}
	
	divMod(other, isDiv, isMod, session) {
		if (other instanceof CanonicalArithmetic.Integer) {
			let divMod = CanonicalArithmetic.divMod(
				new session.Decimal(this.integer.toString()),
				new session.Decimal(other.integer.toString()),
				isDiv, isMod, session
			);
			return [
				isDiv ? new CanonicalArithmetic.Integer(BigInt(divMod[0].toFixed())) : undefined,
				isMod ? new CanonicalArithmetic.Integer(BigInt(divMod[1].toFixed())) : undefined,
			];
		}
		if (other instanceof CanonicalArithmetic.Decimal) {
			let divMod = CanonicalArithmetic.divMod(
				new session.Decimal(this.integer.toString()),
				other.decimal,
				isDiv, isMod, session
			);
			return [
				isDiv ? new CanonicalArithmetic.Integer(BigInt(divMod[0].toFixed())) : undefined,
				isMod ? new CanonicalArithmetic.Decimal(divMod[1]) : undefined
			];
			
			/*
			let bkpModulo = Decimal.modulo;
			let bkpRounding = Decimal.rounding;
			
			Decimal.modulo = rm; // ROUND_DOWN
			Decimal.rounding = rm;
			
			let div = new CanonicalArithmetic.CanonicalNumber(this.decimal.div(canonicalNumber.decimal).round(), false);
			let mod = new CanonicalArithmetic.CanonicalNumber(this.decimal.mod(canonicalNumber.decimal), this.isDecimal || canonicalNumber.isDecimal);
			
			Decimal.modulo = bkpModulo;
			Decimal.rounding = bkpRounding;
			
			return [ div, mod ];
			*/
		}
		else { // rational
			let divMod = CanonicalArithmetic.divMod(
				session.Decimal.mul(this.integer.toString(), other.denominator.toString()),
				new session.Decimal(other.numerator.toString()),
				isDiv, isMod, session
			);
			
			let remainder;
			if (isMod) {
				remainder = new CanonicalArithmetic.Rational(
					BigInt(divMod[1].toFixed()),
					other.denominator
				);
				remainder.minimize(session);
				
				if (remainder.numerator == 0n) {
					remainder = new CanonicalArithmetic.Integer(0n);
				}
				else if (remainder.denominator == 1n) {
					remainder = new CanonicalArithmetic.Integer(remainder.numerator);
				}
			}
			
			return [
				isDiv ? new CanonicalArithmetic.Integer(BigInt(divMod[0].toFixed())) : undefined,
				remainder
			];
			/*
			let bkpModulo = session.Decimal.modulo;
			let bkpRounding = session.Decimal.rounding;
			
			session.Decimal.modulo = rm; // ROUND_DOWN
			session.Decimal.rounding = rm;
			
			let mult = session.Decimal.mul(this.decimal, canonicalNumber.d);
			let div = mult.div(canonicalNumber.n).round();
			let mod = mult.mod(canonicalNumber.n); // .mul(canonicalNumber.n);
			
			session.Decimal.modulo = bkpModulo;
			session.Decimal.rounding = bkpRounding;
			
			return [
				new CanonicalArithmetic.CanonicalNumber(div, false),
				new CanonicalArithmetic.CanonicalRational(mod, canonicalNumber.d).minimize(session)
			];
			*/
		}
	};
};

/*
	this.decimal: Decimal (decimal.js)
*/

CanonicalArithmetic.Decimal = class {
	constructor(value, session = null) { // number, string of decimal.js
		if (value instanceof Decimal) {
			this.decimal = value;
		}
		else {
			this.decimal = new session.Decimal(value);
		}
	}
	
	toString() {
		return "(dec) " + this.decimal.toString();
	}
	
	isZero() {
		return this.decimal.isZero();
	}
	
	isOne() {
		return this.decimal.equals(1);
	}
	
	isPositive() {
		return this.decimal.greaterThan(0);
	}
	
	isNegative() {
		return this.decimal.lessThan(0)
	}
	
	hasIntegerValue() {
		return this.decimal.isInteger();
	}
	
	negate() {
		return new CanonicalArithmetic.Decimal(this.decimal.negated());
	}
	
	toDecimal(session) {
		return this;
	}
	
	addition(other, session) {
		if (other instanceof CanonicalArithmetic.Decimal) {
			return new CanonicalArithmetic.Decimal(
				session.Decimal.add(this.decimal, other.decimal)
			);
		}
		else if (other instanceof CanonicalArithmetic.Integer) {
			return new CanonicalArithmetic.Decimal(
				session.Decimal.add(this.decimal, other.integer.toString())
			);
		}
		else { // rational
			let n = new session.Decimal(other.numerator.toString());
			let d = new session.Decimal(other.denominator.toString());
			return new CanonicalArithmetic.Decimal(
				session.Decimal.div(
					session.Decimal.add(
						session.Decimal.mul(this.decimal, d),
						n
					),
					d
				)
			);
		}
	}
	
	multiplication(other, session) {
		if (other instanceof CanonicalArithmetic.Decimal) { // dec1 x dec2
			return new CanonicalArithmetic.Decimal(
				session.Decimal.mul(this.decimal, other.decimal)
			);
		}
		else if (other instanceof CanonicalArithmetic.Integer) { // dec x int
			return new CanonicalArithmetic.Decimal(
				session.Decimal.mul(this.decimal, new session.Decimal(other.integer.toString()))
			);
		}
		else { // dec x (n / d)
			let n = new session.Decimal(other.numerator.toString());
			let d = new session.Decimal(other.denominator.toString());
			return new CanonicalArithmetic.Decimal(
				session.Decimal.div(session.Decimal.mul(this.decimal, n), d)
			);
		}
	}
	
	division(other, session) {
		if (other instanceof CanonicalArithmetic.Decimal) {
			return new CanonicalArithmetic.Decimal(session.Decimal.div(
				this.decimal,
				other.decimal
			));
		}
		else if (other instanceof CanonicalArithmetic.Integer) {
			return new CanonicalArithmetic.Decimal(session.Decimal.div(
				this.decimal,
				new session.Decimal(other.integer.toString())
			));
		}
		else { // rational
			let n = new session.Decimal(other.numerator.toString());
			let d = new session.Decimal(other.denominator.toString());
			return new CanonicalArithmetic.Decimal(
				session.Decimal.div(
					session.Decimal.mul(this.decimal, d),
					n
				)
			);
		}
	}
	
	exponentiation(other, session) {
		if (other instanceof CanonicalArithmetic.Decimal) {
			return new CanonicalArithmetic.Decimal(session.Decimal.pow(this.decimal, other.decimal));
		}
		else if (other instanceof CanonicalArithmetic.Integer) {
			return new CanonicalArithmetic.Decimal(
				session.Decimal.pow(this.decimal, other.integer.toString())
			);
		}
		else { // rational
			return new CanonicalArithmetic.Decimal(
				session.Decimal.pow(
					this.decimal,
					session.Decimal.div(other.numerator.toString(), other.denominator.toString())
				)
			);
		}
	}
	
	comparison(other, session) {
		if (other instanceof CanonicalArithmetic.Decimal) {
			return this.decimal.comparedTo(other.decimal);
		}
		else if (other instanceof CanonicalArithmetic.Integer) {
			return this.decimal.comparedTo(other.integer.toString());
		}
		else { // rational
			let n = new session.Decimal(other.numerator.toString());
			let d = new session.Decimal(other.denominator.toString());
			return session.Decimal.mul(this.decimal, d).comparedTo(n);
		}
	}
	
	divMod(other, isDiv, isMod, session) {
		if (other instanceof CanonicalArithmetic.Integer) {
			let divMod = CanonicalArithmetic.divMod(
				this.decimal,
				new session.Decimal(other.integer.toString()),
				isDiv, isMod, session
			);
			
			return [
				isDiv ? new CanonicalArithmetic.Integer(BigInt(divMod[0].toFixed())) : undefined,
				isMod ? new CanonicalArithmetic.Decimal(divMod[1]) : undefined
			];
		}
		if (other instanceof CanonicalArithmetic.Decimal) {
			let divMod = CanonicalArithmetic.divMod(
				this.decimal,
				other.decimal,
				isDiv, isMod, session
			);
			
			return [
				isDiv ? new CanonicalArithmetic.Integer(BigInt(divMod[0].toFixed())) : undefined,
				isMod ? new CanonicalArithmetic.Decimal(divMod[1]) : undefined
			];
			
			/*
			let bkpModulo = Decimal.modulo;
			let bkpRounding = Decimal.rounding;
			
			Decimal.modulo = rm; // ROUND_DOWN
			Decimal.rounding = rm;
			
			let div = new CanonicalArithmetic.CanonicalNumber(this.decimal.div(canonicalNumber.decimal).round(), false);
			let mod = new CanonicalArithmetic.CanonicalNumber(this.decimal.mod(canonicalNumber.decimal), this.isDecimal || canonicalNumber.isDecimal);
			
			Decimal.modulo = bkpModulo;
			Decimal.rounding = bkpRounding;
			
			return [ div, mod ];
			*/
		}
		else { // rational
			let divMod = CanonicalArithmetic.divMod(
				session.Decimal.mul(this.decimal, other.denominator.toString()),
				new session.Decimal(other.numerator.toString()),
				isDiv, isMod, session
			);
			
			return [
				isDiv ? new CanonicalArithmetic.Integer(BigInt(divMod[0].toFixed())) : undefined, 
				isMod ? new CanonicalArithmetic.Decimal(session.Decimal.div(divMod[1], other.denominator.toString())) : undefined
			];
			/*
			let bkpModulo = session.Decimal.modulo;
			let bkpRounding = session.Decimal.rounding;
			
			session.Decimal.modulo = rm; // ROUND_DOWN
			session.Decimal.rounding = rm;
			
			let mult = session.Decimal.mul(this.decimal, canonicalNumber.d);
			let div = mult.div(canonicalNumber.n).round();
			let mod = mult.mod(canonicalNumber.n).div(canonicalNumber.d);
			
			session.Decimal.modulo = bkpModulo;
			session.Decimal.rounding = bkpRounding;
			
			return [
				new CanonicalArithmetic.CanonicalNumber(div, false),
				new CanonicalArithmetic.CanonicalNumber(mod, this.isDecimal || canonicalNumber.isDecimal)
			];
			*/
		}
	};
}

/*
	numerator:   BigInt
	denominator: BigInt
*/
CanonicalArithmetic.Rational = class {
	/////////////////////////////////////////////////////
	// assumsions:                                     //
	//                                                 //
	// it always be in minimal form                    //
	// numerator will never be zero                    //
	// denominator will never be negative, zero or one //
	/////////////////////////////////////////////////////
	constructor(numerator, denominator) {
		this.numerator = numerator;
		this.denominator = denominator;
	}
	
	toString() {
		return this.numerator.toString() + " / " + this.denominator.toString();
	}
	
	minimize() {
		let gcd = CanonicalArithmetic.gcd(this.numerator, this.denominator);
		if (gcd !== 1n) {
			this.numerator   = this.numerator   / gcd;
			this.denominator = this.denominator / gcd;
		}
	}
		
	normalize() {
		if (this.denominator < 0n) {
			this.numerator   = -this.numerator;
			this.denominator = -this.denominator
		}
	}
	
	isZero() {
		return false;
	}
	
	isOne() {
		return false;
	}
	
	isPositive() {
		return this.numerator > 0n;
	}
	
	isNegative() {
		return this.numerator < 0n;
	}
	
	hasIntegerValue() {
		return false;
	}
	
	negate() { // - num / den
		return new CanonicalArithmetic.Rational(-this.numerator, this.denominator);
	}
	
	toDecimal(session) {
		return new CanonicalArithmetic.Decimal(
			session.Decimal.div(
				this.numerator.toString(),
				this.denominator.toString()
			)
		);
	}
	
	addition(other, session) {
		if (other instanceof CanonicalArithmetic.Integer) { // (num / den) + int
			return new CanonicalArithmetic.Rational(
				this.numerator + (other.integer * this.denominator),
				this.denominator
			);
		}
		else if (other instanceof CanonicalArithmetic.Rational) { // (n1 / d1) + (n2 / d2)
			let rational = new CanonicalArithmetic.Rational(
				(
					(this.numerator   * other.denominator) +
					(this.denominator * other.numerator  )
				),
				this.denominator * other.denominator
			);
			rational.minimize();
			if (rational.numerator % rational.denominator == 0n) {
				return new CanonicalArithmetic.Integer(rational.numerator / rational.denominator);
			} 
			rational.normalize();
			return rational;
		}
		else { // (num / den) + dec
			let d = new session.Decimal(this.denominator.toString());
			return new CanonicalArithmetic.Decimal(
				session.Decimal.div(
					session.Decimal.add(
						new session.Decimal(this.numerator.toString()),
						session.Decimal.mul(d, other.decimal)
					),
					d
				)
			);
		}
	}
	
	multiplication(other, session) {
		if (other instanceof CanonicalArithmetic.Integer) { // (num / den) x int
			let n = this.numerator * other.integer;
			if (n % this.denominator == 0n) {
				return new CanonicalArithmetic.Integer(n / this.denominator);
			}
			let rational = new CanonicalArithmetic.Rational(
				n,
				this.denominator
			);
			rational.minimize();
			return rational;
		}
		else if (other instanceof CanonicalArithmetic.Rational) { // (num1 / den1) x (num2 / den2)
			let rational = new CanonicalArithmetic.Rational(
				this.numerator * other.numerator,
				this.denominator * other.denominator
			);
			rational.minimize();
			if (rational.denominator == 1n) {
				return new CanonicalArithmetic.Integer(rational.numerator);
			} 
			return rational;
		}
		else { // (num / den) x dec
			return new CanonicalArithmetic.Decimal(
				session.Decimal.div(
					session.Decimal.mul(
						new session.Decimal(this.numerator.toString()),
						other.decimal
					),
					new session.Decimal(this.denominator.toString()),
				)
			);
		}
	}
	
	division(other, session) {
		if (other instanceof CanonicalArithmetic.Integer) { // (num / den) / int
			let rational = new CanonicalArithmetic.Rational(
				this.numerator,
				this.denominator * other.integer
			);
			rational.minimize();
			rational.normalize();
			if (rational.denominator == 1n) {
				return new CanonicalArithmetic.Integer(rational.numerator);
			}
			return rational;
		}
		else if (other instanceof CanonicalArithmetic.Rational) { // (num1 / den1) / (num2 / den2)
			let rational = new CanonicalArithmetic.Rational(
				this.numerator * other.denominator,
				this.denominator * other.numerator
			);
			rational.minimize();
			rational.normalize();
			if (rational.denominator == 1n) {
				return new CanonicalArithmetic.Integer(rational.numerator);
			} 
			return rational;
		}
		else { // (num / den) / dec
			return new CanonicalArithmetic.Decimal(
				session.Decimal.div(
					session.Decimal.mul(
						new session.Decimal(this.numerator.toString()),
						other.decimal
					),
					new session.Decimal(this.denominator.toString()),
				)
			);
		}
	}
	
	exponentiation(other, session) {
		if (other instanceof CanonicalArithmetic.Integer) {
			let rational = new CanonicalArithmetic.Rational(
				this.numerator ** other.integer,
				this.denominator ** other.integer
			);
			rational.minimize();
			return rational;
		}
		else if (other instanceof CanonicalArithmetic.Decimal) {
			return new CanonicalArithmetic.Decimal(
				session.Decimal.pow(
					session.Decimal.div(this.numerator.toString(), this.denominator.toString()),
					other.decimal
				)
			);
		}
		else { // rational
			return null;
		}
	}
	
	comparison(other, session) {
		if (other instanceof CanonicalArithmetic.Integer) {
			let right = this.denominator * other.integer;
			return this.numerator == right ?
				0 :
				(this.numerator < right ? -1 : 1)
			;
		}
		else if (other instanceof CanonicalArithmetic.Rational) {
			let left = this.numerator * other.denominator;
			let right = this.denominator * other.numerator;
			return left == right ?
				0 :
				(left < right ? -1 : 1)
			;
		}
		else { // decimal
			return (new session.Decimal(this.numerator.toString())).comparedTo(
				session.Decimal.mul(other.decimal, new session.Decimal(this.denominator.toString()))
			);
		}
	}
	
	divMod(other, isDiv, isMod, session) {
		if (other instanceof CanonicalArithmetic.Integer) {
			let divMod = CanonicalArithmetic.divMod(
				new session.Decimal(this.numerator.toString()),
				session.Decimal.mul(this.denominator.toString(), other.integer.toString()),
				isDiv, isMod, session
			);
			
			return [
				isDiv ? new CanonicalArithmetic.Integer(BigInt(divMod[0].toFixed())) : undefined,
				isMod ? new CanonicalArithmetic.Rational(BigInt(divMod[1].toFixed()), this.denominator) : undefined
			];
			/*
			let bkpModulo = Decimal.modulo;
			let bkpRounding = Decimal.rounding;
			
			Decimal.modulo = rm; // ROUND_DOWN
			Decimal.rounding = rm;
			
			let mult = session.Decimal.mul(this.d, canonicalNumber.decimal);
			let div = new CanonicalArithmetic.CanonicalNumber(this.n.div(mult).round(), false);
			let mod = (new CanonicalArithmetic.CanonicalRational(this.n.mod(mult), this.d)).minimize(session);
			
			Decimal.modulo = bkpModulo;
			Decimal.rounding = bkpRounding;
			
			return [ div, mod ];
			*/
		}
		else if (other instanceof CanonicalArithmetic.Decimal) {
			let divMod = CanonicalArithmetic.divMod(
				new session.Decimal(this.numerator.toString()),
				session.Decimal.mul(this.denominator.toString(), other.decimal),
				isDiv, isMod, session
			);
			
			return [
				isDiv ? new CanonicalArithmetic.Integer(BigInt(divMod[0].toFixed())) : undefined,
				isMod ? new CanonicalArithmetic.Decimal(session.Decimal.div(divMod[1], this.denominator.toString())) : undefined
			];
			/*
			let bkpModulo = Decimal.modulo;
			let bkpRounding = Decimal.rounding;
			
			Decimal.modulo = rm; // ROUND_DOWN
			Decimal.rounding = rm;
			
			let mult = session.Decimal.mul(this.d, canonicalNumber.decimal);
			let div = new CanonicalArithmetic.CanonicalNumber(this.n.div(mult).round(), false);
			let mod = new CanonicalArithmetic.CanonicalNumber(this.n.mod(mult).div(this.d), canonicalNumber.isDecimal);
			
			Decimal.modulo = bkpModulo;
			Decimal.rounding = bkpRounding;
			
			return [ div, mod ];
			*/
		}
		else { // rational
			let divMod = CanonicalArithmetic.divMod(
				session.Decimal.mul(this.numerator.toString(), other.denominator.toString()),
				session.Decimal.mul(this.denominator.toString(), other.numerator.toString()),
				isDiv, isMod, session
			);
			
			let remainder;
			
			if (isMod) {
				remainder = new CanonicalArithmetic.Rational(
					BigInt(divMod[1].toFixed()),
					this.denominator * other.denominator
				);
				remainder.minimize(session);
				
				if (remainder.numerator == 0n) {
					remainder = new CanonicalArithmetic.Integer(0n);
				}
				else if (remainder.denominator == 1n) {
					remainder = new CanonicalArithmetic.Integer(remainder.numerator);
				}
			}
			
			/*
			let remainder;
			
			if (divMod[1].isZero()) {
				remainder = new CanonicalArithmetic.Integer(0n); 
			}
			else {
				remainder = new CanonicalArithmetic.Rational(
					BigInt(divMod[1].toFixed()),
					this.denominator * other.denominator
				);
				remainder.minimize();
			}
			*/
			
			return [
				isDiv ? new CanonicalArithmetic.Integer(BigInt(divMod[0].toFixed())) : undefined,
				remainder
			];
			/*
			let bkpModulo = session.Decimal.modulo;
			let bkpRounding = session.Decimal.rounding;
			
			session.Decimal.modulo = rm; // ROUND_DOWN
			session.Decimal.rounding = rm;
			
			let mul1 = session.Decimal.mul(this.n, canonicalNumber.d);
			let mul2 = session.Decimal.mul(this.d, canonicalNumber.n);
			let div = mul1.div(mul2).round();
			let mod = mul1.mod(mul2);
			
			session.Decimal.modulo = bkpModulo;
			session.Decimal.rounding = bkpRounding;
			
			return [
				new CanonicalArithmetic.CanonicalNumber(div, false),
				new CanonicalArithmetic.CanonicalRational(mod, session.Decimal.mul(this.d, canonicalNumber.d)).minimize(session)
			];
			*/
		}
	};
}

////////////////////////////////////////
// Expression to other representation //
////////////////////////////////////////

// input: An expression
// output: Either:
//            * A CanonicalArithmetic.Integer
//            * A CanonicalArithmetic.Decimal
//            * null, if the expression cannot be converted to the previous values

CanonicalArithmetic.expr2CanonicalNumber = expr => {
	let tag = expr.getTag();
	let isNegative;
	
	if (isNegative = (tag === "Math.Arithmetic.Negative")) {
		expr = expr.children[0];
		tag = expr.getTag();
	}
	
	if (tag === "Math.Number") {
		let value = expr.get("Value");
		if (typeof value === "bigint") {
			return new CanonicalArithmetic.Integer(isNegative ? -value : value);
		}
		else {
			return new CanonicalArithmetic.Decimal(isNegative ? value.neg() : value);
		}
	}
	
	return null;
};

// input: An expression
// output: Either:
//            * A CanonicalArithmetic.Integer
//            * A CanonicalArithmetic.Decimal
//            * A CanonicalArithmetic.Rational
//            * null, if the expression cannot be converted to the previous values

CanonicalArithmetic.expr2CanonicalNumeric = expr => {
	let tag = expr.getTag();
	let isNegative;
	
	if (isNegative = (tag === "Math.Arithmetic.Negative")) {
		expr = expr.children[0];
		tag = expr.getTag();
	}
	
	if (tag === "Math.Number") {
		let value = expr.get("Value");
		if (typeof value === "bigint") {
			return new CanonicalArithmetic.Integer(isNegative ? -value : value);
		}
		else { // Decimal
			return new CanonicalArithmetic.Decimal(isNegative ? value.neg() : value);
		}
	}
	
	if (tag === "Math.Arithmetic.Division") {
		let n = expr.children[0], d = expr.children[1];
		if (n.getTag() === "Math.Number" && d.getTag() === "Math.Number") {
			return new CanonicalArithmetic.Rational(
				isNegative ? -n.get("Value") : n.get("Value"),
				d.get("Value")
			);
		}
	}
	
	return null;
};

// input: An expression
// output: Either:
//            * A number
//            * undefined, if the expression cannot be converted to a an integer number

CanonicalArithmetic.getNumber = expr => {
	let tag = expr.getTag();
	let negative = false;
	
	if (tag === "Math.Arithmetic.Negative") {
		negative = true;
		expr = expr.children[0];
		tag = expr.getTag();
	}
	
	if (tag !== "Math.Number") return undefined;
	
	let n = expr.get("Value");
	let number;
	
	if (typeof n === "bigint") {
		if (n < Number.MIN_SAFE_INTEGER || n > Number.MAX_SAFE_INTEGER) return undefined;
		number = Number(n);
	}
	else { // Decimal
		try {
			number = n.toNumber();
		}
		catch (error) {
			return undefined;
		}
	}
	
	return negative ? -number : number;
};


// input: An expression
// output: Either:
//            * An always integer number
//            * undefined, if the expression cannot be converted to a an integer number

CanonicalArithmetic.getInteger = expr => {
	let tag = expr.getTag();
	let negative = false;
	
	if (tag === "Math.Arithmetic.Negative") {
		negative = true;
		expr = expr.children[0];
		tag = expr.getTag();
	}
	
	if (tag !== "Math.Number") return undefined;
	
	let number = expr.get("Value");
	let int;
	
	if (typeof number === "bigint") {
		if (number < Number.MIN_SAFE_INTEGER || number > Number.MAX_SAFE_INTEGER) return undefined;
		int = Number(number);
	}
	else { // Decimal
		if (!number.isInteger()) return undefined;
		try {
			int = number.toNumber();
		}
		catch (error) {
			return undefined;
		}
	}
	
	return negative ? -int : int;
};

// input: An expression
// output: Either:
//            * An always BigInt number
//            * undefined, if the expression cannot be converted to a an BigInt number

CanonicalArithmetic.getBigInt = expr => {
	let tag = expr.getTag();
	let negative = false;
	
	if (tag === "Math.Arithmetic.Negative") {
		negative = true;
		expr = expr.children[0];
		tag = expr.getTag();
	}
	
	if (tag !== "Math.Number") return undefined;
	
	let number = expr.get("Value");
	let bigInt;
	
	if (typeof number === "bigint") {
		bigInt = number;
	}
	else { // Decimal
		if (!number.isInteger()) return undefined;
		bigInt = BigInt(number.toFixed());
	}
	
	return negative ? -bigInt : bigInt;
};

// input: An expression
// output: True if it is a canonical number, false elsewhere

CanonicalArithmetic.isExpressionCanonicalNumber = expr => {
	let tag = expr.getTag();
	
	if (tag === "Math.Arithmetic.Negative") {
		expr = expr.children[0];
		tag = expr.getTag();
	}
	
	if (tag === "Math.Number") return true;
	
	return false;
};

// input: An expression
// output: True if it is a canonical rational, false elsewhere

CanonicalArithmetic.isExpressionCanonicalRational = expr => {
	let tag = expr.getTag();
	
	if (tag === "Math.Arithmetic.Negative") {
		expr = expr.children[0];
		tag = expr.getTag();
	}
	
	if (
		tag === "Math.Arithmetic.Division" &&
		expr.children[0].getTag() === "Math.Number" &&
		expr.children[1].getTag() === "Math.Number"
	) {
		return true;
	}
	
	return false;
};

// input: An expression
// output: true if it is a canonical numeric (a canonical number or rational), false elsewhere

CanonicalArithmetic.isExpressionCanonicalNumeric = expr => {
	let tag = expr.getTag();
	
	if (tag === "Math.Arithmetic.Negative") {
		expr = expr.children[0];
		tag = expr.getTag();
	}
	
	if (tag === "Math.Number") return true;
	
	if (
		tag === "Math.Arithmetic.Division" &&
		expr.children[0].getTag() === "Math.Number" &&
		expr.children[1].getTag() === "Math.Number"
	) {
		return true;
	}
	
	return false;
};

////////////////////////////////////////
// Other representation to expression //
////////////////////////////////////////

// input: a canonical integer, decimal or rational
// output: the equivalent as expression

CanonicalArithmetic.canonicalNumeric2Expr = canonicalNumeric => {
	let negative;
	let expr;
	
	if (canonicalNumeric instanceof CanonicalArithmetic.Integer) {
		negative = canonicalNumeric.integer < 0n;
		expr = Formulae.createExpression("Math.Number");
		expr.set("Value", negative ? -canonicalNumeric.integer : canonicalNumeric.integer);
	}
	else if (canonicalNumeric instanceof CanonicalArithmetic.Decimal) {
		//negative = canonicalNumeric.decimal.isNegative();
		negative = canonicalNumeric.decimal.lessThan(0);
		expr = Formulae.createExpression("Math.Number");
		expr.set("Value", canonicalNumeric.decimal.abs());
	}
	else { // canonical rational
		negative = canonicalNumeric.numerator < 0n;
		
		let n = Formulae.createExpression("Math.Number");
		n.set("Value", negative ? -canonicalNumeric.numerator : canonicalNumeric.numerator);
		
		let d = Formulae.createExpression("Math.Number");
		d.set("Value", canonicalNumeric.denominator);
		
		expr = Formulae.createExpression("Math.Arithmetic.Division");
		expr.addChild(n);
		expr.addChild(d);
	}
	
	if (negative) {
		let neg = Formulae.createExpression("Math.Arithmetic.Negative");
		neg.addChild(expr);
		expr = neg;
	}
	
	return expr;
};

// input: A number
//        An optional boolean to indicate that the number will be decimal. Default is false
// output: An expression

CanonicalArithmetic.number2Expr = (n, isDecimal = false) => {
	let expr = Formulae.createExpression("Math.Number");
	let negative = n < 0;
	
	if (Number.isInteger(n)) {
		expr.set("Value", isDecimal ? new Decimal(negative ? -n : n) : BigInt(negative ? -n : n));
	}
	else {
		expr.set("Value", new Decimal(negative ? -n : n));
	}
	
	if (negative) {
		let neg = Formulae.createExpression("Math.Arithmetic.Negative");
		neg.addChild(expr);
		expr = neg;
	}
	
	return expr;
};

// input: A Decimal
// output: An expression

CanonicalArithmetic.decimal2Expr = decimal => {
	let expr = Formulae.createExpression("Math.Number");
	let negative = decimal.isNegative();
	
	expr.set("Value", negative ? decimal.negated() : decimal);
	
	if (negative) {
		let neg = Formulae.createExpression("Math.Arithmetic.Negative");
		neg.addChild(expr);
		expr = neg;
	}
	
	return expr;
};

// input: A BigInt
// output: An expression

CanonicalArithmetic.bigInt2Expr = bigInteger => {
	let expr = Formulae.createExpression("Math.Number");
	let negative = bigInteger < 0n;
	
	expr.set("Value", negative ? -bigInteger : bigInteger);
	
	if (negative) {
		let neg = Formulae.createExpression("Math.Arithmetic.Negative");
		neg.addChild(expr);
		expr = neg;
	}
	
	return expr;
};

/*
// Provided both isCanonicalNumberOrRational(expr1) and
//               isCanonicalNumberOrRational(expr2) both return true
CanonicalArithmetic._canonicalAddition = (isNumber1, expr1, isNumber2, expr2, session) => {
	if (isNumber1) {
		if (isNumber2) { // ±n + ±n
			return [
				createCanonicalNumber(numberAddition(getNumber(expr1), getNumber(expr2), mc),
				true
			];
		}
		else {                                             // ±n + (± n/n)
			if (_isCanonicalNumber_BigInteger(expr1)) {
				return rationalAddition(
					factory,
					(BigInteger) getNumber(expr1),
					BigInteger.ONE,
					getNumerator(expr2),
					getDenominator(expr2)
				);
			}
			else {
				return createCanonicalNumber(
					factory,
					numberAddition(
						getNumber(expr1),
						new BigDecimal(getNumerator(expr2))
							.divide(new BigDecimal(getDenominator(expr2)), mc)
							.stripTrailingZeros(),
						mc
					)
				);
			}
		}
	}
	else {
		if (isNumber2) {                    // (± n/n) + ±n
			if (_isCanonicalNumber_BigInteger(expr2)) {
				return rationalAddition(
					factory,
					getNumerator(expr1),
					getDenominator(expr1),
					(BigInteger) getNumber(expr2),
					BigInteger.ONE
				);
			}
			else {
				return createCanonicalNumber(factory,
					numberAddition(
						new BigDecimal(getNumerator(expr1))
							.divide(new BigDecimal(getDenominator(expr1)), mc)
							.stripTrailingZeros(),
						getNumber(expr2),
						mc
					)
				);
			}
		}
		else {                                        // (± n/n) + (± n/n)
			return rationalAddition(
				factory,
				getNumerator(expr1),
				getDenominator(expr1),
				getNumerator(expr2),
				getDenominator(expr2)
			);
		}
	}
};

// provided expr1 and expr are canonival numbers
CanonicalArithmetic._numberAddition = (expr1, expr2, session) {
	let decimal1 = expr1.getTag() === "Math.Arithmetic.Negative" ? expr1.children[0].get("Value").neg() : expr1.get("Value");
	let decimal2 = expr2.getTag() === "Math.Arithmetic.Negative" ? expr2.children[0].get("Value").neg() : expr2.get("Value");
	let isDecimal1 = 
	
	return session.Decimal.add(decimal1, decimal2)
	if (n1 instanceof BigInteger) {
		if (n2 instanceof BigInteger) {               // Integer + Integer
			n = ((BigInteger) n1).add((BigInteger) n2);
		}
		else {                                        // Integer + Decimal
			n = new BigDecimal((BigInteger) n1).add((BigDecimal) n2, mc)
			.stripTrailingZeros();
		}
	}
	else {
		if (n2 instanceof BigInteger) {               // Decimal + Integer
			n = ((BigDecimal) n1).add(new BigDecimal((BigInteger) n2), mc)
			.stripTrailingZeros();
		}
		else {                                        // Decimal + Decimal
			n = ((BigDecimal) n1).add((BigDecimal) n2, mc).stripTrailingZeros();
			if (((BigDecimal) n).signum() == 0) n = BigDecimal.ZERO;
		}
	}
	
	return n;
}

CanonicalArithmetic._rationalAddition(
	ExpressionFactory factory,
	BigInteger n1, BigInteger d1,
	BigInteger n2, BigInteger d2
) {
	if (d1.compareTo(d2) == 0) {
		n1 = n1.add(n2);
	}
	else {
		n1 = n1.multiply(d2).add(n2.multiply(d1));
		d1 = d1.multiply(d2);
	}
	
	return createCanonicalRational(factory, n1, d1);
}

*/

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


