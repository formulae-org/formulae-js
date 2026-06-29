/*
Fōrmulæ canvas-to-SVG context shim.
Copyright (C) 2015-2026 Laurence R. Ugalde

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

"use strict";

/*
	An object that mimics the subset of the CanvasRenderingContext2D API that the
	Fōrmulæ expression engine uses while drawing (display()), but instead of
	painting pixels it accumulates SVG elements. Pass it as the "context" to an
	expression's display() to obtain a vector rendering.

	Text measurement (measureText) and font state are delegated to a real 2D
	context, because layout (prepareDisplay) depends on accurate metrics. The
	transform is restricted to translate/scale (the only transforms the display
	path uses); every emitted coordinate is baked through the current matrix, so
	no <g transform> wrapping is needed.
*/

class SVGContext {
	constructor(measureContext) {
		this.measureContext = measureContext; // real 2D context, for measureText / font metrics

		this.elements = []; // accumulated SVG element strings

		// graphics state
		this._fillStyle   = "black";
		this._strokeStyle = "black";
		this._lineWidth   = 1;
		this._textBaseline = "alphabetic";
		this._font = "10px sans-serif";
		this._matrix = [ 1, 0, 0, 1, 0, 0 ]; // [a, b, c, d, e, f]

		this.stack = [];

		// current path, in device (already transformed) coordinates
		this.pathData = "";

		// carrier properties read/written by the engine
		this.fontInfo = null;
		this.imageSmoothingEnabled = false;
		this.canvas = { width: 0, height: 0, style: {} };
	}

	//////////////////
	// font / styles //
	//////////////////

	get font() { return this._font; }
	set font(value) {
		this._font = value;
		this.measureContext.font = value; // keep measurement accurate
	}

	get textBaseline() { return this._textBaseline; }
	set textBaseline(value) { this._textBaseline = value; }

	get fillStyle() { return this._fillStyle; }
	set fillStyle(value) { this._fillStyle = value; }

	get strokeStyle() { return this._strokeStyle; }
	set strokeStyle(value) { this._strokeStyle = value; }

	get lineWidth() { return this._lineWidth; }
	set lineWidth(value) { this._lineWidth = value; }

	measureText(text) {
		this.measureContext.font = this._font;
		return this.measureContext.measureText(text);
	}

	//////////////////
	// state stack  //
	//////////////////

	save() {
		this.stack.push({
			matrix:       this._matrix.slice(),
			fillStyle:    this._fillStyle,
			strokeStyle:  this._strokeStyle,
			lineWidth:    this._lineWidth,
			textBaseline: this._textBaseline,
			font:         this._font
		});
	}

	restore() {
		let s = this.stack.pop();
		if (s === undefined) return;
		this._matrix       = s.matrix;
		this._fillStyle    = s.fillStyle;
		this._strokeStyle  = s.strokeStyle;
		this._lineWidth    = s.lineWidth;
		this._textBaseline = s.textBaseline;
		this._font         = s.font;
		this.measureContext.font = s.font;
	}

	//////////////////
	// transforms   //
	//////////////////

	// this._matrix = this._matrix * [a, b, c, d, e, f]
	_multiply(a, b, c, d, e, f) {
		let m = this._matrix;
		this._matrix = [
			m[0] * a + m[2] * b,
			m[1] * a + m[3] * b,
			m[0] * c + m[2] * d,
			m[1] * c + m[3] * d,
			m[0] * e + m[2] * f + m[4],
			m[1] * e + m[3] * f + m[5]
		];
	}

	translate(x, y) { this._multiply(1, 0, 0, 1, x, y); }
	scale(x, y)     { this._multiply(x, 0, 0, y, 0, 0); }
	transform(a, b, c, d, e, f) { this._multiply(a, b, c, d, e, f); }
	setTransform(a, b, c, d, e, f) { this._matrix = [ a, b, c, d, e, f ]; }
	resetTransform() { this._matrix = [ 1, 0, 0, 1, 0, 0 ]; }

