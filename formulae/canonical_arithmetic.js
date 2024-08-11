'use strict';

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
	
	if (session.Decimal.rounding == 9) {
		euclidean = true;
		session.Decimal.rounding = 1;
		session.Decimal.modulo = 9;
	}
	
	//session.Decimal.rounding = session.Decimal.modulo;
	
	let q, r;
	
	if (isDiv) q = session.Decimal.div(D, d).round();
	if (isMod) r = session.Decimal.mod(D, d);
	
	if (isMod && euclidean && r.lessThan(0)) {
		let s = session.Decimal.sign(d);
		
		if (isDiv) q = session.Decimal.sub(q, s);
		if (isMod) r = session.Decimal.add(r, session.Decimal.mul(d, s));
	}
	
	session.Decimal.rounding = bkpRounding;
	session.Decimal.modulo = bkpModulo;
	
	return [ q, r ];
};

/*
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
	
	if (isDiv) q = session.Decimal.div(D, d).round();
	if (isMod) r = session.Decimal.mod(D, d);
	
	if (isMod && euclidean && r.lessThan(0)) {
		let s = session.Decimal.sign(d);
		
		if (isDiv) q = session.Decimal.sub(q, s);
		if (isMod) r = session.Decimal.add(r, session.Decimal.mul(d, s));
	}
	
	session.Decimal.rounding = bkpRounding;
	session.Decimal.modulo = bkpModulo;
	
	return [ q, r ];
};
*/

