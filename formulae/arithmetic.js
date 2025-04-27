/*
Fōrmulæ arithmetic library.
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

class Arithmetic {}

///////////////////////////////
// Number classes uniformity //
///////////////////////////////

// errors

Arithmetic.ConversionError = class extends Error {};
Arithmetic.OverflowError = class extends Error {};
Arithmetic.UnderflowError = class extends Error {};
Arithmetic.DivisionByZeroError = class extends Error {};
Arithmetic.DomainError = class extends Error {};
Arithmetic.TypeError = class extends Error {};
Arithmetic.NonNumericError = class extends Error {};
Arithmetic.UnimplementedError = class extends Error {};
Arithmetic.RoundingModeError = class extends Error {};

// creation of numeric objects

Arithmetic.createRational = (n, d) => {
	if (n.type != 0 || d.type != 0) throw new Arithmetic.ConversionError(); // only integers
	if (d.isZero()) throw new Arithmetic.DivisionByZeroError();             // denominator cannot be zero
	return new Rational(n, d).normalize();
};

Arithmetic.createComplex = (r, i) => {
	if (r.type == 3 || i.type == 3) throw new Arithmetic.ConversionError(); // integer, decimal or rationals
	return new Complex(r, i).normalize();
};

Arithmetic.createIntegerFromString = (s, session) => session.arbitrary ? BigInt.fromString(s) : NumberI.fromString(s);
Arithmetic.createDecimalFromString = (s, session) => session.arbitrary ? Decimal.fromString(s, session) : NumberD.fromString(s);

// Constants

Arithmetic.getIntegerZero = session => session.arbitrary ? BigInt.ZERO : NumberI.ZERO;
Arithmetic.getIntegerOne = session => session.arbitrary ? BigInt.ONE : NumberI.ONE;
Arithmetic.getDecimalZero = session => session.arbitrary ? Decimal.ZERO : NumberD.ZERO;
Arithmetic.getDecimalOne = session => session.arbitrary ? Decimal.ONE : NumberD.ONE;
Arithmetic.getPi = session => session.arbitrary ? session.Decimal.acos(-1) : NumberD.PI;
Arithmetic.getE = session => session.arbitrary ? session.Decimal.exp(1) : NumberD.E;
Arithmetic.getLN10 = session => session.arbitrary ? session.Decimal.ln(10) : NumberD.LN10;
Arithmetic.getLN2 = session => session.arbitrary ? session.Decimal.ln(2) : NumberD.LN2;

// Uniform interfaces

Number.prototype.isZero = function() { return this.valueOf() == 0; };
Number.prototype.isOne = function() { return this.valueOf() == 1; };
Number.prototype.isPositive = function() { return this.valueOf() > 0; };
Number.prototype.isNegative = function() { return this.valueOf() < 0; };
Number.prototype.significantDigits = function() { return new NumberI(Math.abs(this.valueOf()).toExponential().indexOf("e") - 1); };
Number.prototype.toDP = function(n) { let m = 10 ** n; return new NumberD(Math.round(this * m) / m); };
Number.prototype.comparedTo = function(other) { return this < other ? -1 : (this > other ? 1 : 0); };
Number.prototype.integerDivision = function(d, session) {
	let D = this.valueOf();
	d = d.valueOf();
	let q;
	switch (session.Decimal.rounding) {
		case 1: // TRUNCATION, ROUND DOWN or TOWARDS ZERO
			q = Math.trunc(D / d);
			break;
		case 2: // CEILING or TOWARDS INFINITY
			q = Math.ceil(D / d);
			break;
		case 3: // FLOOR or TOWARDS NEGATIVE INFINITY
			q = Math.floor(D / d);
			break;
		case 5:
		case 7: // HALF CEILING or HALF TOWARDS INFINITY
			q = Math.round(D / d);
			break;
		case 9:  // EUCLIDEAN MODE
			q = Math.trunc(D / d) - ((D % d) >= 0 ? 0 : (d > 0 ? 1 : -1));
			break;
		default:
			throw new Arithmetic.RoundingModeError();
	}
	return new NumberI(q);
};
Number.prototype.decimalPlaces = function() {
	if (Number.isInteger(this.valueOf())) return NumberI.ZERO;
	let s = Math.abs(this.valueOf()).toExponential();
	let e = s.indexOf("e");
	let m = s.substring(0, e);
	let p = Number(s.substring(e + 1));
	let offset = s.indexOf(".") < 0 ? 1 : 2;
	return new NumberI(m.length - offset - p);
};

Number.toText = n => {
	let negative = n < 0;
	if (negative) n = -n;
	let s = n.toExponential();
	let e = s.indexOf("e");
	
	let mantissa = s.substring(0, e);
	let exponent = Number(s.substring(e + 1));
	
	if (exponent > 0) {
		exponent = exponent + 1;
		mantissa = mantissa.charAt(0) + mantissa.substring(2);
		if (exponent >= mantissa.length) {
			mantissa += "0".repeat(exponent - mantissa.length);
		}
		else {
			mantissa = mantissa.substring(0, exponent) + "." + mantissa.substring(exponent);
		}
	}
	else if (exponent < 0) {
		exponent = -exponent - 1;
		mantissa = mantissa.charAt(0) + mantissa.substring(2);
		mantissa = "0." + "0".repeat(exponent) + mantissa;
	}
	
	if (negative) mantissa = "-" + mantissa;
	
	return mantissa;
};

Number.prototype.toNative = function() { return this.valueOf(); };

/////////////////////////////
// Fixed precision integer //
/////////////////////////////

const NumberI = class extends Number {};

NumberI.prototype.type = 0;
NumberI.prototype.toText = function() { return Number.toText(this.valueOf()); };
NumberI.prototype.toInternalText = function() { return this.toText() + "i"; };
NumberI.prototype.hasIntegerValue = function() { return true; };
NumberI.prototype.toInteger = function(session) { return this; };
NumberI.prototype.toDecimal = function(session) { return new NumberD(this.valueOf()); };
// NumberI.prototype.isZero -> By inherithance
// NumberI.prototype.isOne -> By inherithance
// NumberI.prototype.isPositive -> By inherithance
// NumberI.prototype.isNegative -> By inherithance
// NumberI.prototype.comparedTo -> By inherithance
NumberI.prototype.negation = function() { return new NumberI(-this.valueOf()); };
// NumberI.prototype.inverse = function(session) { let x = 1 / this; if (!Number.isFinite(x)) throw new Arithmetic.UnderflowError(); return new NumberD(x); };
NumberI.prototype.addition = function(other, session) { let x = this + other; if (!Number.isFinite(x)) throw new Arithmetic.OverflowError(); return new NumberI(x); };
NumberI.prototype.multiplication = function(other, session) { let x = this * other; if (!Number.isFinite(x)) throw new Arithmetic.OverflowError(); return new NumberI(x); };
NumberI.prototype.exponentiation = function(other, session) { let x = this ** other; if (!Number.isFinite(x)) throw new Arithmetic.OverflowError(); return new NumberI(x); };
NumberI.prototype.division = function(other, session) { let x = this / other; if (!Number.isFinite(x)) throw new Arithmetic.UnderflowError(); return new NumberD(x); };
NumberI.prototype.remainder = function(other) { return new NumberI(this % other); };
NumberI.prototype.gcd = function(other) { let [a, b] = [this, other]; while (b != 0) [a, b] = [b, a % b]; return new NumberI(Math.abs(a)); };
NumberI.prototype.integerDivisionForGCD = function(gcd) { return new NumberI(Math.trunc(this.valueOf() / gcd.valueOf())); };
NumberI.prototype.absoluteValue = function() { return this < 0 ? new NumberI(-this) : this; };
NumberI.prototype.squareRoot = function() { let negative = this.valueOf() < 0; let s = Math.sqrt(Math.abs(this.valueOf())); let result = Number.isInteger(s) ? new NumberI(s) : new NumberD(s); if (negative) result = new Complex(NumberI.ZERO, result); return result; };
NumberI.prototype.roundToPrecision = function(precision) { return new NumberI(this.valueOf().toPrecision(precision)); };
NumberI.prototype.roundToInteger = function() { return this; };
NumberI.prototype.roundToDecimalPlaces = function(places, session) { if (places >= 0) return this; let m = 10 ** (-places); return this.integerDivision(m, session).multiplication(m); };
NumberI.prototype.sqrtInteger = function() { let sr = Math.round(Math.sqrt(this.valueOf())); return sr ** 2 === this.valueOf() ? new NumberI(sr) : undefined; };
NumberI.prototype.randomInRange = function(end) { return new NumberI(this.valueOf() + Math.floor(Math.random() * (end.valueOf() - this.valueOf() + 1))); };

NumberI.ZERO = new NumberI(0);
NumberI.ONE = new NumberI(1);

NumberI.fromString = function(s) { let x = Number.parseInt(s); if (!Number.isFinite(x)) throw new Arithmetic.ConversionError(); return new NumberI(x); };

// NumberI.prototype.toNative -> By inheritance
NumberI.prototype.toExternal = function() { return BigInt(this.valueOf()); };

// integer only

NumberI.prototype.bitwiseAnd = function(other) { return new NumberI(this.valueOf() & other.valueOf()); };
NumberI.prototype.bitwiseOr = function(other) { return new NumberI(this.valueOf() | other.valueOf()); };
NumberI.prototype.bitwiseNot = function() { return new NumberI(~this.valueOf()); };
NumberI.prototype.bitwiseXOr = function(other) { return new NumberI(this.valueOf() ^ other.valueOf()); };
NumberI.prototype.bitwiseLeftShift = function(other) { return new NumberI(this.valueOf() << other.valueOf()); };
NumberI.prototype.bitwiseRightShift = function(other) { return new NumberI(this.valueOf() >> other.valueOf()); };
NumberI.prototype.bitwiseGetBit = function(other) { return new NumberI((this.valueOf() & (1 << other.valueOf())) !== 0 ? 1 : 0); };
NumberI.prototype.bitwiseSetBit = function(other) { return new NumberI(this.valueOf() | (1 << other.valueOf())); };
NumberI.prototype.bitwiseClearBit = function(other) { return new NumberI(this.valueOf() & ~(1 << other.valueOf())); };
NumberI.prototype.bitwiseFlipBit = function(other) { return new NumberI(this.valueOf() ^ (1 << other.valueOf())); };
NumberI.prototype.bitwiseBitLength = function() { return new NumberI(this.valueOf().toString(2).length); };
NumberI.prototype.bitwiseBitCount = function() { return new NumberI(this.valueOf().toString(2).replace(/0/g, "").length); };

/////////////////////////////
// Fixed precision decimal //
/////////////////////////////

const NumberD = class extends Number {};
NumberD.prototype.type = 1;
NumberD.prototype.toText = function() { let s = Number.toText(this.valueOf()); if (Number.isInteger(this.valueOf())) s += ".0"; return s; };
NumberD.prototype.toInternalText = function() { return this.toText() + "d"; };
NumberD.prototype.hasIntegerValue = function() { return Number.isInteger(this.valueOf()); };
NumberD.prototype.toInteger = function(session) { return new NumberI(this.valueOf()); };
NumberD.prototype.toDecimal = function(session) { return this; };
// NumberD.prototype.isZero -> By inherithance
// NumberD.prototype.isOne -> By inherithance
// NumberD.prototype.isPositive -> By inherithance
// NumberD.prototype.isNegative -> By inherithance
// NumberD.prototype.comparedTo -> By inherithance
NumberD.prototype.negation = function() { return new NumberD(-this.valueOf()); };
NumberD.prototype.inverse = function(session) { let x = 1 / this.valueOf(); if (!Number.isFinite(x)) throw new Arithmetic.UnderflowError(); return new NumberD(x); };
NumberD.prototype.addition = function(other, session) { let x = this + other; if (!Number.isFinite(x)) throw new Arithmetic.OverflowError(); return new NumberD(x); };
NumberD.prototype.multiplication = function(other, session) { let x = this * other; if (!Number.isFinite(x)) throw new Arithmetic.OverflowError(); return new NumberD(x); };
NumberD.prototype.exponentiation = function(other, session) { let x = this ** other; if (!Number.isFinite(x)) new Arithmetic.OverflowError(); return new NumberD(x); };
NumberD.prototype.division = function(other, session) { let x = this / other; if (!Number.isFinite(x)) throw new Arithmetic.UnderflowError(); return new NumberD(x); };
// NumberD.prototype.remainder -> It must never be called
// NumberD.prototype.gcd -> It must never be called
NumberD.prototype.absoluteValue = function() { return this < 0 ? new NumberD(-this) : this; };
NumberD.prototype.squareRoot = function() { let negative = this.valueOf() < 0; let s = Math.sqrt(Math.abs(this.valueOf())); let result = new NumberD(s); if (negative) result = new Complex(NumberD.ZERO, result); return result; };
// NumberD.prototype.squareRoot = function() { return new NumberD(Math.sqrt(this)); };
NumberD.prototype.exponential = function() { return new NumberD(Math.exp(this)); };
NumberD.prototype.naturalLogarithm = function() { let x = Math.log(this); if (!Number.isFinite(x)) throw "Domain"; return new NumberD(x); };
// NumberD.prototype.decimalLogarithm = function() { let x = Math.log10(this); if (!Number.isFinite(x)) throw "Domain"; return new NumberD(x); };
// NumberD.prototype.binaryLogarithm = function() { let x = Math.log2(this); if (!Number.isFinite(x)) throw "Domain"; return new NumberD(x); };
// NumberD.prototype.logarithm = function(base) { let x = Math.log(this) / Math.log(base); if (!Number.isFinite(x)) throw "Domain"; return new NumberD(x); };
NumberD.prototype.aTan2 = function(x) { if (this.valueOf() === 0 && x.valueOf() === 0) throw new Arithmetic.DivisionByZeroError(); return new NumberD(Math.atan2(this, x)); };
NumberD.prototype.sine = function() { return new NumberD(Math.sin(this)); };
NumberD.prototype.cosine = function() { return new NumberD(Math.cos(this)); };
NumberD.prototype.tangent = function() { let x = Math.tan(this); if (!Number.isFinite(x)) throw "Overfloaw"; return new NumberD(x); };
NumberD.prototype.inverseSine = function() { let x = Math.asin(this); if (!Number.isFinite(x)) throw "Overfloaw"; return new NumberD(x); };
NumberD.prototype.inverseCosine = function() { let x = Math.acos(this); if (!Number.isFinite(x)) throw "Overfloaw"; return new NumberD(x); };
NumberD.prototype.inverseTangent = function() { return new NumberD(Math.atan(this)); };
NumberD.prototype.hyperbolicSine = function() { return new NumberD(Math.sinh(this)); };
NumberD.prototype.hyperbolicCosine = function() { return new NumberD(Math.cosh(this)); };
NumberD.prototype.hyperbolicTangent = function() { return new NumberD(Math.tanh(this)); };
NumberD.prototype.inverseHyperbolicSine = function() { return new NumberD(Math.asinh(this)); };
NumberD.prototype.inverseHyperbolicCosine = function() { let x = Math.acosh(this); if (!Number.isFinite(x)) throw "Overflow"; return new NumberD(x); };
NumberD.prototype.inverseHyperbolicTangent = function() { return new NumberD(Math.atanh(this)); };
NumberD.prototype.trunc = function() { return new NumberD(Math.trunc(this.valueOf())); };
NumberD.prototype.round = function() { return new NumberD(Math.round(this.valueOf())); };
NumberD.prototype.floor = function() { return new NumberD(Math.floor(this.valueOf())); };
NumberD.prototype.ceil = function() { return new NumberD(Math.ceil(this.valueOf())); };
NumberD.prototype.roundToPrecision = function(precision) { return new NumberD(this.valueOf().toPrecision(precision)); };
NumberD.prototype.roundToInteger = function(session) { return this.integerDivision(NumberD.ONE, session); };
NumberD.prototype.roundToDecimalPlaces = function(places, session) { let m = 10 ** -(places); let r = this.integerDivision(m, session).valueOf() * m; return places > 0 ? new NumberD(r) : new NumberI(r); };
NumberD.prototype.randomInRange = function(end) { return this.valueOf() + (Math.random() * (end.valueOf() - this.valueOf())); };

NumberD.fromString = function(s) { let x = Number.parseFloat(s); if (!Number.isFinite(x)) throw new Arithmetic.ConversionError(); return new NumberD(x); };
NumberD.getRandom = function() { return new NumberD(Math.random()); };

NumberD.ZERO = new NumberD(0);
NumberD.ONE = new NumberD(1);
NumberD.PI = new NumberD(Math.PI);
NumberD.E = new NumberD(Math.E);
NumberD.LN10 = new NumberD(Math.LN10);
NumberD.LN2 = new NumberD(Math.LN2);

// NumberD.prototype.toNative -> By inheritance
NumberD.prototype.toExternal = function(session) { return new session.Decimal(this.valueOf()); };


/////////////////////////////////
// Arbitrary precision integer //
/////////////////////////////////

BigInt.prototype.type = 0;
BigInt.prototype.toText = function() { return this.toString(); };
BigInt.prototype.toInternalText = function() { return this.toText() + "I"; };
BigInt.prototype.hasIntegerValue = function() { return true; };
// BigInt.prototype.toInteger -> It is already integer, it must never be called
BigInt.prototype.toDecimal = function(session) { return new session.Decimal(this.toString()) }; // expensive
BigInt.prototype.significantDigits = function() { return this.absoluteValue().toString().replace(/0+$/, "").length; };
BigInt.prototype.decimalPlaces = function() { return 0; };
BigInt.prototype.toDP = function(n) { let m = 10n ** n; return (this / m) * m; };
BigInt.prototype.isZero = function() { return this == 0n; };
BigInt.prototype.isOne = function() { return this == 1n; };
BigInt.prototype.isPositive = function() { return this > 0n; };
BigInt.prototype.isNegative = function() { return this < 0n; };
BigInt.prototype.comparedTo = function(other) { return this < other ? -1 : (this > other ? 1 : 0); };
BigInt.prototype.negation = function() { return -this; };
//BigInt.prototype.inverse = function(session) { return session.Decimal.div(Decimal.ONE, new session.Decimal(this.toString())); }; // expensive
//BigInt.prototype.inverse = function(session) { let x = 1 / this; if (!Number.isFinite(x)) throw new Arithmetic.UnderflowError(); return new NumberD(x); };
BigInt.prototype.addition = function(other, session) { return this + other; };
BigInt.prototype.multiplication = function(other, session) { return this * other; };
BigInt.prototype.exponentiation = function(other, session) { return this ** other; };
BigInt.prototype.division = function(other, session) { return session.Decimal.div(this.toString(), other.toString()); }; // expensive
BigInt.prototype.remainder = function(other) { return this % other; };
BigInt.prototype.gcd = function(other) { let [a, b] = [this, other]; while (b != 0n) [a, b] = [b, a % b]; return a < 0n ? -a : a; };
BigInt.prototype.integerDivisionForGCD = function(gcd) { return this / gcd; };
BigInt.prototype.absoluteValue = function() { return this < 0n ? -this : this; };
BigInt.prototype.roundToPrecision = function(precision) {}; // TODO
BigInt.prototype.roundToInteger = function() { return this; }
BigInt.prototype.roundToDecimalPlaces = function(places, session) { if (places >= 0) return this; let m = 10n ** (-places); return this.integerDivision(m, session).multiplication(m); };

BigInt.fromString = function(s) { let x; try { x = new BigInt(s); } catch (e) { throw new Arithmetic.ConversionError(); } return x; };

BigInt.ZERO = 0n;
BigInt.ONE = 1n;

BigInt.prototype.integerDivision = function(d, session) {
	let D = this;
	
	switch (session.Decimal.rounding) {
		case 0: // ROUND UP, or AWAY FROM ZERO
			return (D / d) + (D % d === 0n ? 0n : ((D > 0n) === (d > 0n) ? 1n : -1n));
		
		case 1: // TRUNCATION, ROUND DOWN or TOWARDS ZERO
			return D / d;
		
		case 2: // CEILING or TOWARDS INFINITY
			return (D / d) + (D % d === 0n ? 0n : ((D > 0n) === (d > 0n) ? 1n : 0n));
		
		case 3: // FLOOR or TOWARDS NEGATIVE INFINITY
			return (D / d) + (D % d === 0n ? 0n : ((D > 0n) === (d > 0n) ? 0n : -1n));
		
		case 4: { // HALF ROUND UP or HALF AWAY FROM ZERO
			let absD = D >= 0n ? D : -D;
			let absd = d >= 0n ? d : -d;
			let absRemainderDoubled = (absD % absd) * 2n;
			return (D / d) + (absRemainderDoubled < absd ? 0n : ((D > 0n) === (d > 0n) ? 1n : -1n));
		}
		
		case 5: { // HALF TRUNCATION, HALF ROUND DOWN or HALF TOWARDS ZERO 
			let absD = D >= 0n ? D : -D;
			let absd = d >= 0n ? d : -d;
			let absRemainderDoubled = (absD % absd) * 2n;
			return (D / d) + (absRemainderDoubled <= absd ? 0n : ((D > 0n) === (d > 0n) ? 1n : -1n));
		}
		
		case 6: { // HALF EVEN
			let absD = D >= 0n ? D : -D;
			let absd = d >= 0n ? d : -d;
			let absRemainderDoubled = (absD % absd) * 2n;
			let q = D / d;
			q += (absRemainderDoubled < absd || (absRemainderDoubled === absd && q % 2n === 0n) ? 0n : ((D > 0n) === (d > 0n) ? 1n : -1n));
			return q;
		}
		
		/*
		case x: { // HALF ODD
			let absD = D >= 0n ? D : -D;
			let absd = d >= 0n ? d : -d;
			let absRemainderDoubled = (absD % absd) * 2n;
			let q = D / d;
			q += (absRemainderDoubled < absd || (absRemainderDoubled === absd && q % 2n !== 0n) ? 0n : ((D > 0n) === (d > 0n) ? 1n : -1n));
			return q;
		}
		*/
		
		case 7: { // HALF CEILING or HALF TOWARDS INFINITY
			let absD = D >= 0n ? D : -D;
			let absd = d >= 0n ? d : -d;
			let absRemainderDoubled = (absD % absd) * 2n;
			return (D / d) + (absRemainderDoubled < absd ? 0n : (D > 0n) === (d > 0n) ? 1n : (absRemainderDoubled > absd ? -1n : 0n));
		}
		
		case 8: { // HALF FLOOR or HALF TOWARDS NEGATIVE INFINITY
			let absD = D >= 0n ? D : -D;
			let absd = d >= 0n ? d : -d;
			let absRemainderDoubled = (absD % absd) * 2n;
			let q = (D / d) + (absRemainderDoubled < absd ? 0n : (D > 0n) === (d > 0n) ? (absRemainderDoubled > absd ? 1n : 0n) : -1n);
			return q;
		}
		
		case 9: { // EUCLIDEAN MODE
			let q;
			if (d > 0n) {
				q = (D / d) + (D % d === 0n ? 0n : ((D > 0n) === (d > 0n) ? 0n : -1n)); // FLOOR
			}
			else {
				q = (D / d) + (D % d === 0n ? 0n : ((D > 0n) === (d > 0n) ? 1n : 0n)); // CEILING
			}
			return q;
		}
	}
};