	// map a user-space point to device space through the current matrix
	_pt(x, y) {
		let m = this._matrix;
		return [ m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5] ];
	}

	// approximate scalar scale factors of the current matrix
	_sx() { let m = this._matrix; return Math.hypot(m[0], m[1]); }
	_sy() { let m = this._matrix; return Math.hypot(m[2], m[3]); }

	//////////////////
	// paths        //
	//////////////////

	beginPath() { this.pathData = ""; }

	moveTo(x, y) { let p = this._pt(x, y); this.pathData += "M" + fmt(p[0]) + " " + fmt(p[1]) + " "; }
	lineTo(x, y) { let p = this._pt(x, y); this.pathData += "L" + fmt(p[0]) + " " + fmt(p[1]) + " "; }

	quadraticCurveTo(cpx, cpy, x, y) {
		let c = this._pt(cpx, cpy), p = this._pt(x, y);
		this.pathData += "Q" + fmt(c[0]) + " " + fmt(c[1]) + " " + fmt(p[0]) + " " + fmt(p[1]) + " ";
	}

	bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
		let a = this._pt(c1x, c1y), b = this._pt(c2x, c2y), p = this._pt(x, y);
		this.pathData += "C" + fmt(a[0]) + " " + fmt(a[1]) + " " + fmt(b[0]) + " " + fmt(b[1]) + " " + fmt(p[0]) + " " + fmt(p[1]) + " ";
	}

	arc(cx, cy, r, startAngle, endAngle, anticlockwise = false) {
		let rx = r * this._sx(), ry = r * this._sy();
		let s = this._pt(cx + r * Math.cos(startAngle), cy + r * Math.sin(startAngle));
		let e = this._pt(cx + r * Math.cos(endAngle),   cy + r * Math.sin(endAngle));

		let delta = endAngle - startAngle;
		if (!anticlockwise && delta < 0) delta += 2 * Math.PI;
		if ( anticlockwise && delta > 0) delta -= 2 * Math.PI;

		let largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
		let sweep = anticlockwise ? 0 : 1;

		if (this.pathData === "") this.pathData += "M" + fmt(s[0]) + " " + fmt(s[1]) + " ";
		else this.pathData += "L" + fmt(s[0]) + " " + fmt(s[1]) + " ";

		this.pathData += "A" + fmt(rx) + " " + fmt(ry) + " 0 " + largeArc + " " + sweep + " " + fmt(e[0]) + " " + fmt(e[1]) + " ";
	}

	rect(x, y, w, h) {
		this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath();
	}

	closePath() { this.pathData += "Z "; }

	fill(path) {
		let d = this._resolvePath(path);
		if (d === null) return;
		this.elements.push("<path d=\"" + d.trim() + "\" fill=\"" + esc(this._fillStyle) + "\"/>");
	}

	stroke(path) {
		let d = this._resolvePath(path);
		if (d === null) return;
		this.elements.push(
			"<path d=\"" + d.trim() + "\" fill=\"none\" stroke=\"" + esc(this._strokeStyle) +
			"\" stroke-width=\"" + fmt(this._lineWidth * this._sx()) + "\"/>"
		);
	}

	// a Path2D argument carries SVG path data registered when it was built;
	// no argument means use the accumulated current path
	_resolvePath(path) {
		if (path === undefined) return this.pathData;
		if (typeof SVGContext.path2DData !== "undefined") {
			let d = SVGContext.path2DData.get(path);
			if (d !== undefined) return d;
		}
		console.warn("SVGContext: Path2D without registered path data; skipped");
		return null;
	}

	//////////////////
	// rectangles   //
	//////////////////

	fillRect(x, y, w, h) {
		let r = this._rect(x, y, w, h);
		this.elements.push(
			"<rect x=\"" + fmt(r.x) + "\" y=\"" + fmt(r.y) + "\" width=\"" + fmt(r.w) +
			"\" height=\"" + fmt(r.h) + "\" fill=\"" + esc(this._fillStyle) + "\"/>"
		);
	}

	strokeRect(x, y, w, h) {
		let r = this._rect(x, y, w, h);
		this.elements.push(
			"<rect x=\"" + fmt(r.x) + "\" y=\"" + fmt(r.y) + "\" width=\"" + fmt(r.w) +
			"\" height=\"" + fmt(r.h) + "\" fill=\"none\" stroke=\"" + esc(this._strokeStyle) +
			"\" stroke-width=\"" + fmt(this._lineWidth * this._sx()) + "\"/>"
		);
	}

	clearRect() { /* transparent background: nothing to do */ }

	_rect(x, y, w, h) {
		let p0 = this._pt(x, y), p1 = this._pt(x + w, y + h);
		return {
			x: Math.min(p0[0], p1[0]),
			y: Math.min(p0[1], p1[1]),
			w: Math.abs(p1[0] - p0[0]),
			h: Math.abs(p1[1] - p0[1])
		};
	}

	//////////////////
	// text         //
	//////////////////

	fillText(text, x, y) {
		let p = this._pt(x, y);
		let f = parseFont(this._font);
		// Emit at the alphabetic baseline (the one baseline renderers agree on), converting
		// from the canvas textBaseline via the font metrics. dominant-baseline="text-after-edge"
		// is implemented inconsistently and does not match canvas "bottom".
		let baselineY = p[1] + this._baselineShift(text);
		let attrs =
			"x=\"" + fmt(p[0]) + "\" y=\"" + fmt(baselineY) + "\"" +
			" font-family=\"" + esc(f.family) + "\" font-size=\"" + esc(f.size) + "\"" +
			(f.weight !== "normal" ? " font-weight=\"" + f.weight + "\"" : "") +
			(f.style  !== "normal" ? " font-style=\""  + f.style  + "\"" : "") +
			" fill=\"" + esc(this._fillStyle) + "\"";
		this.elements.push("<text " + attrs + ">" + esc(text) + "</text>");
	}

	// vertical shift (px) from the current canvas textBaseline to the SVG alphabetic baseline
	_baselineShift(text) {
		this.measureContext.font = this._font;
		let m = this.measureContext.measureText(text || "M");
		let asc  = m.fontBoundingBoxAscent;
		let desc = m.fontBoundingBoxDescent;
		if (asc === undefined || desc === undefined) { // older engines: approximate
			let size = (this.fontInfo && this.fontInfo.size) || parseFloat(parseFont(this._font).size) || 16;
			asc = size * 0.8;
			desc = size * 0.2;
		}
		switch (this._textBaseline) {
			case "top":         return asc;
			case "hanging":     return asc * 0.8;
			case "middle":      return (asc - desc) / 2;
			case "ideographic": return -desc;
			case "bottom":      return -desc;
			default:            return 0; // alphabetic
		}
	}

	strokeText(text, x, y) { this.fillText(text, x, y); }

	//////////////////
	// images       //
	//////////////////

	// Only RasterGraphics reaches here in the display path; it passes a canvas.
	drawImage(image, dx, dy, dw, dh) {
		let href;
		try { href = (typeof image.toDataURL === "function") ? image.toDataURL("image/png") : null; }
		catch (e) { href = null; }
		if (href === null) return;

		if (dw === undefined) { dw = image.width; dh = image.height; }
		let r = this._rect(dx, dy, dw, dh);
		this.elements.push(
			"<image x=\"" + fmt(r.x) + "\" y=\"" + fmt(r.y) + "\" width=\"" + fmt(r.w) +
			"\" height=\"" + fmt(r.h) + "\" href=\"" + esc(href) + "\"/>"
		);
	}

	//////////////////
	// output       //
	//////////////////

	toSVG(width, height) {
		return (
			"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"" + fmt(width) + "\" height=\"" + fmt(height) +
			"\" viewBox=\"0 0 " + fmt(width) + " " + fmt(height) + "\">" +
			this.elements.join("") +
			"</svg>"
		);
	}

	toDataURL(width, height) {
		return "data:image/svg+xml," + encodeURIComponent(this.toSVG(width, height));
	}
}

