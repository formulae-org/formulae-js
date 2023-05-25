'use strict';

Formulae.Settings = {};

Formulae.Settings.showSettings = function() {
	//if (Formulae.Settings.settingsForm === undefined) {
		let table = document.createElement("table");
		table.classList.add("bordered");
		table.innerHTML =
`
<tr><th colspan=2>${Formulae.messages.labelSettingsGeneral}
<tr><td>${Formulae.messages.labelLocale}<td><button type="button" onClick="Formulae.Forms.localeSelection(Formulae.locale, Formulae.Settings.onChangeLocale);">${Formulae.messages.labelChooseLocale}</button>
<tr><td>${Formulae.messages.labelTimeZone}<td><button type="button" onClick="Formulae.Forms.timeZoneSelection(Formulae.timeZone, Formulae.Settings.onChangeTimeZone);">${Formulae.messages.labelChooseTimeZone}</button>
<tr>
<td>${Formulae.messages.labelFontSize}
<td>
<input type="number" id="fontSize" min="6" max="999" value="${Formulae.fontSize}"/>
<button type="button" onClick='Formulae.Settings.onChangeFontSize(parseInt(document.getElementById("fontSize").value));'>${Formulae.messages.labelFontSizeApply}</button>
<tr><td>${Formulae.messages.labelServer}
<td>
<select id="servers" onchange="Formulae.serverType = this.selectedIndex;">
<option value=0>${Formulae.messages.labelNoServer}</option>
<option value=1>${Formulae.messages.labelRemoteServer}</option>
<option value=2>${Formulae.messages.labelLocalServer}</option>
</select>
<tr><td>${Formulae.messages.labelSaveSettings}<td><button onClick="Formulae.savePreferences();">${Formulae.messages.labelSaveSettings}</button>
`;
		let row, col, button;
		
		// package loading
		
		row = table.insertRow();
		col = document.createElement("th"); col.setAttribute("colSpan", "2"); col.setAttribute("align", "center"); col.innerHTML = "Package loading";
		row.appendChild(col);
		
		Formulae.packages.forEach(packageInfo => {
			if (packageInfo.classExpression === null) {
				row = table.insertRow();
				col = row.insertCell(); col.setAttribute("colSpan", "2"); col.setAttribute("align", "center");
				button = document.createElement("button"); button.innerHTML = packageInfo.description;
				button.addEventListener(
					"click",
					async () => {
						Formulae.resetModal();
						packageInfo.required = true;
						await Formulae.loadPackages();
						Formulae.loadReloadEditions();
					}
				);
				col.appendChild(button);
			}
		});

		// module settings
		
		row = table.insertRow();
		col = document.createElement("th"); col.setAttribute("colSpan", "2"); col.setAttribute("align", "center"); col.innerHTML = "Package settings";
		row.appendChild(col);
		
		Formulae.packages.forEach(packageInfo => {
			if (packageInfo.classExpression !== null && packageInfo.classExpression.isConfigurable()) {
				row = table.insertRow();
				col = row.insertCell(); col.setAttribute("colSpan", "2"); col.setAttribute("align", "center");
				button = document.createElement("button"); button.innerHTML = packageInfo.description;
				button.addEventListener("click", () => packageInfo.classExpression.onConfiguration());
				col.appendChild(button);
			}
		});
		
		Formulae.Settings.settingsForm = table;
	//}

	Formulae.modalContent.removeChild(Formulae.modalContent.childNodes[0]);
	Formulae.modalContent.appendChild(Formulae.Settings.settingsForm);

	document.getElementById("servers").selectedIndex = Formulae.serverType;

	Formulae.modal.style.display = "block";
	Formulae.modal.focus();
};

Formulae.Settings.onChangeLocale = async locale => {
	Formulae.locale = locale;
	Formulae.setOrientation();
	Formulae.setLocalizationCodes();
	
	await Formulae.loadMessages(null, Formulae);
	
	let promises = Array.from(Formulae.packages.keys()).map(
		async packageName => {
			let packageInfo = Formulae.packages.get(packageName);
			if (packageInfo.messages !== null) {
				packageInfo.messages = await Formulae.loadMessages(packageName);
				packageInfo.classExpression.messages = packageInfo.messages;
				if (packageInfo.classEdition !== null) packageInfo.classEdition.messages = packageInfo.messages;
				if (packageInfo.classReduction !== null) packageInfo.classReduction.messages = packageInfo.messages;
			}
		}
	);	
	
	await Promise.all(promises)
	
	Formulae.loadReloadEditions();
	Formulae.refreshHandlers();
};

Formulae.Settings.onChangeTimeZone = timeZone => {
	Formulae.timeZone = timeZone;
	Formulae.refreshHandlers();
};

Formulae.Settings.onChangeFontSize = fontSize => {
	Formulae.fontSize = fontSize;
	Formulae.refreshHandlers();
};

Formulae.Tools = {};

//<tr>
//<td><button onClick="console.log(Formulae.sExpression.toString()); Formulae.Tools.close();" style="min-width: 100%;">Inspect expression as string</button>
//<td>(Deprecated) show the string representation of the selected expression in console

//<tr>
//<td><button onClick="Formulae.print(); Formulae.Tools.close();" style="min-width: 100%;">Print</button>
//<td>(Experimental) print the script

Formulae.Tools.showTools = function() {
	if (Formulae.Tools.toolsForm === undefined) {
		let table = document.createElement("table");
		table.classList.add("bordered");
		table.innerHTML =
`
<tr><th colspan=2>${Formulae.messages.labelTools}
<tr>
<td><button onClick="console.log(Formulae.sExpression); Formulae.Tools.close();" style="min-width: 100%;">${Formulae.messages.labelToolToConsole}</button>
<td>${Formulae.messages.descToolToConsole}
<tr>
<td><button onClick="Formulae.showSelectionXML(); Formulae.Tools.close();" style="min-width: 100%;">${Formulae.messages.labelToolXMLSelected}</button>
<td>${Formulae.messages.descToolXMLSelected}
<tr>
<td><button onClick="Formulae.showScriptXML(); Formulae.Tools.close();" style="min-width: 100%;">${Formulae.messages.labelToolXMLScript}</button>
<td>${Formulae.messages.descToolXMLScript}
<tr>
<td><button onClick="Formulae.saveAsImage();" style="min-width: 100%;">${Formulae.messages.labelToolSaveImage}</button>
<td>${Formulae.messages.descToolSaveImage}
`;
		Formulae.Tools.toolsForm = table;
	}

	Formulae.modalContent.removeChild(Formulae.modalContent.childNodes[0]);
	Formulae.modalContent.appendChild(Formulae.Tools.toolsForm);
	Formulae.modal.style.display = "block";
	Formulae.modal.focus();
};

Formulae.Tools.close = function() {
	Formulae.modal.style.display = "none";
};