BigInt.prototype.sqrtInteger = function() {
	let a = 1n;
	let b = (this >> 5n) + 8n;
	let mid;

	while (b >= a) {
		mid = (a + b) >> 1n;
		if (mid * mid > this) {
			b = mid - 1n;
		} else {
			a = mid + 1n;
		}
	}
	let sqrt = a - 1n;
	
	return ((sqrt * sqrt) == this) ? sqrt : undefined;
};

BigInt.prototype.randomInRange = function(end, session) {
	let amplitude = (end - this).absoluteValue() + 1n;
	let nBytes = amplitude.toString(8).length;
	let bytes = crypto.getRandomValues(new Uint8Array(nBytes));
	let x = 0n;
	for (let i = 0; i < bytes.length; ++i) x = x * 256n + BigInt(bytes[i]);
	x = x % amplitude;
	return this + x;
};

BigInt.prototype.bitwiseAnd = function(other) { return this & other; };
BigInt.prototype.bitwiseOr = function(other) { return this | other; };
BigInt.prototype.bitwiseNot = function() { return ~this; };
BigInt.prototype.bitwiseXOr = function(other) { return this ^ other; };
BigInt.prototype.bitwiseLeftShift = function(other) { return this << other; };
BigInt.prototype.bitwiseRightShift = function(other) { return this >> other; };
BigInt.prototype.bitwiseGetBit = function(other) { return (this & (1n << other)) !== 0n ? 1n : 0n; };
BigInt.prototype.bitwiseSetBit = function(other) { return this | (1n << other); };
BigInt.prototype.bitwiseClearBit = function(other) { return this & ~(1n << other); };
BigInt.prototype.bitwiseFlipBit = function(other) { return this ^ (1n << other); };
BigInt.prototype.bitwiseBitLength = function() { return BigInt(this.toString(2).length); };
BigInt.prototype.bitwiseBitCount = function() { return BigInt(this.toString(2).replace(/0/g, "").length); };

