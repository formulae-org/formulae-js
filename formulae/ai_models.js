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
	class OpenAICompatibleProvider {
		getProviderName() { return "OpenAI-compatible"; }

		configure(existing) {
			return new Promise(resolve => {
				let table = document.createElement("table");
				table.classList.add("bordered");
				table.innerHTML = `
<tr><th colspan=2>Configure — OpenAI-compatible
<tr><td>Base URL<td><input type="text" id="ai-baseUrl" size=40 placeholder="https://openrouter.ai/api/v1">
<tr><td>API key<td><input type="password" id="ai-apiKey" size=40>
<tr><td>Model<td><input type="text" id="ai-model" size=40 placeholder="e.g. openai/gpt-4o">
<tr><td colspan=2 align=center>
  <button id="ai-back">&#x2190; Back</button>&nbsp;
  <button id="ai-save">Save</button>`;
				Formulae.setModal(table);
				table.querySelector("#ai-baseUrl").value = existing?.baseUrl || "";
				table.querySelector("#ai-apiKey").value = existing?.apiKey || "";
				table.querySelector("#ai-model").value = existing?.model || "";
				table.querySelector("#ai-back").onclick = () => resolve(null);
				table.querySelector("#ai-save").onclick = () => {
					let baseUrl = table.querySelector("#ai-baseUrl").value.trim().replace(/\/$/, "");
					let apiKey = table.querySelector("#ai-apiKey").value.trim();
					let model = table.querySelector("#ai-model").value.trim();
					if (!baseUrl) { alert("Base URL is required"); return; }
					if (!apiKey)  { alert("API key is required"); return; }
					if (!model)   { alert("Model is required"); return; }
					resolve({ baseUrl, apiKey, model });
				};
			});
		}

		async onStart(params, primer) {}

		async onPrompt(params, primer, xml, mediaMap) {
			let userContent;
			if (Object.keys(mediaMap).length === 0) {
				userContent = xml;
			}
			else {
				userContent = [];
				for (let [ref, media] of Object.entries(mediaMap)) {
					userContent.push({ type: "text",      text: `[MediaRef: ${ref}]` });
					userContent.push({ type: "image_url", image_url: { url: `data:${media.format};base64,${media.data}` } });
				}
				userContent.push({ type: "text", text: xml });
			}
			
			const response = await fetch(params.baseUrl + "/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${params.apiKey}`
				},
				body: JSON.stringify({
					model: params.model,
					messages: [
						{ role: "system", content: primer      },
						{ role: "user",   content: userContent }
					],
					stream: false
				})
			});
			
			const data = await response.json();
			//console.log(data);
			if (data.error) throw new Error(data.error.message);
			
			const message = data.choices[0].message;
			
			return { responseXml: message.content, responseMediaMap: {} };
		}
	}

	class AnthropicProvider {
		getProviderName() { return "Anthropic"; }

		configure(existing) {
			return new Promise(resolve => {
				let table = document.createElement("table");
				table.classList.add("bordered");
				table.innerHTML = `
<tr><th colspan=2>Configure — Anthropic
<tr><td>API key<td><input type="password" id="ai-apiKey" size=40>
<tr><td>Model<td>
  <input type="text" id="ai-model" size=40 list="ai-anthropic-models" placeholder="e.g. claude-sonnet-4-6">
  <datalist id="ai-anthropic-models">
    <option value="claude-opus-4-7">
    <option value="claude-sonnet-4-6">
    <option value="claude-haiku-4-5-20251001">
    <option value="claude-3-5-sonnet-20241022">
    <option value="claude-3-5-haiku-20241022">
  </datalist>
<tr><td>Max tokens<td><input type="number" id="ai-maxTokens" size=10 value="4096">
<tr><td colspan=2 align=center>
  <button id="ai-back">&#x2190; Back</button>&nbsp;
  <button id="ai-save">Save</button>`;
				Formulae.setModal(table);
				table.querySelector("#ai-apiKey").value    = existing?.apiKey    || "";
				table.querySelector("#ai-model").value     = existing?.model     || "claude-sonnet-4-6";
				table.querySelector("#ai-maxTokens").value = existing?.maxTokens ?? 4096;
				table.querySelector("#ai-back").onclick = () => resolve(null);
				table.querySelector("#ai-save").onclick = () => {
					let apiKey    = table.querySelector("#ai-apiKey").value.trim();
					let model     = table.querySelector("#ai-model").value.trim();
					let maxTokens = parseInt(table.querySelector("#ai-maxTokens").value) || 4096;
					if (!apiKey) { alert("API key is required"); return; }
					if (!model)  { alert("Model is required"); return; }
					resolve({ apiKey, model, maxTokens });
				};
			});
		}

		async onStart(params, primer) {}

		async onPrompt(params, primer, xml, mediaMap) {
			let userContent;
			if (Object.keys(mediaMap).length === 0) {
				userContent = xml;
			} else {
				userContent = [];
				for (let [ref, media] of Object.entries(mediaMap)) {
					userContent.push({ type: "text", text: `[MediaRef: ${ref}]` });
					userContent.push({
						type:   "image",
						source: { type: "base64", media_type: media.format, data: media.data }
					});
				}
				userContent.push({ type: "text", text: xml });
			}

			const response = await fetch("https://api.anthropic.com/v1/messages", {
				method: "POST",
				headers: {
					"Content-Type":      "application/json",
					"x-api-key":         params.apiKey,
					"anthropic-version": "2023-06-01"
				},
				body: JSON.stringify({
					model:      params.model,
					system:     primer,
					messages:   [{ role: "user", content: userContent }],
					max_tokens: params.maxTokens
				})
			});

			const data = await response.json();
			if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));
			return { responseXml: data.content[0].text, responseMediaMap: {} };
		}
	}

	class GoogleProvider {
		constructor() { this._cacheName = null; }

		getProviderName() { return "Google (Gemini)"; }

		configure(existing) {
			return new Promise(resolve => {
				let table = document.createElement("table");
				table.classList.add("bordered");
				table.innerHTML = `
<tr><th colspan=2>Configure — Google (Gemini)
<tr><td>API key<td><input type="password" id="ai-apiKey" size=40>
<tr><td>Model<td>
  <input type="text" id="ai-model" size=40 list="ai-gemini-models" placeholder="e.g. gemini-2.5-flash">
  <datalist id="ai-gemini-models">
    <option value="gemini-2.5-flash">
    <option value="gemini-2.5-pro">
    <option value="gemini-2.0-flash">
    <option value="gemini-2.0-flash-preview-image-generation">
    <option value="gemini-1.5-pro">
  </datalist>
<tr><td>Image generation<td><label><input type="checkbox" id="ai-imageGen"> Enable (requires image-capable model)</label>
<tr><td colspan=2 align=center>
  <button id="ai-back">&#x2190; Back</button>&nbsp;
  <button id="ai-save">Save</button>`;
				Formulae.setModal(table);
				table.querySelector("#ai-apiKey").value = existing?.apiKey || "";
				table.querySelector("#ai-model").value = existing?.model || "gemini-2.5-flash";
				table.querySelector("#ai-imageGen").checked = existing?.imageGeneration ?? false;
				table.querySelector("#ai-back").onclick = () => resolve(null);
				table.querySelector("#ai-save").onclick = () => {
					let apiKey = table.querySelector("#ai-apiKey").value.trim();
					let model  = table.querySelector("#ai-model").value.trim();
					if (!apiKey) { alert("API key is required"); return; }
					if (!model)  { alert("Model is required"); return; }
					resolve({
						apiKey,
						model,
						imageGeneration: table.querySelector("#ai-imageGen").checked
					});
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

		async onPrompt(params, primer, xml, mediaMap) {
			let parts = [];
			for (let [ref, media] of Object.entries(mediaMap)) {
				parts.push({ text: `[MediaRef: ${ref}]` });
				parts.push({ inline_data: { mime_type: media.format, data: media.data } });
			}
			parts.push({ text: xml });

			const body = { contents: [{ role: "user", parts }] };

			if (params.imageGeneration) {
				body.generationConfig = { responseModalities: ["TEXT", "IMAGE"] };
			}

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

			let responseParts = data.candidates[0].content.parts;
			let xmlParts = [], responseMediaMap = {}, genIdx = 0;
			for (let part of responseParts) {
				if (part.text) {
					xmlParts.push(part.text);
				} else if (part.inlineData) {
					responseMediaMap[`gen-${genIdx++}`] = {
						data:   part.inlineData.data,
						format: part.inlineData.mime_type
					};
				}
			}
			return { responseXml: xmlParts.join(""), responseMediaMap };
		}
	}

	return [
		new OpenAICompatibleProvider(),
		new AnthropicProvider(),
		new GoogleProvider()
	];
})();