/*
	D, d: BigInt
	isDiv, isMod: boolean
	
	returns: BigInt
*/
CanonicalArithmetic.integerDivision = (D, d, session) => {
	let q;
	
	switch (session.Decimal.rounding) {
		case 0: // ROUND UP, or AWAY FROM ZERO
			q = (D / d) + (D % d === 0n ? 0n : ((D > 0n) === (d > 0n) ? 1n : -1n));
			break;
		
		case 1: // TRUNCATION, ROUND DOWN or TOWARDS ZERO
			q = D / d;
			break;
		
		case 2: // CEILING or TOWARDS INFINITY
			q = (D / d) + (D % d === 0n ? 0n : ((D > 0n) === (d > 0n) ? 1n : 0n));
			break;
		
		case 3: // FLOOR or TOWARDS NEGATIVE INFINITY
			q = (D / d) + (D % d === 0n ? 0n : ((D > 0n) === (d > 0n) ? 0n : -1n));
			break;
		
		case 4: { // HALF ROUND UP or HALF AWAY FROM ZERO
				let absD = D >= 0n ? D : -D;
				let absd = d >= 0n ? d : -d;
				let absRemainderDoubled = (absD % absd) * 2n;
				q = (D / d) + (absRemainderDoubled < absd ? 0n : ((D > 0n) === (d > 0n) ? 1n : -1n));
			}
			break;
		
		case 5: { // HALF TRUNCATION, HALF ROUND DOWN or HALF TOWARDS ZERO 
				let absD = D >= 0n ? D : -D;
				let absd = d >= 0n ? d : -d;
				let absRemainderDoubled = (absD % absd) * 2n;
				q = (D / d) + (absRemainderDoubled <= absd ? 0n : ((D > 0n) === (d > 0n) ? 1n : -1n));
			}
			break;
		
		case 6: { // HALF EVEN
				let absD = D >= 0n ? D : -D;
				let absd = d >= 0n ? d : -d;
				let absRemainderDoubled = (absD % absd) * 2n;
				q = D / d;
				q += (absRemainderDoubled < absd || (absRemainderDoubled === absd && q % 2n === 0n) ? 0n : ((D > 0n) === (d > 0n) ? 1n : -1n));
			}
			break;
		
		/*
		case x: { // HALF ODD
				let absD = D >= 0n ? D : -D;
				let absd = d >= 0n ? d : -d;
				let absRemainderDoubled = (absD % absd) * 2n;
				q = D / d;
				q += (absRemainderDoubled < absd || (absRemainderDoubled === absd && q % 2n !== 0n) ? 0n : ((D > 0n) === (d > 0n) ? 1n : -1n));
			}
			break;
		*/
		
		case 7: { // HALF CEILING or HALF TOWARDS INFINITY
				let absD = D >= 0n ? D : -D;
				let absd = d >= 0n ? d : -d;
				let absRemainderDoubled = (absD % absd) * 2n;
				q = (D / d) + (absRemainderDoubled < absd ? 0n : (D > 0n) === (d > 0n) ? 1n : (absRemainderDoubled > absd ? -1n : 0n));
			}
			break;
		
		case 8: { // HALF FLOOR or HALF TOWARDS NEGATIVE INFINITY
				let absD = D >= 0n ? D : -D;
				let absd = d >= 0n ? d : -d;
				let absRemainderDoubled = (absD % absd) * 2n;
				q = (D / d) + (absRemainderDoubled < absd ? 0n : (D > 0n) === (d > 0n) ? (absRemainderDoubled > absd ? 1n : 0n) : -1n);
			}
			break;
		
		case 9: { // EUCLIDEAN MODE
				if (d > 0n) {
					q = (D / d) + (D % d === 0n ? 0n : ((D > 0n) === (d > 0n) ? 0n : -1n)); // FLOOR
				}
				else {
					q = (D / d) + (D % d === 0n ? 0n : ((D > 0n) === (d > 0n) ? 1n : 0n)); // CEILING
				}
			}
			break;
	}
	
	return q;
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
			// === 0n fails!!!
			if (this.integer % other.integer == 0) { // denominator exactly divides numerator
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
			if (other.integer > 0n) {
				return new CanonicalArithmetic.Integer(this.integer ** other.integer);
			}
			else { // other is negative
				let rational = new CanonicalArithmetic.Rational(
					1n,
					this.integer ** -other.integer
				);
				rational.normalize();
				return rational;
			}
		}
		else if (other instanceof CanonicalArithmetic.Decimal) {
			if (this.isPositive()) {
				return new CanonicalArithmetic.Decimal(
					session.Decimal.pow(this.integer.toString(), other.decimal)
				);
			}
			else { // negative
				return null; // result is complex
			}
		}
		else { // rational
			return null; // because the result is symbolic
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
			let q = CanonicalArithmetic.integerDivision(this.integer, other.integer, session);
			
			return [
				isDiv ? new CanonicalArithmetic.Integer(q)                                : undefined,
				isMod ? new CanonicalArithmetic.Integer(this.integer - other.integer * q) : undefined,
			];
		}
		else if (other instanceof CanonicalArithmetic.Decimal) {
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
			let q = CanonicalArithmetic.integerDivision(
				this.integer * other.denominator,
				other.numerator,
				session
			);
			
			let r;
			if (isMod) {
				r = new CanonicalArithmetic.Rational(
					this.integer * other.denominator - other.numerator * q,
					other.denominator
				);
				r.minimize(session);
				
				if (r.numerator == 0n) {
					r = new CanonicalArithmetic.Integer(0n);
				}
				else if (r.denominator == 1n) {
					r = new CanonicalArithmetic.Integer(r.numerator);
				}
			}
			
			return [
				isDiv ? new CanonicalArithmetic.Integer(q) : undefined,
				r
			];
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
			return new CanonicalArithmetic.Decimal(
				session.Decimal.pow(this.decimal, other.decimal)
			);
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
			let rational;
			
			if (other.isPositive()) {
				rational = new CanonicalArithmetic.Rational(
					this.numerator   ** other.integer,
					this.denominator ** other.integer
				);
			}
			else {
				rational = new CanonicalArithmetic.Rational(
					this.denominator ** -other.integer,
					this.numerator   ** -other.integer
				);
			}
			rational.normalize();
			rational.minimize();
			return rational;
		}
		else if (other instanceof CanonicalArithmetic.Decimal) {
			if (this.isPositive()) {
				return new CanonicalArithmetic.Decimal(
					session.Decimal.pow(
						session.Decimal.div(this.numerator.toString(), this.denominator.toString()),
						other.decimal
					)
				);
			}
			else { // negative
				return null; // result is complex
			}
		}
		else { // rational
			return null; // result is symbolic
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
			let q = CanonicalArithmetic.integerDivision(
				this.numerator,
				this.denominator * other.integer,
				session
			);
			
			let r;
			if (isMod) {
				r = new CanonicalArithmetic.Rational(
					this.numerator - this.denominator * other.integer * q,
					this.denominator
				);
				r.minimize(session);
				
				if (r.numerator == 0n) {
					r = new CanonicalArithmetic.Integer(0n);
				}
				else if (r.denominator == 1n) {
					r = new CanonicalArithmetic.Integer(r.numerator);
				}
			}
			
			return [
				isDiv ? new CanonicalArithmetic.Integer(q) : undefined,
				r
			];
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
			let q = CanonicalArithmetic.integerDivision(
				this.numerator * other.denominator,
				this.denominator * other.numerator,
				session
			);
			
			let r;
			if (isMod) {
				r = new CanonicalArithmetic.Rational(
					this.numerator * other.denominator - this.denominator * other.numerator * q,
					this.denominator * other.denominator
				);
				r.minimize(session);
				
				if (r.numerator == 0n) {
					r = new CanonicalArithmetic.Integer(0n);
				}
				else if (r.denominator == 1n) {
					r = new CanonicalArithmetic.Integer(r.numerator);
				}
			}
			
			return [
				isDiv ? new CanonicalArithmetic.Integer(q) : undefined,
				r
			];
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
		let n = expr.children[0];
		let d = expr.children[1];
		
		let tagN = n.getTag();
		let tagD = d.getTag();
		
		let negN, negD;
		
		if (negN = (tagN === "Math.Arithmetic.Negative")) {
			n = n.children[0];
			tagN = n.getTag();
		}
		
		if (negD = (tagD === "Math.Arithmetic.Negative")) {
			d = d.children[0];
			tagD = d.getTag();
		}
		
		if (n.getTag() === "Math.Number" && d.getTag() === "Math.Number") {
			let N, D;
			if (typeof (N = n.get("Value")) === "bigint" && typeof (D = d.get("Value")) === "bigint") {
				if (D === 0n) {
					throw isNegative === negN;
				}
				
				let result = new CanonicalArithmetic.Rational(N, D);
				result.normalize();
				result.minimize();
				
				if (result.denominator === 1n) {
					result = new CanonicalArithmetic.Integer(result.numerator);
				}
				
				if (negN !== negD) {
					result = result.negate();
				}
				
				if (isNegative) {
					result = result.negate();
				}
				
				return result;
			}
		}
	}
	
	return null;
};