BigInt.prototype.toNative = function() { return Number(this); };
BigInt.prototype.toExternal = function() { return this; };

/////////////////////////////////
// Arbitrary precision decimal //
/////////////////////////////////

Decimal.prototype.type = 1;
Decimal.prototype.toText = function() { let s = this.toFixed(); if (this.isInteger()) s += ".0"; return s; };
Decimal.prototype.toInternalText = function() { return this.toText() + "D"; };
Decimal.prototype.hasIntegerValue = function() { return this.isInteger(); };
Decimal.prototype.toInteger = function(session) { return BigInt(this.toFixed()); }; // expensive
Decimal.prototype.toDecimal = function(session) { return this; };
Decimal.prototype.significantDigits = function() { return this.isZero() ? 0 : this.precision(); };
Decimal.prototype.roundToPrecision = function(precision, session) { return this.toSignificantDigits(precision, session.rounding); };
Decimal.prototype.roundToInteger = function(session) { return BigInt(session.Decimal.round(this).toFixed()); };
Decimal.prototype.roundToDecimalPlaces = function(places, session) { let m = session.Decimal.pow(10, places); return session.Decimal.mul(this.integerDivision(m, session), m); };
// Decimal.prototype.decimalPlaces // there already is
Decimal.prototype.toDP = function(n, session) { let m = new session.Decimal(10).pow(n); return session.Decimal.div(session.Decimal.mul(this, m).round(), m); };
// Decimal.prototype.isZero = function() { return this.isZero(); };         // there already is
Decimal.prototype.isOne = function() { return this.comparedTo(1) == 0; };
// Decimal.prototype.isPositive = function() { return this.isPositive(); }; // there already is
// Decimal.prototype.isNegative = function() { return this.isNegative(); }; // there already is
// Decimal.prototype.comparedTo = // there already is
Decimal.prototype.inverse = function(session) { let x = session.Decimal.div(1, this); if (!x.isFinite()) throw new Arithmetic.OverflowError(); return x; };
Decimal.prototype.negation = function() { return this.negated(); };
Decimal.prototype.addition = function(other, session) { return session.Decimal.add(this, other); };
Decimal.prototype.multiplication = function(other, session) { return session.Decimal.mul(this, other); };
Decimal.prototype.exponentiation = function(other, session) { let x = session.Decimal.pow(this, other); if (!x.isFinite()) throw new Arithmetic.OverflowError(); return x; };
Decimal.prototype.division = function(other, session) { if (other.isZero()) throw new Arithmetic.DivisionByZeroError(); return session.Decimal.div(this, other); };
// Decimal.prototype.remainder -> It must never be called
// Decimal.prototype.gcd -> It must never be called
Decimal.prototype.absoluteValue = function() { return this.abs(); };
Decimal.prototype.squareRoot = function(session) { return session.Decimal.sqrt(this); };
Decimal.prototype.exponential = function(session) { return session.Decimal.exp(this); };
Decimal.prototype.naturalLogarithm = function(session) { let x = session.Decimal.ln(this); if (!x.isFinite()) throw new Arithmetic.DomainError(); return x; };
// Decimal.prototype.decimalLogarithm = function(session) { let x = session.Decimal.log10(this); if (!x.isFinite()) throw new Arithmetic.DomainError(); return x; };
// Decimal.prototype.binaryLogarithm = function(session) { let x = session.Decimal.log2(this); if (!x.isFinite()) throw new Arithmetic.DomainError(); return x; };
// Decimal.prototype.logarithm = function(base, session) { let x = session.Decimal.log(this, base); if (!x.isFinite()) throw new Arithmetic.DomainError(); return x; };
Decimal.prototype.aTan2 = function(x, session) { let r = session.Decimal.atan2(this, x); if (!r.isFinite()) throw Arithmetic.DivisionByZeroError(); return r; };
Decimal.prototype.sine = function(session) { return session.Decimal.sin(this); };
Decimal.prototype.cosine = function(session) { return session.Decimal.cos(this); };
Decimal.prototype.tangent = function(session) { let x = session.Decimal.tan(this); if (!x.isFinite()) throw new Arithmetic.DomainError(); return x; };
Decimal.prototype.inverseSine = function(session) { let x = session.Decimal.asin(this); if (!x.isFinite()) throw new Arithmetic.DomainError(); return x; };
Decimal.prototype.inverseCosine = function(session) { let x = session.Decimal.acos(this); if (!x.isFinite()) throw new Arithmetic.DomainError(); return x; };
Decimal.prototype.inverseTangent = function(session) { return session.Decimal.atan(this); };
Decimal.prototype.hyperbolicSine = function(session) { return session.Decimal.sinh(this); };
Decimal.prototype.hyperbolicCosine = function(session) { return session.Decimal.cosh(this); };
Decimal.prototype.hyperbolicTangent = function(session) { return session.Decimal.tanh(this); };
Decimal.prototype.inverseHyperbolicSine = function(session) { return session.Decimal.asinh(this); };
Decimal.prototype.inverseHyperbolicCosine = function(session) { let x = session.Decimal.acosh(this); if (!x.isFinite()) throw new Arithmetic.DomainError(); return x; };
Decimal.prototype.inverseHyperbolicTangent = function(session) { return session.Decimal.atanh(this); };
Decimal.prototype.randomInRange = function(end, session) { return session.Decimal.add(this, session.Decimal.mul(session.Decimal.random(), session.Decimal.sub(end, this))); };

