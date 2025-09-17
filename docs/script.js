/*
    Copyright (c) 2025 KYU @ https://github.com/KYU49

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/agpl-3.0.html>.
*/


window.onload = () => {
	document.getElementById("calculateBtn").addEventListener("click", moveForCalc);
	document.getElementById("downloadBtn").addEventListener("click", downloadTSV);
	document.getElementById("clearBtn").addEventListener("click", clearInput);
	document.forms.hsValues.addEventListener("change", calculate);

	let lastResults = [];

	let seq = "";
	let hsValues = "";

	function loadParams() {
		const params = new URLSearchParams(window.location.search);
		seq = params.get("seq") || "";
		abs = params.get("abs") || "";
		na = params.get("na") || 50;
		mg = params.get("mg") || 0;
		dntp = params.get("dntp") || 0;
		dna = params.get("dna") || 0.5;
		document.getElementById("seq").value = seq;
		document.getElementById("abs").value = abs;
		document.getElementById("naInput").value = na;
		document.getElementById("mgInput").value = mg;
		document.getElementById("dntpInput").value = dntp;
		document.getElementById("dnaInput").value = dna;
		calculate();
	}

	function moveForCalc(){
		const seq = document.getElementById("seq").value.trim();
		if (!seq) return;
		const abs = Number(document.getElementById("abs").value);
		const na = Number(document.getElementById("naInput").value);
		const mg = Number(document.getElementById("mgInput").value);
		const dntp = Number(document.getElementById("dntpInput").value);
		const dna = Number(document.getElementById("dnaInput").value);
		const baseUrl = window.location.origin + window.location.pathname.replace(/[^/]+$/, ""); 
		const url = `${baseUrl}?seq=${encodeURIComponent(seq)}&abs=${encodeURIComponent(abs)}&na=${na}&mg=${mg}&dntp=${dntp}&dna=${dna}`;
		//const url = `${baseUrl}?seq=${encodeURIComponent(seq)}&abs=${encodeURIComponent(abs)}&na=${na}&dna=${dna}`;
		location.href = url;
	}
	function clearInput(){
		if( window.confirm("Clear all your inputs?") ){
			const baseUrl = window.location.origin + window.location.pathname.replace(/[^/]+$/, "");
			location.href = baseUrl;
		}
	}

	let deltaHTable, deltaSTable, initiationS, deltaG;
	function setHSValues(){
		// ΔH /kcal･mol^-1
		// ΔS /cal･mol^-1･K^-1
		// 注意: ΔHはkcalだが、ΔSはcal
		hsValues = document.forms.hsValues.elements["hsValues"].value;
		switch(hsValues) {
			case "breslauer":
				deltaHTable = { 
					dApdA: -9.1, dApdC: -6.5, dApdG: -7.8, dApdT: -8.6, 
					dCpdA: -5.8, dCpdC: -11.0, dCpdG: -11.9, dCpdT: -7.8, 
					dGpdA: -5.6, dGpdC: -11.1, dGpdG: -11.0, dGpdT: -6.5, 
					dTpdA: -6.0, dTpdC: -5.6, dTpdG: -5.8, dTpdT: -9.1 
				};
				deltaSTable = { 
					dApdA: -24.0, dApdC: -17.3, dApdG: -20.8, dApdT: -23.9, 
					dCpdA: -12.9, dCpdC: -26.6, dCpdG: -27.8, dCpdT: -20.8, 
					dGpdA: -13.5, dGpdC: -26.7, dGpdG: -26.6, dGpdT: -17.3, 
					dTpdA: -16.9, dTpdC: -13.5, dTpdG: -12.9, dTpdT: -24.0 
				};
				initiationS = -10.8;
				deltaG = 5;
				break;
			case "sugimoto":
				deltaHTable = { 
					dApdA: -8.0, dApdC: -9.4, dApdG: -6.6, dApdT: -5.6, 
					dCpdA: -8.2, dCpdC: -10.9, dCpdG: -11.8, dCpdT: -6.6, 
					dGpdA: -8.8, dGpdC: -10.5, dGpdG: -10.9, dGpdT: -9.4, 
					dTpdA: -6.6, dTpdC: -8.8, dTpdG: -8.2, dTpdT: -8.0 
				};
				deltaSTable = { 
					dApdA: -21.9, dApdC: -25.5, dApdG: -16.4, dApdT: -15.2, 
					dCpdA: -21.0, dCpdC: -28.4, dCpdG: -29.0, dCpdT: -16.4, 
					dGpdA: -23.5, dGpdC: -26.4, dGpdG: -28.4, dGpdT: -25.5, 
					dTpdA: -18.4, dTpdC: -23.5, dTpdG: -21.0, dTpdT: -21.9 
				};
				initiationS = -9;
				deltaG = 3.4;
				break;
			case "santalucia":
				deltaHTable = { 
					dApdA: -7.9, dApdC: -8.4, dApdG: -7.8, dApdT: -7.2, 
					dCpdA: -8.5, dCpdC: -8.0, dCpdG: -10.6, dCpdT: -7.8, 
					dGpdA: -8.2, dGpdC: -9.8, dGpdG: -8.0, dGpdT: -8.4, 
					dTpdA: -7.2, dTpdC: -8.2, dTpdG: -8.5, dTpdT: -7.9 
				};
				deltaSTable = { 
					dApdA: -22.2, dApdC: -22.4, dApdG: -21.0, dApdT: -20.4, 
					dCpdA: -22.7, dCpdC: -19.9, dCpdG: -27.2, dCpdT: -21.0, 
					dGpdA: -22.2, dGpdC: -24.4, dGpdG: -19.9, dGpdT: -22.4, 
					dTpdA: -21.3, dTpdC: -22.2, dTpdG: -22.7, dTpdT: -22.2 
				};
				initiationS = -10.8;
				deltaG = 5;
				break;
		}
		const hvalues = document.getElementById("hvalues");
		while(hvalues.childElementCount > 2){hvalues.removeChild(hvalues.lastChild);}
		Object.entries(deltaHTable).forEach(([key, value]) => {
			const td = document.createElement("td");
			td.textContent = value;
			hvalues.appendChild(td);
		});
		const svalues = document.getElementById("svalues");
		while(svalues.childElementCount > 2){svalues.removeChild(svalues.lastChild);}
		Object.entries(deltaSTable).forEach(([key, value]) => {
			const td = document.createElement("td");
			td.textContent = value;
			svalues.appendChild(td);
		});
	}

	function calculate() {
		setHSValues();
		if(!seq){
			return;
		}
		const sequences = seq.split(/\r?\n/);
		const absInput = document.getElementById("abs").value;
		const absorbances = absInput.split(/\r?\n/);

		lastResults = sequences.map((seq, i) => analyzeSequence(seq, absorbances[i] ?? 0));

		renderTable();
		document.getElementById("downloadBtn").disabled = false;
	}

	function countsBases(seq) {
		return {
			A: (seq.match(/A/g) || []).length,
			C: (seq.match(/C/g) || []).length,
			G: (seq.match(/G/g) || []).length,
			T: (seq.match(/T/g) || []).length
		};
	}
	function countsPd(seq) {
		const counts = {
			pdA: (seq.slice(1, -1).match(/A/g) || []).length,
			pdC: (seq.slice(1, -1).match(/C/g) || []).length,
			pdG: (seq.slice(1, -1).match(/G/g) || []).length,
			pdT: (seq.slice(1, -1).match(/T/g) || []).length
		};

		const bases = ["A", "C", "G", "T"];
		for (let i = 0; i < bases.length; i++) {
			for (let j = 0; j < bases.length; j++) {
				const dinuc = bases[i] + bases[j];
				// lookahead 正規表現でオーバーラップもカウント
				const regex = new RegExp(`(?=${dinuc})`, "g");
				const count = (seq.match(regex) || []).length;
				const key = `d${bases[i]}pd${bases[j]}`; // pApdA 形式のキー
				counts[key] = count;
			}
		}
		return counts;
	}

	// 同じキー同士をかけ合わせてその和を出す。
	function sumProduct(obj1, obj2){
		const keys1 = Object.keys(obj1);
		const keys2 = Object.keys(obj2);
		// 少ない方のキーを基準にする
		const keys = keys1.length < keys2.length ? keys1 : keys2;

		return keys
			.filter(k => k in obj1 && k in obj2)
			.reduce((acc, k) => acc + obj1[k] * obj2[k], 0);
	}

	function analyzeSequence(seq, abs) {
		if (!seq) {
			return {};
		}
		seq = seq.toUpperCase().replace(/[^ACGT]/g, "");
		rev = seq.split("").reverse().join("");

		const bases = countsBases(seq);
		const pds = countsPd(seq);
		const basesRev = countsBases(rev);
		const pdsRev = countsPd(rev);

		const length = seq.length;

		// 分子量 (Mw)
		const mwTable = { A: 313.21, C: 289.18, G: 329.21, T: 304.2 };
		const mw = bases.A * mwTable.A + bases.C * mwTable.C + bases.G * mwTable.G + bases.T * mwTable.T - 62.03;
		const dsMw = (bases.A + bases.T) * (mwTable.A + mwTable.T) + (bases.C + bases.G) * (mwTable.C + mwTable.G) - 79.2 * 2 + 17.01 * 2;

		// GC含量 (%)
		const gcContent = length > 0 ? ((bases.G + bases.C) / length * 100).toFixed(2) : 0;

		// Wallace法によるTm (簡易)
		const tmWallace = 2 * (bases.A + bases.T) + 4 * (bases.G + bases.C);

		// ε260 (モル吸光係数)
		const epsilonTable1 = { 
			pdA: 15400, pdC: 7400, pdG: 11500, pdT: 8700
		};
		const epsilonTable2 = { 
			dApdA: 27400, dApdC: 21200, dApdG: 25000, dApdT: 22800, 
			dCpdA: 21200, dCpdC: 14600, dCpdG: 18000, dCpdT: 15200, 
			dGpdA: 25200, dGpdC: 17600, dGpdG: 21600, dGpdT: 20000, 
			dTpdA: 23400, dTpdC: 16200, dTpdG: 19000, dTpdT: 16800 
		};

		const epsilon = sumProduct(pds, epsilonTable2) - sumProduct(pds, epsilonTable1);
		const dsEpsilon = (1 - (0.287 * (bases.A + bases.T) + 0.059 * (bases.C + bases.G) ) / length) * ( epsilon + sumProduct(pdsRev, epsilonTable2) - sumProduct(pdsRev, epsilonTable1) );

		// Nearest Neighbor法によるTm
		const concNa = Number(document.getElementById("naInput").value);
		const concMg = Number(document.getElementById("mgInput").value);
		const concDNTP = Number(document.getElementById("dntpInput").value);
		const concDNA = Number(document.getElementById("dnaInput").value);
		// 参考: https://www.biosyn.com/gizmo/tools/oligo/oligonucleotide%20properties%20calculator.htm
		// ΔG = 1.32 or 3.4 or 5 kcal/(mol･K) は無視できるほど小さいので省略。https://doi.org/10.1093/nar/24.22.4501
		// -10.8 cal/(mol･K)はΔS initiation; DNA濃度の設定は https://doi.org/10.1073/pnas.95.4.1460 のEq.3を参照
		// 16.2はhttps://doi.org/10.1073/pnas.95.4.1460の∂ΔG/∂ln[Na+] = −0.175 kcal/mol → ∂Tm/∂log[Na+] = 16.2°C (when a sequence-independent ΔS° of −24.85 e.u. is assumed)を参照。基本的にはポリマーの16.6がよく使われる。
		//const tmNearestNeighbor = 1000 * sumProduct(pds, deltaHTable) / (initiationS + sumProduct(pds, deltaSTable) + 1.987 * Math.log(concDNA / 1000000) ) - 273.15 + 16.2 * Math.log10( (concNa + 120 * Math.sqrt(concMg - concDNTP) ) / 1000);
		const naMod = concNa + 120 * Math.sqrt(concMg - concDNTP);
		const tmNearestNeighbor = 1000 * sumProduct(pds, deltaHTable) / (initiationS + sumProduct(pds, deltaSTable) + 1.987 * Math.log(concDNA / 1000000) ) - 273.15 + 16.2 * Math.log10(naMod / 1000);

		// 濃度（例: 1 Abs = 50 μg/mL dsDNA, 簡易換算）
		let conc_uM = 0;
		let dsConc_uM = 0;
		let conc_nguL = 0;
		let dsConc_nguL = 0;
		if (abs) {
			conc_uM = epsilon > 0 ? (abs / epsilon * 1e6).toFixed(2) : 0;
			dsConc_uM = dsEpsilon > 0 ? (abs / dsEpsilon * 1e6).toFixed(2) : 0;
			conc_nguL = (conc_uM * mw / 1000).toFixed(2);
			dsConc_nguL = (dsConc_uM * dsMw / 1000).toFixed(2);
		}

		return {
			sequence: seq,
			length: seq.length,
			abs: abs,
			tmNN: tmNearestNeighbor.toFixed(2),
			tmWallace: tmWallace,
			epsilon: epsilon.toFixed(0),
			conc_uM: conc_uM,
			conc_nguL: conc_nguL,
			mw: mw.toFixed(2),
			dsEpsilon: dsEpsilon.toFixed(0),
			dsConc_uM: dsConc_uM,
			dsConc_nguL: dsConc_nguL,
			dsMw: dsMw.toFixed(2),
			gc: gcContent,
			A: bases.A,
			T: bases.T,
			C: bases.C,
			G: bases.G
		};
	}

	function renderTable() {
		const results = lastResults;
		const resultsContainer = document.getElementById("results");
		while(resultsContainer.firstChild){
			resultsContainer.removeChild(resultsContainer.firstChild);
		}
		const table = document.createElement("table");
		const thead = document.createElement("thead");
		const tbody = document.createElement("tbody");
		table.appendChild(thead);
		table.appendChild(tbody);
		{
			const tr = document.createElement("tr");
			thead.appendChild(tr);
			let counter = 0;
			[
				0, 0, 0, {label: "Tm /°C", colspan: 2}, 0, 
				{label: "ssDNA", colspan: 4}, 0, 0, 0, 
				{label: "dsDNA", colspan: 4}, 0, 0, 0, 
				0, {label: "Base Count", colspan: 4}, 0, 0, 0
			].forEach(l => {
				if(l) {
					const th = document.createElement("th");
					tr.appendChild(th);
					th.innerHTML = l.label;
					th.setAttribute("colspan", l.colspan);
					counter = l.colspan - 1;
				} else if(counter-- <= 0) {
					const th = document.createElement("th");
					tr.appendChild(th);
				}
			});
		}
		{
			const tr = document.createElement("tr");
			thead.appendChild(tr);
			[
				"Sequence", "Length", "Abs.", "Nearest Neighbor", "Wallace", 
				"ε<sub>260 nm</sub> /cm<sup>−1</sup>･M<sup>−1</sup>", "Conc. /μM", "Conc. /ng･μL<sup>−1</sup>", "Mw", 
				"ε<sub>260 nm</sub> /cm<sup>−1</sup>･M<sup>−1</sup>", "Conc. /μM", "Conc. /ng･μL<sup>−1</sup>", "Mw", 
				"GC /%", "A", "T", "C", "G"
			].forEach(l => {
				const th = document.createElement("th");
				tr.appendChild(th);
				th.innerHTML = l;
			});
		}

		results.forEach( (r, i) => {
			const tr = document.createElement("tr");
			tbody.appendChild(tr);
			Object.keys(r).forEach(key => {
				const value = r[key];
				const td = document.createElement("td");
				tr.appendChild(td);
				td.classList.add(key);
				switch(key){
					case "abs":
						const input = document.createElement("input");
						input.setAttribute("type", "text");
						input.value = value;
						const rConst = r;
						const trConst = tr;
						const iConst = i;
						input.addEventListener("input", e => {
							const absText = e.target.value.replace(/[^\d\.]/g, "").replace(/(\.\d*)\./g, "$1");
							let abs = parseFloat("0" + absText);
							lastResults[iConst].abs = abs;
							const conc = abs / rConst.epsilon * 1000000;
							trConst.getElementsByClassName("conc_uM")[0].textContent = conc.toFixed(2);
							lastResults[iConst].conc_uM = conc.toFixed(2);
							trConst.getElementsByClassName("conc_nguL")[0].textContent = (conc * rConst.mw / 1000).toFixed(2);
							lastResults[iConst].conc_nguL = (conc * rConst.mw / 1000).toFixed(2);
							const dsConc = abs / rConst.dsEpsilon * 1000000;
							trConst.getElementsByClassName("dsConc_uM")[0].textContent = dsConc.toFixed(2);
							lastResults[iConst].dsConc_uM = dsConc.toFixed(2);
							trConst.getElementsByClassName("dsConc_nguL")[0].textContent = (dsConc * rConst.dsMw / 1000).toFixed(2);
							lastResults[iConst].dsConc_nguL = (dsConc * rConst.dsMw / 1000).toFixed(2);
							e.target.value = absText;
						});
						input.classList.add("abs-input");
						td.appendChild(input);
						break;
					case "sequence":
						td.setAttribute("title", value);
						td.style.cursor = "pointer";
						td.addEventListener("click", e =>{
							showModal(value);
						});
						// breakせずにdefaultの処理まで進める。
					default:
						td.textContent = value;
						break;
				}
			});
		});
		resultsContainer.appendChild(table);
	}

	function downloadTSV() {
		if (!lastResults.length) return;
		const na = document.getElementById("naInput").value;
		const dna = document.getElementById("dnaInput").value;

		let tsv = [
				"Sequence", "Length", "Abs.", "Tm_Nearest Neighbor", "Tm_Wallace", 
				"ssDNA_ε(260 nm) /cm^−1･M^−1", "ssDNA_Conc. /μM", "ssDNA_Conc. /ng･μL^−1", "ssDNA_Mw", 
				"dsDNA_ε(260 nm) /cm^−1･M^−1", "dsDNA_Conc. /μM", "dsDNA_Conc. /ng･μL^−1", "dsDNA_Mw", 
				"GC /%", "A", "T", "C", "G", "[Na^+] /mM", "[Mg^2+] /mM", "[dNTPs] /mM", "[Primer] /μM", "Used Values for Tm"
			].join("\t") + "\n";
		lastResults.forEach(r => {
			Object.keys(r).forEach(key => {
				tsv += r[key] + "\t";
			});
			tsv += na + "\t" + mg + "\t" + dntp + "\t" + dna + "\t" + hsValues + "\n";
		});

		const blob = new Blob([tsv], { type: "text/tab-separated-values" });
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		const yymmdd = ((d) => `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`)(new Date());
		a.download = yymmdd + "_dna_results.tsv";
		a.click();

		URL.revokeObjectURL(url);
	}

	// モーダルダイアログの設定
	const modalOverlay = document.getElementById("modalOverlay");
	const modalBox = document.getElementById("modalBox");
	function showModal(text){
		modalBox.textContent = text;
		modalOverlay.showModal();
	}
	modalOverlay.addEventListener("click", e => {
		if(e.target !== modalBox){
			modalOverlay.close();
		}
	});
	
	loadParams();
};