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

'use strict';

Formulae.AI = Formulae.AI || {};

// Escape HTML for safe insertion into innerHTML
Formulae.AI._esc = s => String(s)
	.replace(/&/g, "&amp;")
	.replace(/</g, "&lt;")
	.replace(/>/g, "&gt;")
	.replace(/"/g, "&quot;");

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
	} catch (e) {
		Formulae.AI.connections = [];
	}
	Formulae.AI.activeConnectionId = window.localStorage.getItem(AI_ACTIVE_ID_KEY) || null;
};

Formulae.AI._save = function() {
	window.localStorage.setItem(AI_CONNECTIONS_KEY, JSON.stringify(Formulae.AI.connections));
	if (Formulae.AI.activeConnectionId !== null) {
		window.localStorage.setItem(AI_ACTIVE_ID_KEY, Formulae.AI.activeConnectionId);
	} else {
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
		let response = await fetch("composing_primer.md");
		Formulae.AI._primerText = await response.text();
	}
	return Formulae.AI._primerText;
};

Formulae.AI.sendToAI = async function(xmlString) {
	let info = Formulae.AI.getActiveProvider();
	if (!info) throw new Error("No active AI connection configured");
	let primer = await Formulae.AI._getPrimer();
	if (!Formulae.AI._sessionStarted) {
		await info.provider.onStart(info.connection.parameters, primer);
		Formulae.AI._sessionStarted = true;
	}
	return await info.provider.onPrompt(info.connection.parameters, primer, xmlString);
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
	} else {
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
				let params = await provider.configure(conn.parameters);
				if (params !== null) {
					conn.parameters = params;
					if (conn.id === Formulae.AI.activeConnectionId) {
						Formulae.AI._sessionStarted = false;
					}
					Formulae.AI._save();
				}
				Formulae.AI._showMainView();
			};
		} else if (btn.dataset.action === "delete") {
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
<tr><td>Name<td><input type="text" id="ai-name" size=30 placeholder="e.g. My Claude">
<tr><td>Provider<td><select id="ai-provider">${providerOptions}</select>
<tr><td colspan=2 align=center>
  <button id="ai-back">&#x2190; Back</button>&nbsp;
  <button id="ai-next">Next &#x2192;</button>`;

	Formulae.setModal(table);

	table.querySelector("#ai-back").onclick = () => Formulae.AI._showMainView();
	table.querySelector("#ai-next").onclick = async () => {
		let name = table.querySelector("#ai-name").value.trim();
		if (!name) { alert("Please enter a name for this connection"); return; }
		let providerName = table.querySelector("#ai-provider").value;
		let provider = Formulae.AI.providers?.find(p => p.getProviderName() === providerName);
		if (!provider) return;
		let params = await provider.configure(null);
		if (params !== null) {
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