// Decimal.prototype.trunc = function() // there already is
// Decimal.prototype.round = function() // there already is
// Decimal.prototype.floor = function() // there already is
// Decimal.prototype.ceil = function() // there already is

Decimal.prototype.integerDivision = function(d, session) {
	let D = this;
	
	let bkpRounding = session.Decimal.rounding;
	let bkpModulo = session.Decimal.modulo;
	
	let euclidean = false;
	
	if (session.Decimal.rounding == 9) { // euclidean
		euclidean = true;
		session.Decimal.rounding = 1; // truncation
		session.Decimal.modulo = 9;
	}
	
	let q = session.Decimal.div(D, d).round();
	
	if (euclidean) {
		let r = session.Decimal.mod(D, d);
		if (r.lessThan(0)) {
			let s = session.Decimal.sign(d);
			q = session.Decimal.sub(q, s);
		}
	}
	
	session.Decimal.rounding = bkpRounding;
	session.Decimal.modulo = bkpModulo;
	
	return q;
};

Decimal.fromString = function(s, session) { let x; try { x = new session.Decimal(s); } catch (e) { throw new Arithmetic.ConversionError(); } return x; };
Decimal.getRandom = function(precision, session) { return precision > 0 ? session.Decimal.random(precision) : session.Decimal.random(); };

Decimal.ZERO = new Decimal(0);
Decimal.ONE = new Decimal(1);

Decimal.prototype.toNative = function() { return this.toNumber(); };
Decimal.prototype.toExternal = function() { return this; };

//////////////
// Rational //
//////////////

const Rational = class {
	constructor(numerator, denominator) {
		this.numerator = numerator;
		this.denominator = denominator;
	}
}

Rational.prototype.type = 2;
Rational.prototype.toInternalText = function() { return this.numerator.toInternalText() + " / " + this.denominator.toInternalText(); };
// Rational.prototype.hasIntegerValue -> It must never be called
// Rational.prototype.toInteger -> It must never be called
Rational.prototype.toDecimal = function(session) { return this.numerator.toDecimal(session).division(this.denominator.toDecimal(session), session); };
Rational.prototype.significantDigits = function() { throw new Arithmetic.TypeError(); };
Rational.prototype.isZero = function() { return false; }
Rational.prototype.isOne = function() { return false; }
Rational.prototype.isPositive = function() { return this.numerator.isPositive(); };
Rational.prototype.isNegative = function() { return this.numerator.isNegative(); };
Rational.prototype.negation = function() { return new Rational(this.numerator.negation(), this.denominator); };
// Rational.prototype.addition -> It must never be called 
// Rational.prototype.multiplication -> It must never be called 
// Rational.prototype.exponentiation -> It must never be called 
// Rational.prototype.division -> It must never be called 
// Rational.prototype.remainder -> It must never be called 
// Rational.prototype.gcd -> It must never be called 
Rational.prototype.absoluteValue = function() { return this.numerator.isNegative() ? new Rational(this.numerator.negation(), this.denominator) : this; };
Rational.prototype.roundToPrecision = function(precision, session) { return this.toDecimal(session).roundToPrecision(precision, session); };
Rational.prototype.roundToInteger = function(session) { return this.numerator.integerDivision(this.denominator, session); };
Rational.prototype.roundToDecimalPlaces = function(places, session) { return this.toDecimal(session).roundToDecimalPlaces(places, session); };

Rational.prototype.normalize = function() {
	if (this.denominator.isNegative()) {
		this.numerator = this.numerator.negation();
		this.denominator = this.denominator.negation();
	}
	
	let gcd = this.numerator.gcd(this.denominator);
	if (!gcd.isOne()) {
		//this.numerator = this.numerator.integerDivision(gcd);
		//this.denominator = this.denominator.integerDivision(gcd);
		this.numerator = this.numerator.integerDivisionForGCD(gcd);
		this.denominator = this.denominator.integerDivisionForGCD(gcd);
	}
	
	if (this.denominator.isOne()) {
		return this.numerator;
	}
	
	return this;
};

Rational.prototype.toNative = function() { return this.numerator.toNative() / this.denominator.toNative() };

/////////////
// Complex //
/////////////

const Complex = class {
	constructor(real, imaginary) {
		this.real = real;
		this.imaginary = imaginary;
	}
};

Complex.prototype.type = 3;
Complex.prototype.toInternalText = function() { return "[" + this.real.toInternalText() + "] ⊞ [" + this.imaginary.toInternalText() + "] ⅈ"; };
// Complex.prototype.hasIntegerValue -> It must never be called
// Complex.prototype.toInteger -> It must never be called
Complex.prototype.hasDecimalPart = function() { return this.real.type === 1 || this.imaginary.type === 1; };
Complex.prototype.toDecimal = function(session) {
	if (this.real.type === 1 && this.imaginary.type === 1) return this;
	return new Complex(
		this.real.type === 1 ? this.real : this.real.toDecimal(session),
		this.imaginary.type === 1 ? this.imaginary : this.imaginary.toDecimal(session)
	);
};
Complex.prototype.roundToPrecision = function(precision, session) { return new Complex(this.real.roundToPrecision(precision, session), this.imaginary.roundToPrecision(precision, session)); };
Complex.prototype.roundToInteger = function(session) { return new Complex(this.real.roundToInteger(session), this.imaginary.roundToInteger(session)); };
Complex.prototype.roundToDecimalPlaces = function(places, session) { return new Complex(this.real.roundToDecimalPlaces(places, session), this.imaginary.roundToDecimalPlaces(places, session)); };
Complex.prototype.significantDigits = function() { throw new Arithmetic.TypeError(); };
Complex.prototype.isZero = function() { return false; }
Complex.prototype.isOne = function() { return false; }
// Complex.prototype.isPositive -> It must never be called
// Complex.prototype.isNegative -> It must never be called
Complex.prototype.negation = function() { return new Complex(this.real.negation(), this.imaginary.negation()); };
// Complex.prototype.addition -> It must never be called 
// Complex.prototype.multiplication -> It must never be called 
// Complex.prototype.exponentiation -> It must never be called 
// Complex.prototype.division -> It must never be called 
// Complex.prototype.remainder -> It must never be called
// Complex.prototype.gcd -> It must never be called
// Complex.prototype.absoluteValue -> It must never be called

Complex.getI = (session) => new Complex(Arithmetic.getIntegerZero(session), Arithmetic.getIntegerOne(session));

Complex.prototype.conjugate = function() { return new Complex(this.real, this.imaginary.negation()); };

Complex.prototype.normalize = function() {
	if (this.imaginary.isZero()) {
		return this.real;
	}
	
	return this;
};

Complex.prototype.toNative = function() { throw new Arithmetic.TypeError(); };

//////////////////////////

Arithmetic.toDecimal = (n, session) => n.type === 1 ? n : n.toDecimal(session);

//////////////////////////

Arithmetic.isInteger  = number => number.type === 0;
Arithmetic.isDecimal  = number => number.type === 1;
Arithmetic.isRational = number => number.type === 2;
Arithmetic.isComplex  = number => number.type === 3;


// shorthands

Arithmetic.subtraction = (n1, n2, s) => Arithmetic.addition(n1, n2.negation(), s);
Arithmetic.square = (n, s) => n.multiplication(n, s);

// comparison

const comparisonMap = [
	[
		// integer comparedTo integer
		(i1, i2, s) => i1.comparedTo(i2)
		,
		// integer comparedTo decimal
		(i, d, s) => i.toDecimal(s).comparedTo(d)
		,
		// integer comparedTo rational
		(i, r, s) => i.multiplication(r.denominator).comparedTo(r.numerator)
		,
		// integer comparedTo complex
		(i, c, s) => { throw new Arithmetic.TypeError(); }
	],
	[
		// decimal comparedTo integer
		(d, i, s) => d.comparedTo(i.toDecimal(s))
		,
		// decimal comparedTo decimal
		(d1, d2, s) => d1.comparedTo(d2)
		,
		// decimal comparedTo rational
		(d, r, s) => d.comparedTo(r.toDecimal(s))
		,
		// decimal comparedTo complex
		(d, c, s) => { throw new Arithmetic.TypeError(); }
	],
	[
		// rational comparedTo integer
		(r, i, s) => r.numerator.comparedTo(i.multiplication(r.denominator))
		,
		// rational comparedTo decimal
		(r, d, s) => r.toDecimal(s).comparedTo(d)
		,
		// rational comparedTo rational
		(r1, r2, s) => r1.numerator.multiplication(r2.denominator).comparedTo(r2.numerator.multiplication(r1.denominator))
		,
		// rational comparedTo complex
		(r, c, s) => { throw new Arithmetic.TypeError(); }
	],
	[
		// complex comparedTo integer
		(c, i, s) => { throw new Arithmetic.TypeError(); }
		,
		// complex comparedTo decimal
		(c, d, s) => { throw new Arithmetic.TypeError(); }
		,
		// complex comparedTo rational
		(c, r, s) => { throw new Arithmetic.TypeError(); }
		,
		// complex comparedTo complex, returns 0 (equals) or undefined (different)
		(c1, c2, s) => Arithmetic.comparison(c1.real, c2.real) == 0 && Arithmetic.comparison(c1.imaginary, c2.imaginary) == 0 ? 0 : undefined
	]
];

