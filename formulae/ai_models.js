/*
Fōrmulæ AI provider models.
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

Formulae.AI.providers = (() => {

	class AnthropicProvider {
		getProviderName() { return "Anthropic (Claude)"; }
		getModels() {
			return [
				"claude-opus-4-7",
				"claude-sonnet-4-6",
				"claude-haiku-4-5-20251001"
			];
		}
		configure(existing) {
			return new Promise(resolve => {
				let table = document.createElement("table");
				table.classList.add("bordered");
				let models = this.getModels();
				let modelOptions = models.map(m =>
					`<option value="${m}">${m}</option>`
				).join("");
				table.innerHTML = `
<tr><th colspan=2>Configure — Anthropic (Claude)
<tr><td>API key<td><input type="password" id="ai-apiKey" size=40>
<tr><td>Model<td><select id="ai-model">${modelOptions}</select>
<tr><td>Max tokens<td><input type="number" id="ai-maxTokens" min="1" max="32768" value="4096">
<tr><td colspan=2 align=center>
  <button id="ai-back">&#x2190; Back</button>&nbsp;
  <button id="ai-save">Save</button>`;
				Formulae.setModal(table);
				let defaultModel = existing?.model || models[0];
				table.querySelector("#ai-apiKey").value = existing?.apiKey || "";
				table.querySelector("#ai-model").value = defaultModel;
				table.querySelector("#ai-maxTokens").value = existing?.maxTokens ?? 4096;
				table.querySelector("#ai-back").onclick = () => resolve(null);
				table.querySelector("#ai-save").onclick = () => {
					let apiKey = table.querySelector("#ai-apiKey").value.trim();
					if (!apiKey) { alert("API key is required"); return; }
					resolve({
						apiKey,
						model: table.querySelector("#ai-model").value,
						maxTokens: parseInt(table.querySelector("#ai-maxTokens").value) || 4096
					});
				};
			});
		}
		async onStart(params, primer) {}
		async onPrompt(params, primer, xml) {
			const response = await fetch("https://api.anthropic.com/v1/messages", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": params.apiKey,
					"anthropic-version": "2023-06-01"
				},
				body: JSON.stringify({
					model: params.model,
					system: primer,
					messages: [{ role: "user", content: xml }],
					max_tokens: params.maxTokens
				})
			});
			const data = await response.json();
			if (data.error) throw new Error(data.error.message);
			return data.content[0].text;
		}
	}

	class OpenAIProvider {
		getProviderName() { return "OpenAI (ChatGPT)"; }
		getModels() {
			return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o1-mini"];
		}
		configure(existing) {
			return new Promise(resolve => {
				let table = document.createElement("table");
				table.classList.add("bordered");
				let models = this.getModels();
				let modelOptions = models.map(m =>
					`<option value="${m}">${m}</option>`
				).join("");
				table.innerHTML = `
<tr><th colspan=2>Configure — OpenAI (ChatGPT)
<tr><td>API key<td><input type="password" id="ai-apiKey" size=40>
<tr><td>Model<td><select id="ai-model">${modelOptions}</select>
<tr><td colspan=2 align=center>
  <button id="ai-back">&#x2190; Back</button>&nbsp;
  <button id="ai-save">Save</button>`;
				Formulae.setModal(table);
				let defaultModel = existing?.model || models[0];
				table.querySelector("#ai-apiKey").value = existing?.apiKey || "";
				table.querySelector("#ai-model").value = defaultModel;
				table.querySelector("#ai-back").onclick = () => resolve(null);
				table.querySelector("#ai-save").onclick = () => {
					let apiKey = table.querySelector("#ai-apiKey").value.trim();
					if (!apiKey) { alert("API key is required"); return; }
					resolve({ apiKey, model: table.querySelector("#ai-model").value });
				};
			});
		}
		async onStart(params, primer) {}
		async onPrompt(params, primer, xml) {
			const response = await fetch("https://api.openai.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${params.apiKey}`
				},
				body: JSON.stringify({
					model: params.model,
					messages: [
						{ role: "system", content: primer },
						{ role: "user", content: xml }
					]
				})
			});
			const data = await response.json();
			if (data.error) throw new Error(data.error.message);
			return data.choices[0].message.content;
		}
	}

	class GoogleProvider {
		constructor() { this._cacheName = null; }
		getProviderName() { return "Google (Gemini)"; }
		getModels() {
			return ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-pro"];
		}
		configure(existing) {
			return new Promise(resolve => {
				let table = document.createElement("table");
				table.classList.add("bordered");
				let models = this.getModels();
				let modelOptions = models.map(m =>
					`<option value="${m}">${m}</option>`
				).join("");
				table.innerHTML = `
<tr><th colspan=2>Configure — Google (Gemini)
<tr><td>API key<td><input type="password" id="ai-apiKey" size=40>
<tr><td>Model<td><select id="ai-model">${modelOptions}</select>
<tr><td colspan=2 align=center>
  <button id="ai-back">&#x2190; Back</button>&nbsp;
  <button id="ai-save">Save</button>`;
				Formulae.setModal(table);
				let defaultModel = existing?.model || models[0];
				table.querySelector("#ai-apiKey").value = existing?.apiKey || "";
				table.querySelector("#ai-model").value = defaultModel;
				table.querySelector("#ai-back").onclick = () => resolve(null);
				table.querySelector("#ai-save").onclick = () => {
					let apiKey = table.querySelector("#ai-apiKey").value.trim();
					if (!apiKey) { alert("API key is required"); return; }
					resolve({ apiKey, model: table.querySelector("#ai-model").value });
				};
			});
		}
		async onStart(params, primer) {
			this._cacheName = null;
			try {
				const cacheResponse = await fetch(
					`https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${params.apiKey}`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							model: `models/${params.model}`,
							system_instruction: { parts: [{ text: primer }] },
							contents: [],
							ttl: "3600s"
						})
					}
				);
				const cache = await cacheResponse.json();
				if (cache.error) throw new Error(cache.error.message);
				this._cacheName = cache.name;
			} catch (e) {
				console.warn("Gemini context cache creation failed, will use system_instruction per-request:", e.message);
			}
		}
		async onPrompt(params, primer, xml) {
			const body = {
				contents: [{ role: "user", parts: [{ text: xml }] }]
			};
			if (this._cacheName) {
				body.cachedContent = this._cacheName;
			} else {
				body.system_instruction = { parts: [{ text: primer }] };
			}
			const response = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body)
				}
			);
			const data = await response.json();
			if (data.error) throw new Error(data.error.message);
			return data.candidates[0].content.parts[0].text;
		}
	}

	class AzureProvider {
		getProviderName() { return "Microsoft Azure OpenAI"; }
		getModels() { return []; }
		configure(existing) {
			return new Promise(resolve => {
				let table = document.createElement("table");
				table.classList.add("bordered");
				table.innerHTML = `
<tr><th colspan=2>Configure — Microsoft Azure OpenAI
<tr><td>API key<td><input type="password" id="ai-apiKey" size=40>
<tr><td>Resource name<td><input type="text" id="ai-resource" size=30>
<tr><td>Deployment name<td><input type="text" id="ai-deployment" size=30>
<tr><td>API version<td><input type="text" id="ai-apiVersion" size=30>
<tr><td colspan=2 align=center>
  <button id="ai-back">&#x2190; Back</button>&nbsp;
  <button id="ai-save">Save</button>`;
				Formulae.setModal(table);
				table.querySelector("#ai-apiKey").value = existing?.apiKey || "";
				table.querySelector("#ai-resource").value = existing?.resourceName || "";
				table.querySelector("#ai-deployment").value = existing?.deploymentName || "";
				table.querySelector("#ai-apiVersion").value = existing?.apiVersion || "2024-12-01-preview";
				table.querySelector("#ai-back").onclick = () => resolve(null);
				table.querySelector("#ai-save").onclick = () => {
					let apiKey = table.querySelector("#ai-apiKey").value.trim();
					let resourceName = table.querySelector("#ai-resource").value.trim();
					let deploymentName = table.querySelector("#ai-deployment").value.trim();
					if (!apiKey || !resourceName || !deploymentName) {
						alert("API key, resource name, and deployment name are required");
						return;
					}
					resolve({
						apiKey,
						resourceName,
						deploymentName,
						apiVersion: table.querySelector("#ai-apiVersion").value.trim() || "2024-12-01-preview"
					});
				};
			});
		}
		async onStart(params, primer) {}
		async onPrompt(params, primer, xml) {
			const url = `https://${params.resourceName}.openai.azure.com/openai/deployments/${params.deploymentName}/chat/completions?api-version=${params.apiVersion}`;
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"api-key": params.apiKey
				},
				body: JSON.stringify({
					messages: [
						{ role: "system", content: primer },
						{ role: "user", content: xml }
					]
				})
			});
			const data = await response.json();
			if (data.error) throw new Error(data.error.message);
			return data.choices[0].message.content;
		}
	}

	class MetaProvider {
		getProviderName() { return "Meta (Llama)"; }
		getModels() {
			return [
				"Llama-4-Scout-17B-16E-Instruct",
				"Llama-4-Maverick-17B-128E-Instruct-FP8",
				"Meta-Llama-3.1-70B-Instruct",
				"Meta-Llama-3.1-8B-Instruct"
			];
		}
		configure(existing) {
			return new Promise(resolve => {
				let table = document.createElement("table");
				table.classList.add("bordered");
				let models = this.getModels();
				let modelOptions = models.map(m =>
					`<option value="${m}">${m}</option>`
				).join("");
				table.innerHTML = `
<tr><th colspan=2>Configure — Meta (Llama)
<tr><td>API key<td><input type="password" id="ai-apiKey" size=40>
<tr><td>Model<td><select id="ai-model">${modelOptions}</select>
<tr><td colspan=2 align=center>
  <button id="ai-back">&#x2190; Back</button>&nbsp;
  <button id="ai-save">Save</button>`;
				Formulae.setModal(table);
				let defaultModel = existing?.model || models[0];
				table.querySelector("#ai-apiKey").value = existing?.apiKey || "";
				table.querySelector("#ai-model").value = defaultModel;
				table.querySelector("#ai-back").onclick = () => resolve(null);
				table.querySelector("#ai-save").onclick = () => {
					let apiKey = table.querySelector("#ai-apiKey").value.trim();
					if (!apiKey) { alert("API key is required"); return; }
					resolve({ apiKey, model: table.querySelector("#ai-model").value });
				};
			});
		}
		async onStart(params, primer) {}
		async onPrompt(params, primer, xml) {
			const response = await fetch("https://api.llama.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${params.apiKey}`
				},
				body: JSON.stringify({
					model: params.model,
					messages: [
						{ role: "system", content: primer },
						{ role: "user", content: xml }
					]
				})
			});
			const data = await response.json();
			if (data.error) throw new Error(data.error.message);
			return data.choices[0].message.content;
		}
	}

	return [
		new AnthropicProvider(),
		new OpenAIProvider(),
		new GoogleProvider(),
		new AzureProvider(),
		new MetaProvider()
	];
})();
