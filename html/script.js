document.getElementById("calculateBtn").addEventListener("click", calculate);
document.getElementById("downloadBtn").addEventListener("click", downloadTSV);

let lastResults = [];

function calculate() {
	const input = document.getElementById("sequenceInput").value.trim();
	if (!input) return;
	const sequences = input.split(/\r?\n/);
	
	const inputAbs = document.getElementById("abs").value.trim();
	const absorbances = inputAbs.split(/\r?\n/);

	lastResults = sequences.map((seq, i) => analyzeSequence(seq, absorbances[i] ?? undefined));

	renderTable(lastResults);
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
			const key = `p${bases[i]}pd${bases[j]}`; // pApdA 形式のキー
			counts[key] = count;
		}
	}
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
	const epsilonTable = { 
		pdA: 15400, pdC: 7400, pdG: 11500, pdT: 8700, 
		dApdA: 27400, dApdC: 21200, dApdG: 25000, dApdT: 22800, 
		dCpdA: 21200, dCpdC: 14600, dCpdG: 18000, dCpdT: 15200, 
		dGpdA: 25200, dGpdC: 17600, dGpdG: 21600, dGpdT: 20000, 
		dTpdA: 23400, dTpdC: 16200, dTpdG: 19000, dTpdT: 16800 
	};

	const epsilon = sumProduct(bases, epsilonTable) - sumProduct(pds, epsilonTable);
	const dsEpsilon = (1 - (0.287 * (bases.A + bases.T) + 0.059 * (bases.C + bases.G) ) .length) * ( epsilon + sumProduct(basesRev, epsilonTable) - sumProduct(pdsRev, epsilonTable) );

	// Nearest Neighbor法によるTm
	const concNa = document.getElementById("naInput").value;
	const concDNA = document.getElementById("dnaInput").value;
	// ΔH /kcal･mol^-1
	const deltaHTable = { 
		dApdA: -9.1, dApdC: -6.5, dApdG: -7.8, dApdT: -8.6, 
		dCpdA: -5.8, dCpdC: -11.0, dCpdG: -11.9, dCpdT: -7.8, 
		dGpdA: -5.6, dGpdC: -11.1, dGpdG: -11.0, dGpdT: -6.5, 
		dTpdA: -6.0, dTpdC: -5.6, dTpdG: -5.8, dTpdT: -9.1 
	};
	// ΔS /cal･mol^-1･K^-1
	const deltaSTable = { 
		dApdA: -24.0, dApdC: -17.3, dApdG: -20.8, dApdT: -23.9, 
		dCpdA: -12.9, dCpdC: -26.6, dCpdG: -27.8, dCpdT: -20.8, 
		dGpdA: -13.5, dGpdC: -26.7, dGpdG: -26.6, dGpdT: -17.3, 
		dTpdA: -16.9, dTpdC: -13.5, dTpdG: -12.9, dTpdT: -24.0 
	};
	const tmNearestNeighbor = 1000 * sumProduct(pds, deltaHTable) / (-10.8 + sumProduct(pds, deltaSTable) + 1.987 * Math.log(concDNA / 1000000 / 4) ) - 273.15 + 16.6 * Math.log10(concNa / 1000);

	// 濃度（例: 1 Abs = 50 μg/mL dsDNA, 簡易換算）
	let conc_uM = 0;
	let dsConc_uM = 0;
	let conc_nguL = 0;
	let dsConc_nguL = 0;
	if (abs) {
		conc_uM = epsilon > 0 ? (abs / epsilon * 1e6).toFixed(2) : 0;
		dsConc_uM = dsEpsilon > 0 ? (abs / dsEpsilon * 1e6).toFixed(2) : 0;
		conc_nguL = conc_uM * mw / 1000;
		dsConc_nguL = dsConc_uM * dsMw / 1000;
	}

	return {
		sequence: seq,
		length,
		A: bases.A,
		C: bases.C,
		G: bases.G,
		T: bases.T,
		gc: gcContent,
		tmWallace: tmWallace,
		tmNN: tmNearestNeighbor,
		epsilon: epsilon,
		conc_uM: conc_uM,
		conc_nguL: conc_nguL,
		dsMw: mw.toFixed(2),
		dsEpsilon: dsEpsilon,
		dsConc_uM: dsConc_uM,
		dsConc_nguL: dsConc_nguL,
		dsMw: dsMw.toFixed(2)
	};
}

function renderTable(results) {
	let html = "<table><thead><tr>" +
		"<th>配列</th><th>長さ</th><th>A</th><th>C</th><th>G</th><th>T</th>" +
		"<th>Mw</th><th>GC %</th><th>Tm (Wallace)</th><th>ε260</th><th>濃度 (μM)</th>" +
		"</tr></thead><tbody>";

	results.forEach(r => {
		html += `<tr>
			<td>${r.sequence}</td>
			<td>${r.length}</td>
			<td>${r.A}</td>
			<td>${r.C}</td>
			<td>${r.G}</td>
			<td>${r.T}</td>
			<td>${r.mw}</td>
			<td>${r.gc}</td>
			<td>${r.tmWallace}</td>
			<td>${r.epsilon}</td>
			<td>${r.conc_uM}</td>
		</tr>`;
	});

	html += "</tbody></table>";
	document.getElementById("results").innerHTML = html;
}

function downloadTSV() {
	if (!lastResults.length) return;

	let tsv = "Sequence\tLength\tA\tC\tG\tT\tMw\tGC%\tTm(Wallace)\tEpsilon260\tConc(μM)\n";
	lastResults.forEach(r => {
		tsv += `${r.sequence}\t${r.length}\t${r.A}\t${r.C}\t${r.G}\t${r.T}\t${r.mw}\t${r.gc}\t${r.tmWallace}\t${r.epsilon}\t${r.conc_uM}\n`;
	});

	const blob = new Blob([tsv], { type: "text/tab-separated-values" });
	const url = URL.createObjectURL(blob);

	const a = document.createElement("a");
	a.href = url;
	a.download = "dna_results.tsv";
	a.click();

	URL.revokeObjectURL(url);
}