Arithmetic.comparison = (n1, n2, session) => comparisonMap[n1.type][n2.type](n1, n2, session);

// addition

const additionMap = [
	[
		// integer + integer
		(i1, i2, s) => i1.addition(i2, s)
		,
		// integer + decimal
		(i, d, s) => i.toDecimal(s).addition(d, s)
		,
		// integer + rational
		(i, r, s) => Arithmetic.createRational(
			i.multiplication(r.denominator, s).addition(r.numerator, s),
			r.denominator
		)
		,
		// integer + complex
		(i, c, s) => Arithmetic.createComplex(
			Arithmetic.addition(i, c.real, s),
			c.imaginary
		)
	],
	[
		// decimal + integer
		(d, i, s) => d.addition(i.toDecimal(s), s)
		,
		// decimal + decimal
		(d1, d2, s) => d1.addition(d2, s)
		,
		// decimal + rational
		(d, r, s) => d.addition(
			r.numerator.division(r.denominator, s),
			s
		)
		,
		// decimal + complex
		(d, c, s) => Arithmetic.createComplex(
			Arithmetic.addition(d, c.real, s),
			c.imaginary
		)
	],
	[
		// rational + integer
		(r, i, s) => Arithmetic.createRational(
			r.numerator.addition(i.multiplication(r.denominator)),
			r.denominator
		)
		,
		// rational + decimal
		(r, d, s) => r.numerator.division(r.denominator, s).addition(d, s)
		,
		// rational + rational
		(r1, r2, s) => Arithmetic.createRational(
			r1.numerator.multiplication(r2.denominator).addition(r1.denominator.multiplication(r2.numerator)),
			r1.denominator.multiplication(r2.denominator)
		)
		,
		// rational + complex
		(r, c, s) => Arithmetic.createComplex(
			Arithmetic.addition(r, c.real, s),
			c.imaginary
		)
	],
	[
		// complex + integer
		(c, i, s) => Arithmetic.createComplex(
			Arithmetic.addition(c.real, i, s),
			c.imaginary
		)
		,
		// complex + decimal
		(c, d, s) => Arithmetic.createComplex(
			Arithmetic.addition(c.real, d, s),
			c.imaginary
		)
		,
		// complex + rational
		(c, r, s) => Arithmetic.createComplex(
			Arithmetic.addition(c.real, r, s),
			c.imaginary
		),
		// complex + complex
		(c1, c2, s) => Arithmetic.createComplex(
			Arithmetic.addition(c1.real, c2.real, s),
			Arithmetic.addition(c1.imaginary, c2.imaginary, s)
		)
	]
];

Arithmetic.addition = (n1, n2, session) => additionMap[n1.type][n2.type](n1, n2, session);

// multiplication

const multiplicationMap = [
	[
		// integer × integer
		(i1, i2, s) => i1.multiplication(i2, s)
		,
		// integer × decimal
		(i, d, s) => i.toDecimal(s).multiplication(d, s)
		,
		// integer × rational
		(i, r, s) => Arithmetic.createRational(
			i.multiplication(r.numerator, s),
			r.denominator
		)
		,
		// integer × complex
		(i, c, s) => Arithmetic.createComplex(
			Arithmetic.multiplication(i, c.real, s),
			Arithmetic.multiplication(i, c.imaginary, s)
		)
	],
	[
		// decimal × integer
		(d, i, s) => d.multiplication(i.toDecimal(s), s)
		,
		// decimal × decimal
		(d1, d2, s) => d1.multiplication(d2, s)
		,
		// decimal × rational
		(d, r, s) => d.multiplication(
			r.numerator.division(r.denominator, s),
			s
		)
		,
		// decimal × complex
		(d, c, s) => Arithmetic.createComplex(
			Arithmetic.multiplication(d, c.real, s),
			Arithmetic.multiplication(d, c.imaginary, s),
		)
	],
	[
		// rational × integer
		(r, i, s) => Arithmetic.createRational(
			r.numerator.multiplication(i),
			r.denominator
		)
		,
		// rational × decimal
		(r, d, s) => r.numerator.division(r.denominator, s).multiplication(d, s)
		,
		// rational × rational
		(r1, r2, s) => Arithmetic.createRational(
			r1.numerator.multiplication(r2.numerator),
			r1.denominator.multiplication(r2.denominator)
		)
		,
		// rational × complex
		(r, c, s) => Arithmetic.createComplex(
			Arithmetic.multiplication(r, c.real, s),
			Arithmetic.multiplication(r, c.imaginary, s),
		)
	]
	,
	[
		// complex × integer
		(c, i, s) => Arithmetic.createComplex(
			Arithmetic.multiplication(c.real, i, s),
			Arithmetic.multiplication(c.imaginary, i, s)
		)
		,
		// complex × decimal
		(c, d, s) => Arithmetic.createComplex(
			Arithmetic.multiplication(c.real, d, s),
			Arithmetic.multiplication(c.imaginary, d, s)
		)
		,
		// complex × rational
		(c, r, s) => Arithmetic.createComplex(
			Arithmetic.multiplication(c.real, r, s),
			Arithmetic.multiplication(c.imaginary, r, s)
		)
		,
		// complex × complex
		(c1, c2, s) => Arithmetic.createComplex(
			Arithmetic.addition(
				Arithmetic.multiplication(c1.real, c2.real, s),
				Arithmetic.multiplication(c1.imaginary, c2.imaginary, s).negation(),
				s
			),
			Arithmetic.addition(
				Arithmetic.multiplication(c1.real, c2.imaginary, s),
				Arithmetic.multiplication(c1.imaginary, c2.real, s),
				s
			)
		)
	]
];

Arithmetic.multiplication = (n1, n2, session) => multiplicationMap[n1.type][n2.type](n1, n2, session);

// division

const divisionMap = [
	[
		// integer ÷ integer
		(i1, i2, s) =>
			s.numeric ?
			(i1.remainder(i2).isZero() ? i1.integerDivisionForGCD(i2, s) : i1.division(i2, s)) :
			Arithmetic.createRational(i1, i2)
		,
		// integer ÷ decimal
		(i, d, s) => i.toDecimal(s).division(d, s)
		,
		// integer ÷ rational
		(i, r, s) => Arithmetic.createRational(
			i.multiplication(r.denominator),
			r.numerator
		)
		,
		// integer ÷ complex
		(i, c, s) => {
			let hyp = Arithmetic.addition(
				Arithmetic.multiplication(c.real, c.real, s),
				Arithmetic.multiplication(c.imaginary, c.imaginary, s),
				s
			);
			
			return Arithmetic.createComplex(
				Arithmetic.division(
					Arithmetic.multiplication(i, c.real, s),
					hyp,
					s
				),
				Arithmetic.division(
					Arithmetic.multiplication(i, c.imaginary, s),
					hyp,
					s
				).negation(),
			);
		}
	],
	[
		// decimal ÷ integer
		(d, i, s) => d.division(i.toDecimal(s), s)
		,
		// decimal ÷ decimal
		(d1, d2, s) => d1.division(d2, s)
		,
		// decimal ÷ rational
		(d, r, s) => d.multiplication(r.denominator.toDecimal(s), s).division(r.numerator.toDecimal(s), s)
		,
		// decimal ÷ complex
		(d, c, s) => {
			let hyp = Arithmetic.addition(
				Arithmetic.multiplication(c.real, c.real, s),
				Arithmetic.multiplication(c.imaginary, c.imaginary, s),
				s
			);
			
			return Arithmetic.createComplex(
				Arithmetic.division(
					Arithmetic.multiplication(d, c.real, s),
					hyp,
					s
				),
				Arithmetic.division(
					Arithmetic.multiplication(d, c.imaginary, s),
					hyp,
					s
				).negation(),
			);
		}
	],
	[
		// rational ÷ integer
		(r, i, s) => Arithmetic.createRational(
			r.numerator,
			r.denominator.multiplication(i)
		)
		,
		// rational ÷ decimal
		(r, d, s) => r.toDecimal(s).division(d, s)
		,
		// rational ÷ rational
		(r1, r2, s) => Arithmetic.createRational(
			r1.numerator.multiplication(r2.denominator),
			r1.denominator.multiplication(r2.numerator)
		)
		,
		// rational ÷ complex
		(r, c, s) => {
			let hyp = Arithmetic.addition(
				Arithmetic.multiplication(c.real, c.real, s),
				Arithmetic.multiplication(c.imaginary, c.imaginary, s),
				s
			);
			
			return Arithmetic.createComplex(
				Arithmetic.division(
					Arithmetic.multiplication(r, c.real, s),
					hyp,
					s
				),
				Arithmetic.division(
					Arithmetic.multiplication(r, c.imaginary, s),
					hyp,
					s
				).negation(),
			);
		}
	],
	[
		// complex ÷ integer
		(c, i, s) => Arithmetic.createComplex(
			Arithmetic.division(c.real, i, s),
			Arithmetic.division(c.imaginary, i, s)
		)
		,
		// complex ÷ decimal
		(c, d, s) => Arithmetic.createComplex(
			Arithmetic.division(c.real, d, s),
			Arithmetic.division(c.imaginary, d, s)
		)
		,
		// complex ÷ rational
		(c, r, s) => Arithmetic.createComplex(
			Arithmetic.division(c.real, r, s),
			Arithmetic.division(c.imaginary, r, s)
		)
		,
		// complex ÷ complex
		(c1, c2, s) => {
			let hyp = Arithmetic.addition(
				Arithmetic.multiplication(c2.real, c2.real, s),
				Arithmetic.multiplication(c2.imaginary, c2.imaginary, s),
				s
			);
			
			return Arithmetic.createComplex(
				Arithmetic.division(
					Arithmetic.addition(
						Arithmetic.multiplication(c1.real, c2.real, s),
						Arithmetic.multiplication(c1.imaginary, c2.imaginary, s),
						s
					),
					hyp,
					s
				),
				Arithmetic.division(
					Arithmetic.addition(
						Arithmetic.multiplication(c1.imaginary, c2.real, s),
						Arithmetic.multiplication(c1.real, c2.imaginary, s).negation(),
						s
					),
					hyp,
					s
				),
			);
		}
	]
];