// registry mapping a Path2D object to the SVG path-data string it was built from
SVGContext.path2DData = new WeakMap();

///////////////
// helpers   //
///////////////

function fmt(n) {
	if (!isFinite(n)) return "0";
	return (Math.round(n * 1000) / 1000).toString();
}

function esc(s) {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

// canvas textBaseline -> SVG dominant-baseline
function baselineToSVG(baseline) {
	switch (baseline) {
		case "top":         return "text-before-edge";
		case "hanging":     return "hanging";
		case "middle":      return "central";
		case "alphabetic":  return "alphabetic";
		case "ideographic": return "ideographic";
		case "bottom":      return "text-after-edge";
		default:            return "alphabetic";
	}
}

// parse a CSS font shorthand like "italic bold 16px serif"
function parseFont(font) {
	let style = "normal", weight = "normal", size = "16px", family = "serif";
	let parts = String(font).trim().split(/\s+/);
	let i = 0;
	for (; i < parts.length; ++i) {
		let p = parts[i];
		if (/^\d/.test(p) || p.endsWith("px") || p.endsWith("pt") || p.endsWith("em") || p.endsWith("%")) break;
		if (p === "italic" || p === "oblique") style = p;
		else if (p === "bold" || /^\d{3}$/.test(p) || p === "bolder" || p === "lighter") weight = p;
		// "normal" and other tokens are ignored
	}
	if (i < parts.length) { size = parts[i]; ++i; }
	if (i < parts.length) family = parts.slice(i).join(" ");
	return { style, weight, size, family };
}