/*
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
*/

// input: An expression
// output: Either:
//            * An always BigInt number
//            * undefined, if the expression cannot be converted to a an BigInt number

CanonicalArithmetic.getBigInt = expr => {
	if (expr.isInternalNumber()) {
		let canonical = expr.get("Value");
		
		if (canonical instanceof CanonicalArithmetic.Integer) {
			return canonical.integer;
		}
		
		if (canonical instanceof CanonicalArithmetic.Decimal && canonical.hasIntegerValue()) {
			return BigInt(canonical.decimal.toFixed());
		}
	}
	
	return undefined;
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
		
		if (canonicalNumeric.denominator === 1n) {
			expr = Formulae.createExpression("Math.Number");
			expr.set("Value", negative ? -canonicalNumeric.numerator : canonicalNumeric.numerator);
		}
		else {
			let n = Formulae.createExpression("Math.Number");
			n.set("Value", negative ? -canonicalNumeric.numerator : canonicalNumeric.numerator);
			
			let d = Formulae.createExpression("Math.Number");
			d.set("Value", canonicalNumeric.denominator);
			
			expr = Formulae.createExpression("Math.Arithmetic.Division");
			expr.addChild(n);
			expr.addChild(d);
		}
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

CanonicalArithmetic.internalizeNumbersHandler = handler => {
	CanonicalArithmetic.internalizeNumbers(handler.expression);
};

CanonicalArithmetic.internalizeNumbers = expr => {
	let canonicalNumber;
	try {
		canonicalNumber = CanonicalArithmetic.expr2CanonicalNumeric(expr);
	}
	catch (positiveInfinite) {
		if (positiveInfinite) {
			expr.replaceBy(Formulae.createExpression("Math.Infinity"));
		}
		else {
			expr.replaceBy(
				Formulae.createExpression(
					"Math.Arithmetic.Multiplication",
					CanonicalArithmetic.number2InternalNumber(-1),
					Formulae.createExpression("Math.Infinity")
				)
			);
		}
		
		return;
	}
	
	if (canonicalNumber !== null) {
		let internalNumberExpr = Formulae.createExpression("Math.InternalNumber");
		internalNumberExpr.set("Value", canonicalNumber);
		
		expr.replaceBy(internalNumberExpr);
		
		return;
	}
	
	if (expr.getTag() === "Math.Arithmetic.Negative") {
		let mult = expr.children[0];
		if (mult.getTag() === "Math.Arithmetic.Multiplication") {
			mult.addChildAt(
				0,
				CanonicalArithmetic.number2InternalNumber(-1)
			);
			expr.replaceBy(mult);
		}
		else {
			mult = Formulae.createExpression("Math.Arithmetic.Multiplication");
			mult.addChild(CanonicalArithmetic.number2InternalNumber(-1));
			mult.addChild(expr.children[0]);
			expr.replaceBy(mult);
		}
	}
	
	for (let i = 0, n = expr.children.length; i < n; ++i) {
		CanonicalArithmetic.internalizeNumbers(expr.children[i]);
	}
};

CanonicalArithmetic.externalizeNumbersHandler = handler => {
	CanonicalArithmetic.externalizeNumbers(handler.expression);
};

CanonicalArithmetic.externalizeNumbers = expr => {
	if (expr.isInternalNumber()) {
		let numberExpr = CanonicalArithmetic.canonicalNumeric2Expr(expr.get("Value"));
		expr.replaceBy(numberExpr);
		return;
	}
	
	if (expr.getTag() === "Math.Arithmetic.Multiplication") {
		let first = expr.children[0];
		
		if (first.isInternalNumber()) {
			let canonical = first.get("Value");
			
			if (canonical.isNegative()) {
				// Ok
				let negative = Formulae.createExpression("Math.Arithmetic.Negative");
				expr.replaceBy(negative);
				
				canonical = canonical.negate();
				if (canonical.isOne()) {
					expr.removeChildAt(0);
				}
				else {
					first.set("Value", canonical);
				}
				
				if (expr.children.length == 1) {
					expr = expr.children[0];
				}
				
				negative.addChild(expr);
			}
		}
	}
	
	for (let i = 0, n = expr.children.length; i < n; ++i) {
		CanonicalArithmetic.externalizeNumbers(expr.children[i]);
	}
};

// input: A number
//        An optional boolean to indicate that the number will be decimal. Default is false
// output: A canonical integer or decimal

CanonicalArithmetic.number2Canonical = (n, isDecimal = false, session = null) => {
	if (isDecimal) {
		return new CanonicalArithmetic.Decimal(n, session);
	}
	else {
		return Number.isInteger(n) ? new CanonicalArithmetic.Integer(n) : new CanonicalArithmetic.Decimal(n, session);
	}
};

CanonicalArithmetic.canonical2InternalNumber = canonicalNumber => {
	let internal = Formulae.createExpression("Math.InternalNumber");
	internal.set("Value", canonicalNumber);
	return internal;
};

CanonicalArithmetic.number2InternalNumber = (n, isDecimal = false, session = null) => {
	return CanonicalArithmetic.canonical2InternalNumber(CanonicalArithmetic.number2Canonical(n, isDecimal, session));
};

// input: An expression
// output: Either:
//            * A CanonicalArithmetic.Integer
//            * A CanonicalArithmetic.Decimal
//            * null, if the expression cannot be converted to the previous values

CanonicalArithmetic.expr2CanonicalIntegerOrDecimal = expr => {
	if (!expr.isInternalNumber) return null;
	
	let canonicalNumber = expr.get("Value");
	
	if (canonicalNumber instanceof CanonicalArithmetic.Rational) return null;
	
	return canonicalNumber;
};

// input: An expression
// output: Either:
//            * An always integer number
//            * undefined, if the expression cannot be converted to a an integer number

CanonicalArithmetic.getInteger = expr => {
	if (!expr.isInternalNumber()) return undefined;
	let canonical = expr.get("Value");
	
	if (canonical instanceof CanonicalArithmetic.Integer) {
		let bi = canonical.integer;
		if (bi < Number.MIN_SAFE_INTEGER || bi > Number.MAX_SAFE_INTEGER) return undefined;
		return Number(bi);
	}
	if (canonical instanceof CanonicalArithmetic.Decimal) {
		let d = canonical.decimal;
		if (!d.isInteger()) return undefined;
		try {
			return d.toNumber();
		}
		catch (error) {
			return undefined;
		}
	}
	
	return undefined;
};

// input: An expression
// output: Either:
//            * A number
//            * undefined, if the expression cannot be converted to a number

CanonicalArithmetic.getNumber = expr => {
	if (!expr.isInternalNumber()) return undefined;
	let canonical = expr.get("Value");
	
	if (canonical instanceof CanonicalArithmetic.Integer) {
		let bi = canonical.integer;
		if (bi < Number.MIN_SAFE_INTEGER || bi > Number.MAX_SAFE_INTEGER) return undefined;
		return Number(bi);
	}
	if (canonical instanceof CanonicalArithmetic.Decimal) {
		let d = canonical.decimal;
		try {
			return d.toNumber();
		}
		catch (error) {
			return undefined;
		}
	}
	
	return undefined;
};
