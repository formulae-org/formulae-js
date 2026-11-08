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

"use strict";

Formulae.AI = Formulae.AI || {};

Formulae.AI.providers = (() => {
	function _audioFormatFromMime(mimeType) {
		const map = {
			"audio/mpeg":  "mp3",
			"audio/mp3":   "mp3",
			"audio/wav":   "wav",
			"audio/wave":  "wav",
			"audio/x-wav": "wav",
			"audio/flac":  "flac",
			"audio/ogg":   "ogg",
			"audio/webm":  "webm",
			"audio/mp4":   "m4a",
			"audio/aac":   "aac",
		};
		return map[mimeType.toLowerCase()] ?? mimeType.split("/")[1];
	}
	
	class OpenAICompatibleProvider {
		getProviderName() { return "OpenAI-compatible"; }
		
		configure(existing, name = "", connId = null) {
			return new Promise(resolve => {
				let table = document.createElement("table");
				table.classList.add("bordered");
				table.innerHTML = `
<tr><th colspan=2>Configure — OpenAI-compatible
<tr><td>Connection name<td><input type="text" id="ai-connName" size=40>
<tr><td>Base URL<td><input type="text" id="ai-baseUrl" size=40 placeholder="https://openrouter.ai/api/v1">
<tr><td>API key<td><input type="password" id="ai-apiKey" size=40>
<tr><td>Model<td><input type="text" id="ai-model" size=40 placeholder="e.g. openai/gpt-4o">
<tr><td>Max tokens<td><input type="number" id="ai-maxTokens" size=10 value="4096">
<tr><td colspan=2 align=center>
  <button id="ai-back">&#x2190; Back</button>&nbsp;
  <button id="ai-save">Save</button>`;
				Formulae.setModal(table);
				table.querySelector("#ai-connName").value = name;
				table.querySelector("#ai-baseUrl").value = existing?.baseUrl || "";
				table.querySelector("#ai-apiKey").value = existing?.apiKey || "";
				table.querySelector("#ai-model").value = existing?.model || "";
				table.querySelector("#ai-maxTokens").value = existing?.maxTokens ?? 4096;
				table.querySelector("#ai-back").onclick = () => resolve(null);
				table.querySelector("#ai-save").onclick = () => {
					let connName = table.querySelector("#ai-connName").value.trim();
					let baseUrl = table.querySelector("#ai-baseUrl").value.trim().replace(/\/$/, "");
					let apiKey = table.querySelector("#ai-apiKey").value.trim();
					let model = table.querySelector("#ai-model").value.trim();
					let maxTokens = parseInt(table.querySelector("#ai-maxTokens").value) || 4096;
					if (!connName) { alert("Connection name is required"); return; }
					if (Formulae.AI.connections.some(c => c.id !== connId && c.name === connName)) { alert("A connection with this name already exists"); return; }
					if (!baseUrl) { alert("Base URL is required"); return; }
					if (!apiKey)  { alert("API key is required"); return; }
					if (!model)   { alert("Model is required"); return; }
					resolve({ name: connName, baseUrl, apiKey, model, maxTokens });
				};
			});
		}
		
		async onStart(params, primer) {}
		
		async onPrompt(params, primer, xml, mediaMap, controller, history = []) {
			let userContent;
			if (Object.keys(mediaMap).length === 0) {
				userContent = xml;
			}
			else {
				userContent = [];
				for (let [ref, media] of Object.entries(mediaMap)) {
					userContent.push({ type: "text", text: `[MediaRef: ${ref}]` });
					if (media.format.startsWith("image/")) {
						userContent.push({ type: "image_url", image_url: { url: `data:${media.format};base64,${media.data}` } });
					}
					else if (media.format.startsWith("audio/")) {
						userContent.push({ type: "input_audio", input_audio: { data: media.data, format: _audioFormatFromMime(media.format) } });
					}
				}
				userContent.push({ type: "text", text: xml });
			}

			console.log(userContent);

			const response = await fetch(params.baseUrl + "/chat/completions", {
				signal: controller.signal,
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${params.apiKey}`
				},
				body: JSON.stringify({
					model: params.model,
					messages: [
						{ role: "system", content: primer      },
						...history,
						{ role: "user",   content: userContent }
					],
					stream: false,
					max_tokens: params.maxTokens
				})
			});
			
			const data = await response.json();
			console.log(data);
			if (data.error) {
				const msg = typeof data.error === 'string' ? data.error : (data.error.message ?? JSON.stringify(data.error));
				throw new Error(msg);
			}
			
			const message = data.choices[0].message;
			
			return { responseXml: message.content, responseMediaMap: {} };
		}
	}
	
	class AnthropicProvider {
		getProviderName() { return "Anthropic"; }
		
		configure(existing, name = "", connId = null) {
			return new Promise(resolve => {
				let table = document.createElement("table");
				table.classList.add("bordered");
				table.innerHTML = `
<tr><th colspan=2>Configure — Anthropic
<tr><td>Connection name<td><input type="text" id="ai-connName" size=40>
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
				table.querySelector("#ai-connName").value = name;
				table.querySelector("#ai-apiKey").value    = existing?.apiKey    || "";
				table.querySelector("#ai-model").value     = existing?.model     || "claude-sonnet-4-6";
				table.querySelector("#ai-maxTokens").value = existing?.maxTokens ?? 4096;
				table.querySelector("#ai-back").onclick = () => resolve(null);
				table.querySelector("#ai-save").onclick = () => {
					let connName  = table.querySelector("#ai-connName").value.trim();
					let apiKey    = table.querySelector("#ai-apiKey").value.trim();
					let model     = table.querySelector("#ai-model").value.trim();
					let maxTokens = parseInt(table.querySelector("#ai-maxTokens").value) || 4096;
					if (!connName) { alert("Connection name is required"); return; }
					if (Formulae.AI.connections.some(c => c.id !== connId && c.name === connName)) { alert("A connection with this name already exists"); return; }
					if (!apiKey) { alert("API key is required"); return; }
					if (!model)  { alert("Model is required"); return; }
					resolve({ name: connName, apiKey, model, maxTokens });
				};
			});
		}
		
		async onStart(params, primer) {}
		
		async onPrompt(params, primer, xml, mediaMap, controller, history = []) {
			let userContent;
			if (Object.keys(mediaMap).length === 0) {
				userContent = xml;
			}
			else {
				for (let media of Object.values(mediaMap)) {
					if (!media.format.startsWith("image/")) {
						throw new Error(`This Anthropic connection does not support ${media.format} input -- the Messages API has no audio-input capability. Use an OpenAI-compatible or Google connection instead.`);
					}
				}

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
				signal: controller.signal,
				method: "POST",
				headers: {
					"Content-Type":      "application/json",
					"x-api-key":         params.apiKey,
					"anthropic-version": "2023-06-01"
				},
				body: JSON.stringify({
					model:      params.model,
					system:     primer,
					messages:   [...history, { role: "user", content: userContent }],
					max_tokens: params.maxTokens
				})
			});
			
			const data = await response.json();
			if (data.error) {
				const msg = typeof data.error === 'string' ? data.error : (data.error.message ?? JSON.stringify(data.error));
				throw new Error(msg);
			}
			return { responseXml: data.content[0].text, responseMediaMap: {} };
		}
	}
	
	class GoogleProvider {
		constructor() { this._cacheName = null; }
		
		getProviderName() { return "Google (Gemini)"; }
		
		configure(existing, name = "", connId = null) {
			return new Promise(resolve => {
				let table = document.createElement("table");
				table.classList.add("bordered");
				table.innerHTML = `
<tr><th colspan=2>Configure — Google (Gemini)
<tr><td>Connection name<td><input type="text" id="ai-connName" size=40>
<tr><td>API key<td><input type="password" id="ai-apiKey" size=40>
<tr><td>Model<td>
  <input type="text" id="ai-model" size=40 list="ai-gemini-models" placeholder="e.g. gemini-2.5-flash">
  <datalist id="ai-gemini-models">
    <option value="gemini-2.5-flash">
    <option value="gemini-2.5-pro">
    <option value="gemini-2.0-flash">
    <option value="gemini-2.0-flash-preview-image-generation">
    <option value="gemini-1.5-pro">
    <option value="gemini-2.5-flash-image">
  </datalist>
<tr><td>Image generation<td><label><input type="checkbox" id="ai-imageGen"> Enable (requires image-capable model)</label>
<tr><td colspan=2 align=center>
  <button id="ai-back">&#x2190; Back</button>&nbsp;
  <button id="ai-save">Save</button>`;
				Formulae.setModal(table);
				table.querySelector("#ai-connName").value = name;
				table.querySelector("#ai-apiKey").value = existing?.apiKey || "";
				table.querySelector("#ai-model").value = existing?.model || "gemini-2.5-flash";
				table.querySelector("#ai-imageGen").checked = existing?.imageGeneration ?? false;
				table.querySelector("#ai-back").onclick = () => resolve(null);
				table.querySelector("#ai-save").onclick = () => {
					let connName = table.querySelector("#ai-connName").value.trim();
					let apiKey = table.querySelector("#ai-apiKey").value.trim();
					let model  = table.querySelector("#ai-model").value.trim();
					if (!connName) { alert("Connection name is required"); return; }
					if (Formulae.AI.connections.some(c => c.id !== connId && c.name === connName)) { alert("A connection with this name already exists"); return; }
					if (!apiKey) { alert("API key is required"); return; }
					if (!model)  { alert("Model is required"); return; }
					resolve({
						name: connName,
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
			}
			catch (e) {
				console.warn("Gemini context cache creation failed, will use system_instruction per-request:", e.message);
			}
		}
		
		async onPrompt(params, primer, xml, mediaMap, controller, history = []) {
			let parts = [];
			for (let [ref, media] of Object.entries(mediaMap)) {
				parts.push({ text: `[MediaRef: ${ref}]` });
				parts.push({ inline_data: { mime_type: media.format, data: media.data } });
			}
			parts.push({ text: xml });

			const body = {
				contents: [
					...history.map(t => ({ role: t.role === "assistant" ? "model" : t.role, parts: [{ text: t.content }] })),
					{ role: "user", parts }
				]
			};
			
			if (params.imageGeneration) {
				body.generationConfig = { responseModalities: ["TEXT", "IMAGE"] };
			}
			
			if (this._cacheName) {
				body.cachedContent = this._cacheName;
			}
			else {
				body.system_instruction = { parts: [{ text: primer }] };
			}
			
			console.log("body");
			console.log(body);
			
			const response = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`,
				{
					signal: controller.signal,
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body)
				}
			);
			const data = await response.json();
			console.log("data");
			console.log(data);
			if (data.error) throw new Error(data.error.message);
			
			let responseParts = data.candidates[0].content.parts;
			let xmlParts = [], responseMediaMap = {}, genIdx = 0;
			for (let part of responseParts) {
				if (part.text) {
					xmlParts.push(part.text);
				}
				else if (part.inlineData) {
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

// Built-in demo connection, used when the user has configured no connection
// of their own. It calls Gemini through Firebase AI Logic, which keeps the
// Gemini key on Google's servers; App Check (Google Cloud Fraud Defense,
// formerly reCAPTCHA Enterprise) keeps other sites
// from spending the shared free quota. Not listed in Formulae.AI.providers, so
// it is never offered in the "Add connection" dialog.

Formulae.AI.demoProvider = (() => {
	const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/13.0.0";

	// Public identifiers of the "Formulae web" app in the formulae-org project, not secrets
	const FIREBASE_CONFIG = {
		apiKey:            "AIzaSyAltjHdvVX6K7sHM1cywEjA44VKCnpBVTw",
		authDomain:        "formulae-org.firebaseapp.com",
		projectId:         "formulae-org",
		storageBucket:     "formulae-org.firebasestorage.app",
		messagingSenderId: "857655120060",
		appId:             "1:857655120060:web:32cad943cfbc09d1cb40b9"
	};

	// Fraud Defense (reCAPTCHA Enterprise) site key registered in Firebase console → App Check
	// (a native key; the earlier legacy key 6LdiTgou… failed App Check's assessment with "App attestation failed")
	const RECAPTCHA_SITE_KEY = "6LegmxUuAAAAABxrxPlB0mddWpFY2pmjMb2yUk6T";

	// Tried in order, moving to the next one on "high demand" or an exhausted
	// quota (free-tier limits are per model). gemini-3.8-flash was dropped
	// (2026-11-07): on the free tier it mostly failed with "high demand" or
	// deadline errors, while gemini-3.1-flash-lite answered in seconds
	const MODELS = [ "gemini-3.1-flash-lite", "gemini-3.5-flash-lite" ];

	// Thinking over the ~30k-token primer made answers take minutes and hit server deadlines
	const GENERATION_CONFIG = { thinkingConfig: { thinkingLevel: "LOW" } };

	const SETTINGS_HINT = "To keep conversing, connect your own AI model in Settings → AI connections.";

	const isHighDemand = e => /high demand|overloaded|unavailable/i.test(e.message);
	const isDeadline   = e => /deadline|timed? ?out|has expired/i.test(e.message);
	const isQuota      = e => /quota|429|exhausted/i.test(e.message);

	class DemoProvider {
		constructor() {
			this._ai = null;
			this._models = new Map();
		}

		getProviderName() { return "Demo (Google Gemini, free)"; }

		async _getModel(name, primer) {
			if (this._models.has(name)) return this._models.get(name);

			// Kept as a promise, so concurrent prompts don't initialize the app twice
			this._ai ??= this._initAI();
			const ai = await this._ai;
			if (this._models.has(name)) return this._models.get(name);
			const { getGenerativeModel } = await import(`${FIREBASE_SDK}/firebase-ai.js`);

			const model = getGenerativeModel(ai, { model: name, systemInstruction: primer, generationConfig: GENERATION_CONFIG });
			this._models.set(name, model);
			return model;
		}

		async _initAI() {
			const { initializeApp } = await import(`${FIREBASE_SDK}/firebase-app.js`);
			const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import(`${FIREBASE_SDK}/firebase-app-check.js`);
			const { getAI, GoogleAIBackend } = await import(`${FIREBASE_SDK}/firebase-ai.js`);

			const app = initializeApp(FIREBASE_CONFIG, "formulae-demo-ai");

			if (RECAPTCHA_SITE_KEY) {
				// On a local server, App Check prints a debug token to the console, to be registered in the Firebase console
				if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
					self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
				}
				initializeAppCheck(app, {
					provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY),
					isTokenAutoRefreshEnabled: true
				});
			}

			return getAI(app, { backend: new GoogleAIBackend() });
		}

		async onStart(params, primer) {}

		async onPrompt(params, primer, xml, mediaMap, controller, history = []) {
			let parts = [];
			for (let [ref, media] of Object.entries(mediaMap)) {
				parts.push({ text: `[MediaRef: ${ref}]` });
				parts.push({ inlineData: { mimeType: media.format, data: media.data } });
			}
			parts.push({ text: xml });

			const request = {
				contents: [
					...history.map(t => ({ role: t.role === "assistant" ? "model" : t.role, parts: [{ text: t.content }] })),
					{ role: "user", parts }
				]
			};

			for (let i = 0; ; ++i) {
				const model = await this._getModel(MODELS[i], primer);
				const start = performance.now();
				try {
					const result = await model.generateContent(request, { signal: controller.signal });
					console.info(`Demo AI: answered by ${MODELS[i]} in ${((performance.now() - start) / 1000).toFixed(1)} s`);
					return { responseXml: result.response.text(), responseMediaMap: {} };
				}
				catch (e) {
					console.info(`Demo AI: ${MODELS[i]} failed after ${((performance.now() - start) / 1000).toFixed(1)} s: ${e.message}`);
					if (controller.signal.aborted) throw e;

					if ((isHighDemand(e) || isQuota(e)) && i + 1 < MODELS.length) continue;

					if (isQuota(e)) {
						throw new Error(`The free demo AI has reached its usage limit for now. ${SETTINGS_HINT}`);
					}
					if (isHighDemand(e)) {
						throw new Error(`The free demo AI is busy right now, because many people are using it. Please try again in a few minutes. ${SETTINGS_HINT}`);
					}
					if (/app ?check/i.test(e.message)) {
						throw new Error(`The free demo AI could not verify this browser, so it is not available right now. Please try again later. ${SETTINGS_HINT}`);
					}
					if (isDeadline(e)) {
						throw new Error(`The free demo AI took too long to answer, probably because many people are using it. Please try again. ${SETTINGS_HINT}`);
					}
					throw e;
				}
			}
		}
	}

	return new DemoProvider();
})();

