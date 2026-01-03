/*
Fōrmulæ forms.
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

Formulae.Forms = {};

// Locales

Formulae.Forms.localeSelection = function(locale, f) {
	if (Formulae.Forms.localeForm === undefined) {
		let table = document.createElement("table");
		table.classList.add("bordered");

		let tr = document.createElement("tr");
		let td = document.createElement("th"); td.textContent = Formulae.messages.labelSelectLocale;
		tr.appendChild(td);
		table.appendChild(tr);

		tr = document.createElement("tr");
		td = document.createElement("td");

		let select = document.createElement("select"); select.size = 15;

		let option;
		Formulae.localeCodes.forEach(code => {
			option = document.createElement("option");
			option.value = code;
			option.appendChild(document.createTextNode(Formulae.getLocaleName(code)));
			select.appendChild(option);
		});

		td.appendChild(select);
		tr.appendChild(td);
		table.appendChild(tr);

		Formulae.Forms.localeForm = table;
	}

	let select = Formulae.Forms.localeForm.rows[1].cells[0].firstChild;

	select.value = locale == null ? Formulae.locale : locale;

	select.onclick = () => {
		Formulae.modal.style.display = "none";
		f(select.value);
	};

	Formulae.modalContent.removeChild(Formulae.modalContent.childNodes[0]);
	Formulae.modalContent.appendChild(Formulae.Forms.localeForm);

	Formulae.modal.style.display = "block";
	Formulae.modal.focus();
};

// Time zones

Formulae.Forms.timeZoneSelection = function(timeZone, f) {
	if (Formulae.Forms.timeZoneForm === undefined) {
		let table = document.createElement("table");
		table.classList.add("bordered");

		let tr = document.createElement("tr");
		let td = document.createElement("th"); td.textContent = Formulae.messages.labelSelectTimeZone;
		tr.appendChild(td);
		table.appendChild(tr);

		tr = document.createElement("tr");
		td = document.createElement("td");

		let select = document.createElement("select"); select.size = 15;
		let option;

		for (const tz in Formulae.timeZones) {
			option = document.createElement("option");
			option.appendChild(document.createTextNode(Formulae.getTimeZoneName(tz)));
			option.value = tz;
			select.appendChild(option);
		}

		td.appendChild(select);
		tr.appendChild(td);
		table.appendChild(tr);

		Formulae.Forms.timeZoneForm = table;
	}

	let select = Formulae.Forms.timeZoneForm.rows[1].cells[0].firstChild;

	select.value = timeZone == null ? Formulae.timeZone : timeZone;

	select.onclick = () => {
		Formulae.modal.style.display = "none";
		f(select.value);
	};

	Formulae.modalContent.removeChild(Formulae.modalContent.childNodes[0]);
	Formulae.modalContent.appendChild(Formulae.Forms.timeZoneForm);

	Formulae.modal.style.display = "block";
	Formulae.modal.focus();
};

// Colors

Formulae.Forms.componentToHex = function(c) {
  let hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
};

Formulae.Forms.rgbToHex = function(r, g, b) {
  return "#" + Formulae.Forms.componentToHex(r) + Formulae.Forms.componentToHex(g) + Formulae.Forms.componentToHex(b);
};

Formulae.Forms.colorSelection = function(red, green, blue, opacity, f) {
	if (Formulae.Forms.colorForm === undefined) {
		let table = document.createElement("table");
		table.classList.add("bordered");
		table.innerHTML =
`
<tr>
<th colspan=2>${Formulae.messages.labelSelectColor}
<tr>
<td>${Formulae.messages.labelColor}
<td><input type="color">
<tr>
<td>${Formulae.messages.labelOpacity}
<td><input type="range" min=0 max=100 value=100>
<tr>
<td>${Formulae.messages.labelSample}
<td><table border=0 width="100%"><tr><td></table>
<tr>
<th colspan=2><button type="button">Ok</button>
`;

		let rows    = table.rows;
		let color   = rows[1].cells[1].firstChild;
		let opacity = rows[2].cells[1].firstChild;
		let sample  = rows[3].cells[1].firstChild;

		color.oninput = () => sample.style.backgroundColor = color.value;
		opacity.oninput = () => sample.style.opacity = opacity.value / 100;

		Formulae.Forms.colorForm = table;
	}

	let rows  = Formulae.Forms.colorForm.rows;
	let color = rows[1].cells[1].firstChild;
	let o     = rows[2].cells[1].firstChild;
	let ok    = rows[4].cells[0].firstChild;

	color.value = Formulae.Forms.rgbToHex(
		Math.round(red * 255),
		Math.round(green * 255),
		Math.round(blue * 255)
	);
	o.value = opacity * 100;
	color.oninput();
	o.oninput();

	ok.onclick = () => {
		Formulae.modal.style.display = "none";
		f(
			parseInt(color.value.slice(1, 3), 16) / 255,
			parseInt(color.value.slice(3, 5), 16) / 255,
			parseInt(color.value.slice(5, 7), 16) / 255,
			parseInt(o.value) / 100
		);
	};

	Formulae.modalContent.removeChild(Formulae.modalContent.childNodes[0]);
	Formulae.modalContent.appendChild(Formulae.Forms.colorForm);

	Formulae.modal.style.display = "block";
	Formulae.modal.focus();
};

// Integer in range

Formulae.Forms.integerInRangeSelection = function(title, entity, min, max, value, f) {
	let table = document.createElement("table");
	table.classList.add("bordered");
	table.innerHTML =
`
<tr><th colspan=2>${title}
<tr><td>${entity}<td><input type="number"/>
<tr><th colspan=2><button type="button">Ok</button>
`;

	let rows = table.rows;

	let numberField = rows[1].cells[1].firstChild
	if (min >= 0) numberField.min = min;
	if (max >= 0) numberField.max = max;
	numberField.value = value;

	rows[2].cells[0].firstChild.onclick = () => {
		Formulae.modal.style.display = "none";
		f(parseInt(numberField.value));
	};

	Formulae.modalContent.removeChild(Formulae.modalContent.childNodes[0]);
	Formulae.modalContent.appendChild(table);
	Formulae.modal.style.display = "block";
	Formulae.modal.focus();

	numberField.select();
};