Arithmetic.division = (n1, n2, session) => divisionMap[n1.type][n2.type](n1, n2, session);

// exponentiation

const complexExponentiation = (a, b, s) => {
	let zero = Arithmetic.getDecimalZero(s);
	return complexComplexExponentiation(a, zero, b, zero, s);
};

const complexComplexExponentiation = (a, b, c, d, s) => {
	let r = a.multiplication(a, s).addition(b.multiplication(b, s), s).squareRoot(s);
	let theta = b.aTan2(a, s);
	let f = r.exponentiation(c, s).multiplication(
		d.negation().multiplication(theta, s).exponential(s),
		s
	);
	let arg = d.multiplication(r.naturalLogarithm(s), s).addition(c.multiplication(theta, s), s);
	return Arithmetic.createComplex(
		f.multiplication(arg.cosine(s), s),
		f.multiplication(arg.sine(s), s),
	);
};

const powerOfI = (number, n, s) => {
	let i = n % 4;
	if (i < 0) i += 4;
	
	switch (i) {
		case 0: return number;
		case 1: return Arithmetic.multiplication(number, Complex.getI(s), s);
		case 2: return number.negation();
		case 3: return Arithmetic.multiplication(number, Complex.getI(s).negation(), s);
	}
};

const exponentiationMap = [
	[
		// integer ^ integer
		(i1, i2, s) => (
			!i2.isNegative() ?
			i1.exponentiation(i2) :
			Arithmetic.createRational(
				Arithmetic.getIntegerOne(s),
				i1.exponentiation(i2.negation())
			)
		)
		,
		// integer ^ decimal
		(i, d, s) => (
			i.isNegative() && !d.hasIntegerValue() ?
			complexExponentiation(i.toDecimal(s), d, s) :
			i.toDecimal(s).exponentiation(d, s)
		)
		,
		// integer ^ rational
		(i, r, s) => {
			if (!s.numeric) throw new Arithmetic.NonNumericError();
			let div = r.numerator.toDecimal(s).division(r.denominator.toDecimal(s), s);
			return (
				i.isNegative() ?
				complexExponentiation(i.toDecimal(s), div, s) :
				i.toDecimal(s).exponentiation(div, s)
			);
		}
		,
		// integer ^ complex
		(i, c, s) => {
			if (!s.numeric) throw new Arithmetic.NonNumericError();
			return complexComplexExponentiation(
				i.toDecimal(s),
				Arithmetic.getDecimalZero(s),
				c.real.toDecimal(s),
				c.imaginary.toDecimal(s),
				s
			);
		}
	],
	[
		// decimal ^ integer
		(d, i, s) => d.exponentiation(i.toDecimal(s), s)
		,
		// decimal ^ decimal
		(d1, d2, s) => (
			d1.isNegative() && !d2.hasIntegerValue() ?
			complexExponentiation(d1, d2, s) :
			d1.exponentiation(d2, s)
		)
		,
		// decimal ^ rational
		(d, r, s) => (
			d.isNegative() ?
			complexExponentiation(d, r.toDecimal(s), s) :
			d.exponentiation(r.toDecimal(s), s)
		),
		// decimal ^ complex
		(d, c, s) => complexComplexExponentiation(
			d,
			Arithmetic.getDecimalZero(s),
			c.real.toDecimal(s),
			c.imaginary.toDecimal(s),
			s
		)
	],
	[
		// rational ^ integer
		(r, i, s) => {
			if (!i.isNegative()) {
				return Arithmetic.createRational(
					r.numerator.exponentiation(i),
					r.denominator.exponentiation(i)
				);
			}
			else {
				i = i.negation();
				return Arithmetic.createRational(
					r.denominator.exponentiation(i),
					r.numerator.exponentiation(i)
				);
			}
		}
		,
		// rational ^ decimal
		(r, d, s) => {
			let div = r.numerator.toDecimal(s).division(r.denominator.toDecimal(s), s);
			return (
				r.isNegative() && !d.hasIntegerValue() ?
				complexExponentiation(div, d, s) :
				div.exponentiation(d, s)
			);
		}
		,
		// rational ^ rational
		(r1, r2, s) => {
			if (!s.numeric) throw new Arithmetic.NonNumericError();
			let div1 = r1.numerator.toDecimal(s).division(r1.denominator.toDecimal(s), s);
			let div2 = r2.numerator.toDecimal(s).division(r2.denominator.toDecimal(s), s);
			return (
				r1.isNegative() ?
				complexExponentiation(div1, div2, s) :
				div1.exponentiation(div2, s)
			);
		}
		,
		// rational ^ complex
		(r, c, s) => {
			if (!s.numeric) throw new Arithmetic.NonNumericError();
			return complexComplexExponentiation(
				r.toDecimal(s),
				Arithmetic.getDecimalZero(s),
				c.real.toDecimal(s),
				c.imaginary.toDecimal(s),
				s
			);
		}
	],
	[
		// complex ^ integer
		(c, i, s) => {
			if (c.real.isZero()) {
				return powerOfI(Arithmetic.exponentiation(c.imaginary, i, s), i, s);
			}
			else {
				if (!s.numeric) throw new Arithmetic.NonNumericError();
				return complexComplexExponentiation(
					c.real.toDecimal(s),
					c.imaginary.toDecimal(s),
					i.toDecimal(s),
					Arithmetic.getDecimalZero(s),
					s
				);
			}
		}
		,
		// complex ^ decimal
		(c, d, s) => {
			if (c.real.isZero()) {
				if (d.hasIntegerValue()) {
					let int = d.toInteger(s);
					return powerOfI(Arithmetic.exponentiation(c.imaginary, int, s), int, s);
				}
				else {
					return complexComplexExponentiation(
						Arithmetic.getDecimalZero(s),
						c.imaginary.toDecimal(s),
						d,
						Arithmetic.getDecimalZero(s),
						s
					);
				}
			}
			else {
				return complexComplexExponentiation(
					c.real.toDecimal(s),
					c.imaginary.toDecimal(s),
					d,
					Arithmetic.getDecimalZero(s),
					s
				);
			}
		}
		,
		// complex ^ rational
		(c, r, s) => {
			if (!s.numeric) throw new Arithmetic.NonNumericError();
			complexComplexExponentiation(
				c.real.toDecimal(s),
				c.imaginary.toDecimal(s),
				r.toDecimal(s),
				Arithmetic.getDecimalZero(s),
				s
			);
		}
		,
		// complex ^ complex
		(c1, c2, s) => {
			if (!s.numeric) throw new Arithmetic.NonNumericError();
			complexComplexExponentiation(
				c1.real.toDecimal(s),
				c1.imaginary.toDecimal(s),
				c2.real.toDecimal(s),
				c2.imaginary.toDecimal(s),
				s
			);
		}
	]
];

Arithmetic.exponentiation = (n1, n2, session) => exponentiationMap[n1.type][n2.type](n1, n2, session);

// Div/Mod

const getRemainder = (dividend, divisor, quotient, session) => Arithmetic.addition(
	dividend,
	Arithmetic.multiplication(divisor, quotient, session).negation(),
	session
);

const divModMap = [
	[
		// integer DivMod integer
		(i1, i2, div, mod, s) => {
			let q = i1.integerDivision(i2, s);
			let r = mod ? getRemainder(i1, i2, q, s) : undefined;
			return div && mod ? [ q,  r ] : (div ? q : r);
		}
		,
		// integer DivMod decimal
		(i, d, div, mod, s) => {
			let q = i.toDecimal(s).integerDivision(d, s);
			let r = mod ? getRemainder(i, d, q, s) : undefined;
			return div && mod ? [ q,  r ] : (div ? q : r);
		}
		,
		// integer DivMod rational
		(i, r, div, mod, s) => {
			let quo = i.multiplication(r.denominator).integerDivision(r.numerator, s);
			let rem = mod ? getRemainder(i, r, quo, s) : undefined;
			return div && mod ? [ quo,  rem ] : (div ? quo : rem);
		}
		,
		// integer DivMod complex
		(i, c, div, mod, s) => { throw new Arithmetic.TypeError(); }
	],
	[
		// decimal DivMod integer
		(d, i, div, mod, s) => {
			let q = d.integerDivision(i.toDecimal(s), s);
			let r = mod ? getRemainder(d, i, q, s) : undefined;
			return div && mod ? [ q,  r ] : (div ? q : r);
		}
		,
		// decimal DivMod decimal
		(d1, d2, div, mod, s) => {
			let q = d1.integerDivision(d2, s);
			let r = mod ? getRemainder(d1, d2, q, s) : undefined;
			return div && mod ? [ q,  r ] : (div ? q : r);
		}
		,
		// decimal DivMod rational
		(d, r, div, mod, s) => {
			let quo = d.integerDivision(r.toDecimal(s), s);
			let rem = mod ? getRemainder(d, r, quo, s) : undefined;
			return div && mod ? [ quo,  rem ] : (div ? quo : rem);
		},
		// decimal DivMod complex
		(d, c, div, mod, s) => { throw new Arithmetic.TypeError(); }
	],
	[
		// rational DivMod integer
		(r, i, div, mod, s) => {
			let quo = r.numerator.integerDivision(r.denominator.multiplication(i, s), s);
			let rem = mod ? getRemainder(r, i, quo, s) : undefined;
			return div && mod ? [ quo,  rem ] : (div ? quo : rem);
		}
		,
		// rational DivMod decimal
		(r, d, div, mod, s) => {
			let quo = r.toDecimal(s).integerDivision(d, s);
			let rem = mod ? getRemainder(r, d, quo, s) : undefined;
			return div && mod ? [ quo,  rem ] : (div ? quo : rem);
		}
		,
		// rational DivMod rational
		(r1, r2, div, mod, s) => {
			let q = r1.numerator.multiplication(r2.denominator, s).integerDivision(r1.denominator.multiplication(r2.numerator, s), s);
			let r = mod ? getRemainder(r1, r2, q, s) : undefined;
			return div && mod ? [ q,  r ] : (div ? q : r);
		}
		,
		// rational DivMod complex
		(r, c, div, mod, s) => { throw new Arithmetic.TypeError(); }
	],
	[
		// complex DivMod integer
		(c, i, div, mod, s) => { throw new Arithmetic.TypeError(); }
		,
		// complex DivMod decimal
		(c, d, div, mod, s) => { throw new Arithmetic.TypeError(); }
		,
		// complex DivMod rational
		(c, r, div, mod, s) => { throw new Arithmetic.TypeError(); }
		,
		// complex DivMod complex
		(c1, c2, div, mod, s) => { throw new Arithmetic.TypeError(); }
	]
];

