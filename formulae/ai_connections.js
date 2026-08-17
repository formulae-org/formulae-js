/*
Fōrmulæ AI connections manager.
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

Formulae.AI = Formulae.AI || {};

// Escape HTML for safe insertion into innerHTML
Formulae.AI._esc = s => String(s)
	.replace(/&/g, "&amp;")
	.replace(/</g, "&lt;")
	.replace(/>/g, "&gt;")
	.replace(/"/g, "&quot;");

// Media expression tags whose Value/Format attributes contain binary data
Formulae.AI.MEDIA_TAGS = new Set(["Graphics.RasterGraphics", "Audio.WaveformAudio"]);

// localStorage keys
const AI_CONNECTIONS_KEY    = "aiConnections";
const AI_ACTIVE_ID_KEY      = "aiActiveConnectionId";

// In-memory state
Formulae.AI.connections         = [];
Formulae.AI.activeConnectionId  = null;
Formulae.AI._primerText         = null;
Formulae.AI._sessionStarted     = false;

Formulae.AI._load = function() {
	try {
		let raw = window.localStorage.getItem(AI_CONNECTIONS_KEY);
		Formulae.AI.connections = raw ? JSON.parse(raw) : [];
	}
	catch (e) {
		Formulae.AI.connections = [];
	}
	Formulae.AI.activeConnectionId = window.localStorage.getItem(AI_ACTIVE_ID_KEY) || null;
};

Formulae.AI._save = function() {
	window.localStorage.setItem(AI_CONNECTIONS_KEY, JSON.stringify(Formulae.AI.connections));
	if (Formulae.AI.activeConnectionId !== null) {
		window.localStorage.setItem(AI_ACTIVE_ID_KEY, Formulae.AI.activeConnectionId);
	}
	else {
		window.localStorage.removeItem(AI_ACTIVE_ID_KEY);
	}
};

Formulae.AI.getActiveProvider = function() {
	if (!Formulae.AI.activeConnectionId) return null;
	let connection = Formulae.AI.connections.find(c => c.id === Formulae.AI.activeConnectionId);
	if (!connection) return null;
	let provider = Formulae.AI.providers?.find(p => p.getProviderName() === connection.providerName);
	if (!provider) return null;
	return { provider, connection };
};

Formulae.AI._getPrimer = async function() {
	if (Formulae.AI._primerText === null) {
		let response = await fetch("formulae/ai_primer.md");
		Formulae.AI._primerText = await response.text();
	}
	return Formulae.AI._primerText;
};

Formulae.AI.extractMedia = function(xmlString) {
	let doc = new DOMParser().parseFromString(xmlString, "text/xml");
	let mediaMap = {};
	let counter = 0;
	doc.querySelectorAll("expression").forEach(el => {
		if (Formulae.AI.MEDIA_TAGS.has(el.getAttribute("tag"))) {
			let data = el.getAttribute("Value");
			if (data) {
				let ref = `media-${counter++}`;
				mediaMap[ref] = { data, format: el.getAttribute("Format") };
				el.removeAttribute("Value");
				el.removeAttribute("Format");
				el.setAttribute("MediaRef", ref);
			}
		}
	});
	return { strippedXml: new XMLSerializer().serializeToString(doc), mediaMap };
};

Formulae.AI.reinsertMedia = function(xmlString, mediaMap) {
	if (Object.keys(mediaMap).length === 0 && !xmlString.includes("MediaRef=")) return xmlString;
	let doc = new DOMParser().parseFromString(xmlString, "text/xml");
	doc.querySelectorAll("expression[MediaRef]").forEach(el => {
		let ref = el.getAttribute("MediaRef");
		let media = mediaMap[ref];
		if (media) {
			el.setAttribute("Value", media.data);
			if (media.format) el.setAttribute("Format", media.format);
			el.removeAttribute("MediaRef");
		}
		else if (ref && ref.startsWith("gen-")) {
			el.parentNode?.removeChild(el);
		}
	});
	return new XMLSerializer().serializeToString(doc);
};

// ─── Tier 1: structural response validation ────────────────────────────────
//
// Whether an arbitrary combination of expression + subexpressions is
// *meaningful* is undecidable in general -- see "Why this is a limitation,
// not a scoping gap" in wip/converse/svg graphics/svg graphics.md. What IS
// decidable, and what Formulae.xmlToExpression already checks for every
// node as it deserializes (recursively -- the same parse used to actually
// display a response): does the tag exist, is the child count right for
// that tag, do the serialization attributes parse. This section re-checks
// exactly that, nothing more, plus two things that are still pure syntax,
// not semantics: the response's top-level tag must be one of ai_primer.md's
// "AI response structure" list, and (unlike the general case) a
// Graphics.VectorGraphics "Value" attribute must itself be well-formed
// SVG/XML -- Fōrmulæ's own deserializer treats that attribute as an opaque
// string and has no visibility into it, but well-formedness of embedded XML
// is exactly as checkable as well-formedness of the outer XML.

// Keep in sync with ai_primer.md's "AI response structure" section.
Formulae.AI.RESPONSE_WRAPPER_TAGS = new Set([
	"Typesetting.Paragraph",
	"Typesetting.Centering",
	"Typesetting.MultiParagraph",
	"Typesetting.BulletedList",
	"Typesetting.NumberedList"
]);

Formulae.AI.MAX_STRUCTURAL_RETRIES = 1;

// xmlToExpression (permissive mode, the same mode used to display a
// response) never throws for a bad tag/arity/attribute -- it substitutes a
// marker expression in place of the bad node and keeps going, so this walks
// the already-parsed tree looking for one, at any depth.
Formulae.AI._findStructuralError = function(expression) {
	if (expression instanceof Formulae.UnknownExpression) {
		return { kind: "unknownTag", tag: expression.getTag() };
	}
	if (expression instanceof Formulae.IllegalArgumentsExpression) {
		return { kind: "illegalArguments", tag: expression.getTag(), count: expression.children.length };
	}
	if (expression instanceof Expression.ErrorExpression) {
		return { kind: "badAttribute", detail: expression.description };
	}
	if (expression.getTag() === "Graphics.VectorGraphics") {
		let svgText = expression.get("Value");
		if (typeof svgText === "string" && svgText.length > 0) {
			let parserError = new DOMParser().parseFromString(svgText, "image/svg+xml").querySelector("parsererror");
			if (parserError) {
				return { kind: "invalidSvg", detail: parserError.textContent.slice(0, 200) };
			}
		}
	}
	for (let child of expression.children) {
		let found = Formulae.AI._findStructuralError(child);
		if (found) return found;
	}
	return null;
};

// Deliberately does not attempt to judge whether the response is a sensible
// combination of expressions, or whether it satisfies the prompt -- both
// are undecidable in general (see file header). Promises returned by
// deserialization (async follow-up work like image decoding) are
// deliberately not awaited here -- they're about populating a display
// cache, not about structural validity.
Formulae.AI._validateStructure = function(responseXml) {
	let expression;
	try {
		expression = Formulae.xmlToExpression(responseXml, []);
	}
	catch (e) {
		return { valid: false, kind: "unparseable", detail: e.message };
	}

	let badNode = Formulae.AI._findStructuralError(expression);
	if (badNode) return { valid: false, ...badNode };

	if (!Formulae.AI.RESPONSE_WRAPPER_TAGS.has(expression.getTag())) {
		return { valid: false, kind: "badWrapper", tag: expression.getTag() };
	}

	return { valid: true };
};

// Generated mechanically from what the check actually found -- this is
// general-purpose and needs to explain different problems on different
// responses, not just one hardcoded complaint.
Formulae.AI._buildCorrection = function(verdict) {
	switch (verdict.kind) {
		case "unknownTag":
			return `Your response used the tag "${verdict.tag}", which does not exist in Fōrmulæ. Please provide a corrected response using only valid Fōrmulæ expression tags.`;
		case "illegalArguments":
			return `Your response used the tag "${verdict.tag}" with ${verdict.count} subexpression(s), which is not a number of subexpressions it accepts. Please provide a corrected response with the right number of subexpressions for that tag.`;
		case "badAttribute":
			return `Your response had an invalid attribute value: ${verdict.detail}. Please provide a corrected response with valid attribute values.`;
		case "invalidSvg":
			return `The SVG markup inside your Graphics.VectorGraphics "Value" attribute is not well-formed XML (${verdict.detail}) -- this is separate from the outer Fōrmulæ XML, which was fine. A common cause is a missing "&gt;" closing an element's opening tag. Please provide a corrected response with well-formed SVG markup in the Value attribute.`;
		case "badWrapper":
			return `Your response's top-level expression was "${verdict.tag}", but a Fōrmulæ AI response must always be one of: Typesetting.Paragraph, Typesetting.Centering (wrapping a displayed expression), Typesetting.MultiParagraph, or a typesetting list (Typesetting.BulletedList / Typesetting.NumberedList). Please provide a corrected response wrapped in one of these.`;
		case "unparseable":
			return `Your response could not be parsed as a Fōrmulæ expression (${verdict.detail}). Please provide a corrected response as a single well-formed <expression> element.`;
		default:
			return "Your response was not a valid Fōrmulæ expression. Please provide a corrected response.";
	}
};

Formulae.AI.sendToAI = async function(xmlString, controller) {
	let info = Formulae.AI.getActiveProvider();
	if (!info) throw new Error("No active AI connection configured");
	let primer = await Formulae.AI._getPrimer();
	if (!Formulae.AI._sessionStarted) {
		await info.provider.onStart(info.connection.parameters, primer);
		Formulae.AI._sessionStarted = true;
	}
	let { strippedXml, mediaMap } = Formulae.AI.extractMedia(xmlString);

	// One corrective retry, at most, on top of the normal single round trip.
	// History turns are plain text only -- on a corrective retry, the model
	// is re-shown the original prompt as stripped text (media placeholders,
	// not the actual media bytes) and its own invalid response, then asked
	// to fix it. Re-attaching the original media to the replayed turn would
	// need each provider's media-encoding logic to run twice; skipped for
	// now since Tier 1 failures are about response structure, not about
	// what was in the prompt.
	let history = [];
	let currentXml = strippedXml, currentMediaMap = mediaMap;
	let responseXml, responseMediaMap;

	for (let attempt = 0; ; attempt++) {
		({ responseXml, responseMediaMap } = await info.provider.onPrompt(
			info.connection.parameters, primer, currentXml, currentMediaMap, controller, history
		));

		let verdict = Formulae.AI._validateStructure(responseXml);
		if (verdict.valid || attempt >= Formulae.AI.MAX_STRUCTURAL_RETRIES) break;

		history = [
			...history,
			{ role: "user",      content: currentXml },
			{ role: "assistant", content: responseXml }
		];
		currentXml = Formulae.AI._buildCorrection(verdict);
		currentMediaMap = {};
	}

	return Formulae.AI.reinsertMedia(responseXml, { ...mediaMap, ...responseMediaMap });
};

// ─── UI ────────────────────────────────────────────────────────────────────

Formulae.AI.showConnectionsManager = function() {
	Formulae.AI._showMainView();
};

Formulae.AI._showMainView = function() {
	let esc = Formulae.AI._esc;
	let table = document.createElement("table");
	table.classList.add("bordered");
	
	let rows = "";
	if (Formulae.AI.connections.length === 0) {
		rows = `<tr><td colspan=4 align=center><em>No connections defined</em></td></tr>`;
	}
	else {
		Formulae.AI.connections.forEach(conn => {
			let isActive = conn.id === Formulae.AI.activeConnectionId;
			rows += `
<tr>
  <td>${esc(conn.name)}</td>
  <td>${esc(conn.providerName)}</td>
  <td align=center><input type="radio" name="ai-active" data-id="${esc(conn.id)}"${isActive ? " checked" : ""}></td>
  <td>
    <button data-action="edit"   data-id="${esc(conn.id)}">Edit</button>&nbsp;
    <button data-action="delete" data-id="${esc(conn.id)}">Delete</button>
  </td>
</tr>`;
		});
	}
	
	table.innerHTML = `
<tr><th colspan=4>AI Connections
<tr><th>Name</th><th>Provider</th><th>Active</th><th>Actions</th>
${rows}
<tr><td colspan=4 align=center>
  <button id="ai-add">Add&#x2026;</button>&nbsp;
  <button id="ai-close">Close</button>
</td></tr>`;
	
	Formulae.setModal(table);
	
	table.querySelectorAll("input[type=radio][name=ai-active]").forEach(radio => {
		radio.onchange = () => {
			Formulae.AI.activeConnectionId = radio.dataset.id;
			Formulae.AI._sessionStarted = false;
			Formulae.AI._save();
		};
	});
	
	table.querySelectorAll("button[data-action]").forEach(btn => {
		if (btn.dataset.action === "edit") {
			btn.onclick = async () => {
				let conn = Formulae.AI.connections.find(c => c.id === btn.dataset.id);
				if (!conn) return;
				let provider = Formulae.AI.providers?.find(p => p.getProviderName() === conn.providerName);
				if (!provider) return;
				let result = await provider.configure(conn.parameters, conn.name, conn.id);
				if (result !== null) {
					const { name: newName, ...params } = result;
					conn.name = newName;
					conn.parameters = params;
					if (conn.id === Formulae.AI.activeConnectionId) {
						Formulae.AI._sessionStarted = false;
					}
					Formulae.AI._save();
				}
				Formulae.AI._showMainView();
			};
		}
		else if (btn.dataset.action === "delete") {
			btn.onclick = () => {
				let conn = Formulae.AI.connections.find(c => c.id === btn.dataset.id);
				if (!conn) return;
				if (!confirm(`Delete connection "${conn.name}"?`)) return;
				Formulae.AI.connections = Formulae.AI.connections.filter(c => c.id !== btn.dataset.id);
				if (Formulae.AI.activeConnectionId === btn.dataset.id) {
					Formulae.AI.activeConnectionId = Formulae.AI.connections.length > 0
						? Formulae.AI.connections[0].id : null;
					Formulae.AI._sessionStarted = false;
				}
				Formulae.AI._save();
				Formulae.AI._showMainView();
			};
		}
	});
	
	table.querySelector("#ai-add").onclick = () => Formulae.AI._showAddStep();
	table.querySelector("#ai-close").onclick = () => Formulae.resetModal();
};

Formulae.AI._showAddStep = function() {
	let providerOptions = (Formulae.AI.providers || []).map(p =>
		`<option>${Formulae.AI._esc(p.getProviderName())}</option>`
	).join("");
	
	let table = document.createElement("table");
	table.classList.add("bordered");
	table.innerHTML = `
<tr><th colspan=2>Add Connection
<tr><td>Provider<td><select id="ai-provider" size="3">${providerOptions}</select>
<tr><td colspan=2 align=center>
  <button id="ai-back">&#x2190; Back</button>&nbsp;
  <button id="ai-next">Next &#x2192;</button>`;
	
	Formulae.setModal(table);
	
	table.querySelector("#ai-back").onclick = () => Formulae.AI._showMainView();
	table.querySelector("#ai-next").onclick = async () => {
		let providerName = table.querySelector("#ai-provider").value;
		let provider = Formulae.AI.providers?.find(p => p.getProviderName() === providerName);
		if (!provider) return;
		let result = await provider.configure(null, "");
		if (result !== null) {
			const { name, ...params } = result;
			let newConn = {
				id: crypto.randomUUID(),
				name,
				providerName,
				parameters: params
			};
			Formulae.AI.connections.push(newConn);
			if (Formulae.AI.activeConnectionId === null) {
				Formulae.AI.activeConnectionId = newConn.id;
			}
			Formulae.AI._save();
		}
		Formulae.AI._showMainView();
	};
};

// ─── Initialise ────────────────────────────────────────────────────────────

Formulae.AI._load();