Arithmetic.divMod = (n1, n2, div, mod, session) => divModMap[n1.type][n2.type](n1, n2, div, mod, session);

// Complex trigonometric and hyperbolic functions

const sineMap = [
	(i, s) => i.toDecimal(s).sine(s), // sine integer
	(d, s) => d.sine(s),              // sine decimal
	(r, s) => r.toDecimal(s).sine(s), // sine rational
	(c, s) => {                       // sine complex
		let a = c.real.toDecimal(s);
		let b = c.imaginary.toDecimal(s);
		return new Complex(
			a.sine(s).multiplication(b.hyperbolicCosine(s), s),
			a.cosine(s).multiplication(b.hyperbolicSine(s), s)
		)
	}
];

Arithmetic.sine = (n, session) => sineMap[n.type](n, session);

const cosineMap = [
	(i, s) => i.toDecimal(s).cosine(s), // cosine integer
	(d, s) => d.cosine(s),              // cosine decimal
	(r, s) => r.toDecimal(s).cosine(s), // cosine rational
	(c, s) => {                         // cosine complex
		let a = c.real.toDecimal(s);
		let b = c.imaginary.toDecimal(s);
		return new Complex(
			a.cosine(s).multiplication(b.hyperbolicCosine(s), s),
			a.sine(s).multiplication(b.hyperbolicSine(s), s).negation()
		)
	}
];

Arithmetic.cosine = (n, session) => cosineMap[n.type](n, session);

const tangentMap = [
	(i, s) => i.toDecimal(s).tangent(s), // tangent integer
	(d, s) => d.tangent(s),              // tangent decimal
	(r, s) => r.toDecimal(s).tangent(s), // tangent rational
	(c, s) => {                          // tangent complex
		let a = c.real.toDecimal(s);
		let b = c.imaginary.toDecimal(s);
		let sina = a.sine(s);
		let cosa = a.cosine(s);
		let sinhb = b.hyperbolicSine(s);
		let coshb = b.hyperbolicCosine(s);
		return Arithmetic.division(
			new Complex(
				sina.multiplication(coshb, s),
				cosa.multiplication(sinhb, s)
			),
			new Complex(
				cosa.multiplication(coshb, s),
				sina.multiplication(sinhb, s).negation()
			),
			s
		);
	}
];

Arithmetic.tangent = (n, session) => tangentMap[n.type](n, session);

const cotangentMap = [
	(i, s) => i.toDecimal(s).tangent(s).inverse(s), // cotangent integer
	(d, s) => d.tangent(s).inverse(s),              // cotangent decimal
	(r, s) => r.toDecimal(s).tangent(s).inverse(s), // cotangent rational
	(c, s) => {                                     // cotangent complex
		let a = c.real.toDecimal(s);
		let b = c.imaginary.toDecimal(s);
		let sina = a.sine(s);
		let cosa = a.cosine(s);
		let sinhb = b.hyperbolicSine(s);
		let coshb = b.hyperbolicCosine(s);
		return Arithmetic.division(
			new Complex(
				cosa.multiplication(coshb, s),
				sina.multiplication(sinhb, s).negation()
			),
			new Complex(
				sina.multiplication(coshb, s),
				cosa.multiplication(sinhb, s)
			),
			s
		);
	}
];

Arithmetic.cotangent = (n, session) => cotangentMap[n.type](n, session);

const secantMap = [
	(i, s) => i.toDecimal(s).cosine(s).inverse(s), // secant integer
	(d, s) => d.cosine(s).inverse(s),              // secant decimal
	(r, s) => r.toDecimal(s).cosine(s).inverse(s), // secant rational
	(c, s) => {                                    // secant complex
		let a = c.real.toDecimal(s);
		let b = c.imaginary.toDecimal(s);
		let sina = a.sine(s);
		let cosa = a.cosine(s);
		let sinhb = b.hyperbolicSine(s);
		let coshb = b.hyperbolicCosine(s);
		let d = Arithmetic.square(cosa, s).multiplication(Arithmetic.square(coshb, s), s).addition(
			Arithmetic.square(sina, s).multiplication(Arithmetic.square(sinhb, s), s)
		);
		return new Complex(
			cosa.multiplication(coshb, s).division(d, s),
			sina.multiplication(sinhb, s).division(d, s)
		);
	}
];

Arithmetic.secant = (n, session) => secantMap[n.type](n, session);

const cosecantMap = [
	(i, s) => i.toDecimal(s).sine(s).inverse(s), // cosecant integer
	(d, s) => d.sine(s).inverse(s),              // cosecant decimal
	(r, s) => r.toDecimal(s).sine(s).inverse(s), // cosecant rational
	(c, s) => {                                  // cosecant complex
		let a = c.real.toDecimal(s);
		let b = c.imaginary.toDecimal(s);
		let sina = a.sine(s);
		let cosa = a.cosine(s);
		let sinhb = b.hyperbolicSine(s);
		let coshb = b.hyperbolicCosine(s);
		let d = Arithmetic.square(sina, s).multiplication(Arithmetic.square(coshb, s), s).addition(
			Arithmetic.square(cosa, s).multiplication(Arithmetic.square(sinhb, s), s)
		);
		return new Complex(
			sina.multiplication(coshb, s).division(d, s),
			cosa.multiplication(sinhb, s).division(d, s).negation()
		);
	}
];

Arithmetic.cosecant = (n, session) => cosecantMap[n.type](n, session);

const inverseSineMap = [
	(i, s) => i.toDecimal(s).inverseSine(s), // inverse sine integer
	(d, s) => d.inverseSine(s),              // inverse sine decimal
	(r, s) => r.toDecimal(s).inverseSine(s), // inverse sine rational
	(c, s) => {                              // inverse sine complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.inverseSine = (n, session) => inverseSineMap[n.type](n, session);

const inverseCosineMap = [
	(i, s) => i.toDecimal(s).inverseCosine(s), // inverse cosine integer
	(d, s) => d.inverseCosine(s),              // inverse cosine decimal
	(r, s) => r.toDecimal(s).inverseCosine(s), // inverse cosine rational
	(c, s) => {                                // inverse cosine complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.inverseCosine = (n, session) => inverseCosineMap[n.type](n, session);

const inverseTangentMap = [
	(i, s) => i.toDecimal(s).inverseTangent(s), // inverse tangent integer
	(d, s) => d.inverseTangent(s),              // inverse tangent decimal
	(r, s) => r.toDecimal(s).inverseTangent(s), // inverse tangent rational
	(c, s) => {                                 // inverse tangent complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.inverseTangent = (n, session) => inverseTangentMap[n.type](n, session);

const inverseCotangentMap = [
	(i, s) => i.toDecimal(s).inverse(s).inverseTangent(s), // inverse cotangent integer
	(d, s) => d.inverse(s).inverseTangent(s),              // inverse cotangent decimal
	(r, s) => r.toDecimal(s).inverse(s).inverseTangent(s), // inverse cotangent rational
	(c, s) => {                                            // inverse cotangent complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.inverseCotangent = (n, session) => inverseCotangentMap[n.type](n, session);

const inverseSecantMap = [
	(i, s) => i.toDecimal(s).inverse(s).inverseCosine(s), // inverse secant integer
	(d, s) => d.inverse(s).inverseCosine(s),              // inverse secant decimal
	(r, s) => r.toDecimal(s).inverse(s).inverseCosine(s), // inverse secant rational
	(c, s) => {                                           // inverse secant complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.inverseSecant = (n, session) => inverseSecantMap[n.type](n, session);

const inverseCosecantMap = [
	(i, s) => i.toDecimal(s).inverse(s).inverseSine(s), // inverse cosecant integer
	(d, s) => d.inverse(s).inverseSine(s),              // inverse cosecant decimal
	(r, s) => r.toDecimal(s).inverse(s).inverseSine(s), // inverse cosecant rational
	(c, s) => {                                         // inverse cosecant complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.inverseCosecant = (n, session) => inverseCosecantMap[n.type](n, session);

const hyperbolicSineMap = [
	(i, s) => i.toDecimal(s).hyperbolicSine(s), // hyperbolic sine integer
	(d, s) => d.hyperbolicSine(s),              // hyperbolic sine decimal
	(r, s) => r.toDecimal(s).hyperbolicSine(s), // hyperbolic sine rational
	(c, s) => {                                 // hyperbolic sine complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.hyperbolicSine = (n, session) => hyperbolicSineMap[n.type](n, session);

const hyperbolicCosineMap = [
	(i, s) => i.toDecimal(s).hyperbolicCosine(s), // hyperbolic cosine integer
	(d, s) => d.hyperbolicCosine(s),              // hyperbolic cosine decimal
	(r, s) => r.toDecimal(s).hyperbolicCosine(s), // hyperbolic cosine rational
	(c, s) => {                                   // hyperbolic cosine complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.hyperbolicCosine = (n, session) => hyperbolicCosineMap[n.type](n, session);

const hyperbolicTangentMap = [
	(i, s) => i.toDecimal(s).hyperbolicTangent(s), // hyperbolic tangent integer
	(d, s) => d.hyperbolicTangent(s),              // hyperbolic tangent decimal
	(r, s) => r.toDecimal(s).hyperbolicTangent(s), // hyperbolic tangent rational
	(c, s) => {                                    // hyperbolic tangent complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.hyperbolicTangent = (n, session) => hyperbolicTangentMap[n.type](n, session);

const hyperbolicCotangentMap = [
	(i, s) => i.toDecimal(s).hyperbolicTangent(s).inverse(s), // hyperbolic cotangent integer
	(d, s) => d.hyperbolicTangent(s).inverse(s),              // hyperbolic cotangent decimal
	(r, s) => r.toDecimal(s).hyperbolicTangent(s).inverse(s), // hyperbolic cotangent rational
	(c, s) => {                                               // hyperbolic cotangent complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.hyperbolicCotangent = (n, session) => hyperbolicCotangentMap[n.type](n, session);

const hyperbolicSecantMap = [
	(i, s) => i.toDecimal(s).hyperbolicCosine(s).inverse(s), // hyperbolic secant integer
	(d, s) => d.hyperbolicCosine(s).inverse(s),              // hyperbolic secant decimal
	(r, s) => r.toDecimal(s).hyperbolicCosine(s).inverse(s), // hyperbolic secant rational
	(c, s) => {                                              // hyperbolic secant complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.hyperbolicSecant = (n, session) => hyperbolicSecantMap[n.type](n, session);

const hyperbolicCosecantMap = [
	(i, s) => i.toDecimal(s).hyperbolicSine(s).inverse(s), // hyperbolic cosecant integer
	(d, s) => d.hyperbolicSine(s).inverse(s),              // hyperbolic cosecant decimal
	(r, s) => r.toDecimal(s).hyperbolicSine(s).inverse(s), // hyperbolic cosecant rational
	(c, s) => {                                            // hyperbolic cosecant complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.hyperbolicCosecant = (n, session) => hyperbolicCosecantMap[n.type](n, session);

const inverseHyperbolicSineMap = [
	(i, s) => i.toDecimal(s).inverseHyperbolicSine(s), // inverse hyperbolic sine integer
	(d, s) => d.inverseHyperbolicSine(s),              // inverse hyperbolic sine decimal
	(r, s) => r.toDecimal(s).inverseHyperbolicSine(s), // inverse hyperbolic sine rational
	(c, s) => {                                        // inverse hyperbolic sine complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.inverseHyperbolicSine = (n, session) => inverseHyperbolicSineMap[n.type](n, session);

const inverseHyperbolicCosineMap = [
	(i, s) => i.toDecimal(s).inverseHyperbolicCosine(s), // inverse hyperbolic cosine integer
	(d, s) => d.inverseHyperbolicCosine(s),              // inverse hyperbolic cosine decimal
	(r, s) => r.toDecimal(s).inverseHyperbolicCosine(s), // inverse hyperbolic cosine rational
	(c, s) => {                                          // inverse hyperbolic cosine complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.inverseHyperbolicCosine = (n, session) => inverseHyperbolicCosineMap[n.type](n, session);

const inverseHyperbolicTangentMap = [
	(i, s) => i.toDecimal(s).inverseHyperbolicTangent(s), // inverse hyperbolic tangent integer
	(d, s) => d.inverseHyperbolicTangent(s),              // inverse hyperbolic tangent decimal
	(r, s) => r.toDecimal(s).inverseHyperbolicTangent(s), // inverse hyperbolic tangent rational
	(c, s) => {                                           // inverse hyperbolic tangent complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.inverseHyperbolicTangent = (n, session) => inverseHyperbolicTangentMap[n.type](n, session);

const inverseHyperbolicCotangentMap = [
	(i, s) => i.toDecimal(s).inverse(s).inverseHyperbolicTangent(s), // inverse hyperbolic cotangent integer
	(d, s) => d.inverse(s).inverseHyperbolicTangent(s),              // inverse hyperbolic cotangent decimal
	(r, s) => r.toDecimal(s).inverse(s).inverseHyperbolicTangent(s), // inverse hyperbolic cotangent rational
	(c, s) => {                                                      // inverse hyperbolic cotangent complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.inverseHyperbolicCotangent = (n, session) => inverseHyperbolicCotangentMap[n.type](n, session);

const inverseHyperbolicSecantMap = [
	(i, s) => i.toDecimal(s).inverse(s).inverseHyperbolicCosine(s), // inverse hyperbolic secant integer
	(d, s) => d.inverse(s).inverseHyperbolicCosine(s),              // inverse hyperbolic secant decimal
	(r, s) => r.toDecimal(s).inverse(s).inverseHyperbolicCosine(s), // inverse hyperbolic secant rational
	(c, s) => {                                                     // inverse hyperbolic secant complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.inverseHyperbolicSecant = (n, session) => inverseHyperbolicSecantMap[n.type](n, session);

const inverseHyperbolicCosecantMap = [
	(i, s) => i.toDecimal(s).inverse(s).inverseHyperbolicSine(s), // inverse hyperbolic cosecant integer
	(d, s) => d.inverse(s).inverseHyperbolicSine(s),              // inverse hyperbolic cosecant decimal
	(r, s) => r.toDecimal(s).inverse(s).inverseHyperbolicSine(s), // inverse hyperbolic cosecant rational
	(c, s) => {                                                   // inverse hyperbolic cosecant complex
		throw new Arithmetic.UnimplementedError();
	}
];

Arithmetic.inverseHyperbolicCosecant = (n, session) => inverseHyperbolicCosecantMap[n.type](n, session);

// random

Arithmetic.getRandom = (precision, session) => session.arbitrary ? Decimal.getRandom(precision, session) : NumberD.getRandom();

//////////////////////
// internal numbers //
//////////////////////

Arithmetic.createInternalNumber = (n, session) => {
	let internalNumber = Formulae.createExpression("Math.InternalNumber");
	
	/*
	/////////////////
	conversion: {
		if (session.numeric && n.type !== 1) { // integer, rational or complex
			n = n.toDecimal(session);
			break conversion;
		}
	}
	/////////////////
	*/
	
	internalNumber.set("Value", n);
	return internalNumber;
};

////////////////////////////////////////////////////////
// Retrieving native numbers from internal expression //
////////////////////////////////////////////////////////

Arithmetic.getNativeInteger = expr => {
	if (!expr.isInternalNumber()) return undefined;
	
	let number = expr.get("Value");
	
	if (number instanceof NumberI) return number.valueOf();
	if (number instanceof NumberD && Number.isInteger(number)) return number.valueOf();
	//if ((typeof number) === "bigint" && number >= Number.MIN_SAFE_INTEGER && number <= Number.MAX_SAFE_INTEGER) return Number(number);
	if (number.constructor === BigInt && number >= Number.MIN_SAFE_INTEGER && number <= Number.MAX_SAFE_INTEGER) return Number(number);
	if (
		number instanceof Decimal &&
		number.isInteger() &&
		number.comparedTo(Number.MIN_SAFE_INTEGER) >= 0 &&
		number.comparedTo(Number.MAX_SAFE_INTEGER) <= 0
	) return number.toNumber();
	
	return undefined;
};




Arithmetic.getNativeNumber = expr => {
	if (!expr.isInternalNumber()) return undefined;
	let number = expr.get("Value");
	
	if (number instanceof NumberI) return number.valueOf();
	if (number instanceof NumberD) return number.valueOf();
	if (number instanceof BigInt) return Number(number);
	if (number instanceof Decimal) return number.toNumber();
	
	return undefined;
};

Arithmetic.getNativeBigInteger = expr => {
	if (!expr.isInternalNumber()) return undefined;
	let number = expr.get("Value");
	
	if (number instanceof NumberI) return BigInt(number.valueOf());
	if (number instanceof NumberD && Number.isInteger(number)) return BigInt(number.valueOf());
	if (number instanceof BigInt) return number;
	if (number instanceof Decimal && number.isInteger()) return BigInt(number.toFixed());
	
	return undefined;
};




Arithmetic.getInteger = expr => {
	if (!expr.isInternalNumber()) return undefined;
	let value = expr.get("Value");
	if (!Arithmetic.isInteger(value)) return undefined;
	return value;
};

Arithmetic.getDecimal = expr => {
	if (!expr.isInternalNumber()) return undefined;
	expr = expr.get("Value");
	if (!Arithmetic.isDecimal(expr)) return undefined;
	return expr;
};

/*
Arithmetic.getNativeDecimal = expr => {
};

Arithmetic.getNativeBigInteger = expr => {
};

Arithmetic.getNativeBigDecimal = expr => {
};
*/

/////////////////////////////////////////////////////
// Retrieving internal numbers from native numbers //
/////////////////////////////////////////////////////

Arithmetic.createInteger = (n, session) => {
	//switch (typeof n) {
	//	case "number":
	//		if (!Number.isInteger(n)) throw new Arithmetic.ConversionError();
	//		break;
	//	
	//	case "bigint":
	//		if (!session.arbitrary && (n < Number.MIN_SAFE_INTEGER || n > Number.MAX_SAFE_INTEGER)) throw new Arithmetic.ConversionError();;
	//		break
	//}
	
	if (n.constructor === Number) {
		if (!Number.isInteger(n)) throw new Arithmetic.ConversionError();
	}
	
	if (n.constructor === BigInt) {
		if (!session.arbitrary && (n < Number.MIN_SAFE_INTEGER || n > Number.MAX_SAFE_INTEGER)) throw new Arithmetic.ConversionError();;
	}
	
	return session.arbitrary ? BigInt(n) : new NumberI(n);
};

Arithmetic.createDecimal = (n, session) => {
	return session.arbitrary ? new session.Decimal(n) : new NumberD(n);
};

