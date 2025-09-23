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
import { DataBinding } from "./DataBinding.js";

(() => {
    // ViewでaddEventListnerなどを記述した際は、EventDispatcherにcallbackをつけて登録する。クリックイベントなどをトリガーにDispatcherを介して、Controllerが呼び出され、ControllerがModelのメソッドを呼び出し、結果がcallback関数に渡される。
    class EventDispatcher {
        constructor (){
            this.listeners = {};
            const ADD = "add";
        }
        addEventListener(type, callback){
            if(!this.listeners[type]){
                this.listeners[type] = [];
            }
            this.listeners[type].push(callback);
        }
        removeEventListener(type, callback){
            for(let i = this.listeners[type].length - 1; i >= 0; i--){
                if(this.listeners[type][i] == callback){
                    this.listeners[type].splice(i, 1);
                }
            }
        }
        clearEventListener(){
            this.listeners = [];
        }
        /**
         *  ディスパッチイベントの実行
         *  @param {type, [args]} event
        */
        dispatchEvent(type, ...args){
            const tempListeners = this.listeners[type];
            if(tempListeners){
                for(let listener in tempListeners){
                    tempListeners[listener].apply(this.listeners, args);
                    // applyの参考: https://devsakaso.com/javascript-bind-call-apply-methods/
                    //              https://ginpen.com/2017/12/17/rest-parameters/
                }
            }
        }
    }

    // ステートを保存。Controllerからの要求で、外部からのデータ取得。ステートの変更。View, Controllerは見えない。
    class Model extends EventDispatcher {
		params = {
			seq: new DataBinding(""),
			abs: new DataBinding(""),
			na: new DataBinding(50),
			mg: new DataBinding(0),
			dntp: new DataBinding(0),
			dna: new DataBinding(500),
			hsValues: new DataBinding("breslauer"),
			isTraditional: new DataBinding(true),
		};
		isCalculated = new DataBinding(false);	// 計算が実行されていれば、TSV出力とClearボタンをアクティブに。
		results = [];
		absArr = [];

		loadParams() {
			(new URLSearchParams(window.location.search)).forEach((value, key) => {
				let v = value;
				if(v) {
					if(v === "false"){
						this.params[key].value = false;
					} else {
						this.params[key].value = value;
					}
				}
			});
			this.params.hsValues.addValueChangeListener((newValue, _) => {
				this.dispatchEvent(Model.CONST.HS_VALUE_CHANGED);
			});
			this.params.isTraditional.addValueChangeListener((newValue, _) => {
				this.dispatchEvent(Model.CONST.FORMULA_TYPE_CHANGED);
			});
		}

		// 現在の値を整形して、URLに入れられる形にする。
		getSearch(){
			return '?' + Object.entries(this.params).map( ([k, v]) => k + "=" + encodeURIComponent(v.value)).join("&");
		}

		// 各値を計算して返す
		calculateValues(){
			const sequences = this.params.seq.value.split(/\r?\n/);
			const absorbances = this.params.abs.value.split(/\r?\n/);
			// 前のViewを破棄してしまうので、値のバインドも削除する。
			this.absArr.forEach(abs => {
				abs.unbindElement();
				abs.removeValueChangeListener();
			});
			this.absArr.splice(0);
			// 空の行を削除
			const tempSeq = sequences.slice(0);	// 配列をfor loop用にコピー
			
			for(let i = tempSeq.length - 1; i >= 0; i--){
				// 各行ごとに配列が入っているかチェック
				const cleaned = tempSeq[i].toUpperCase().replace(/[^ACGT]/g, "");
				sequences[i] = cleaned;
				// 配列が入っている行と同じ行のabsを取得するが、absはoptionalのため、同じ行に要素があるか確認しながら取得
				let cleanedAbs = 0;
				if(absorbances.length > i){
					cleanedAbs = absorbances[i].replace(/[^\d\.]/g, "");
				}
				// 配列がちゃんと入っているか確認
				if(cleaned){
					this.absArr.unshift(new DataBinding(parseFloat("0" + cleanedAbs)));
				} else {
					sequences.splice(i, 1);
					if(absorbances.length > i){
						absorbances.splice(i, 1);
					}
				}
			}
			// 空行などを削除、absにも対応した値を入れた状態でtextareaと変数に反映
			this.params.seq.value = sequences.join("\n");
			this.params.abs.value = this.absArr.map(v => v.value).join("\n");
			this.dispatchEvent(Model.CONST.CALCULATED);
			this.results = sequences.map((seq, i) => this.calculateValue(seq, this.absArr[i].value));
			this.isCalculated.value = true;

			return this.results;
		}
		calculateValue(sequence, abs){
			if (!sequence) {
				return {};
			}
			const seq = sequence.toUpperCase().replace(/[^ACGT]/g, "");
			const rev = seq.split("").reverse().join("");

			const bases = this.countsBases(seq);
			const pds = this.countsPd(seq);
			const basesRev = this.countsBases(rev);
			const pdsRev = this.countsPd(rev);

			const length = seq.length;

			// 分子量 (Mw)
			const mwTable = Model.CONST.MW_TABLE;
			const mw = bases.A * mwTable.A + bases.C * mwTable.C + bases.G * mwTable.G + bases.T * mwTable.T - 62.03;
			const dsMw = (bases.A + bases.T) * (mwTable.A + mwTable.T) + (bases.C + bases.G) * (mwTable.C + mwTable.G) - 79.2 * 2 + 17.01 * 2;

			// GC含量 (%)
			const gcContent = length > 0 ? ((bases.G + bases.C) / length * 100).toFixed(2) : 0;

			// Wallace法によるTm (簡易)
			const tmWallace = 2 * (bases.A + bases.T) + 4 * (bases.G + bases.C);

			const epsilonTable1 = Model.CONST.EPSILON_TABLE_1;
			const epsilonTable2 = Model.CONST.EPSILON_TABLE_2;
			const epsilon = this.sumProduct(pds, epsilonTable2) - this.sumProduct(pds, epsilonTable1);
			const dsEpsilon = (1 - (0.287 * (bases.A + bases.T) + 0.059 * (bases.C + bases.G) ) / length) * ( epsilon + this.sumProduct(pdsRev, epsilonTable2) - this.sumProduct(pdsRev, epsilonTable1) );

			// Nearest Neighbor法によるTm
			const concNa = Number(this.params.na.value);
			const concMg = Number(this.params.mg.value);
			const concDNTP = Number(this.params.dntp.value);
			const concDNA = Number(this.params.dna.value);

			const hsTable = this.getHSTable();
			const deltaHTable = hsTable.deltaHTable;
			const deltaSTable = hsTable.deltaSTable;
			const initiationS = hsTable.initiationS;

			// 参考: https://www.biosyn.com/gizmo/tools/oligo/oligonucleotide%20properties%20calculator.htm
			// ΔG = 1.32 or 3.4 or 5 kcal/(mol･K) は無視できるほど小さいので、SantaLucia法以外では省略。https://doi.org/10.1093/nar/24.22.4501
			// -10.8 cal/(mol･K)はΔS initiation; DNA濃度の設定は https://doi.org/10.1073/pnas.95.4.1460 のEq.3を参照
			// 16.2はhttps://doi.org/10.1073/pnas.95.4.1460の∂ΔG/∂ln[Na+] = −0.175 kcal/mol → ∂Tm/∂log[Na+] = 16.2°C (when a sequence-independent ΔS° of −24.85 e.u. is assumed)を参照。基本的にはポリマーの16.6がよく使われる。
			//const tmNearestNeighbor = 1000 * sumProduct(pds, deltaHTable) / (initiationS + sumProduct(pds, deltaSTable) + 1.987 * Math.log(concDNA / 1000000) ) - 273.15 + 16.2 * Math.log10( (concNa + 120 * Math.sqrt(concMg - concDNTP) ) / 1000);
			const naMod = concNa + 120 * Math.sqrt(concMg - concDNTP);

			let deltaH = this.sumProduct(pds, deltaHTable);
			let deltaS = this.sumProduct(pds, deltaSTable);

			let tmNearestNeighbor;
			if (this.params.isTraditional.value){
				deltaS += initiationS;
				tmNearestNeighbor = 1000 * deltaH / (deltaS + 1.987 * Math.log(concDNA / 1000000000)) - 273.15 + 16.6 * Math.log10(naMod / 1000);
			} else {
				if (seq === rev){
					deltaH += deltaHTable.sym;
					deltaS += deltaSTable.sym;
				}
				switch(seq[0]){
					case "A":
					case "T":
						deltaH += deltaHTable.initTermAT;
						deltaS += deltaSTable.initTermAT;
						break;
					case "C":
					case "G":
						deltaH += deltaHTable.initTermGC;
						deltaS += deltaSTable.initTermGC;
						break;
				}
				switch(seq.slice(-1)[0]){
					case "A":
					case "T":
						deltaH += deltaHTable.initTermAT;
						deltaS += deltaSTable.initTermAT;
						break;
					case "C":
					case "G":
						deltaH += deltaHTable.initTermGC;
						deltaS += deltaSTable.initTermGC;
						break;
				}
				deltaS += 0.368 * (length - 1) * Math.log(naMod / 1000);
				tmNearestNeighbor = 1000 * deltaH / (deltaS + 1.987 * Math.log(concDNA / 1000000000)) - 273.15;

				// 右の式と計算値が合わない(Primer3Plusも同じアルゴリズムのはずのため、自分のほうがあっていると思う)。https://arep.med.harvard.edu/kzhang/cgi-bin/myOligoTm.cgi
				// 右の式とは、traditional, Sugimoto'sでほぼ合う。 https://www.biosyn.com/gizmo/tools/oligo/oligonucleotide%20properties%20calculator.htm
				// 右の式とは一致する。 https://www.primer3plus.com/index.html
			}
			console.log(`ΔH: ${deltaH.toFixed(2)}, ΔS: ${deltaS.toFixed(2)}`);

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

		getHSTable(){
			return Model.CONST.HS_VALUES[this.params.hsValues.value];
		}

		countsBases(seq) {
			return {
				A: (seq.match(/A/g) || []).length,
				C: (seq.match(/C/g) || []).length,
				G: (seq.match(/G/g) || []).length,
				T: (seq.match(/T/g) || []).length
			};
		}
		countsPd(seq) {
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
					// 正規表現でオーバーラップもカウント
					const regex = new RegExp(`(?=${dinuc})`, "g");
					const count = (seq.match(regex) || []).length;
					const key = `d${bases[i]}pd${bases[j]}`; // pApdA 形式のキー
					counts[key] = count;
				}
			}
			return counts;
		}

		// 同じキー同士をかけ合わせてその和を出す。
		sumProduct(obj1, obj2){
			const keys1 = Object.keys(obj1);
			const keys2 = Object.keys(obj2);
			// 少ない方のキーを基準にする
			const keys = keys1.length < keys2.length ? keys1 : keys2;

			return keys
				.filter(k => k in obj1 && k in obj2)
				.reduce((acc, k) => acc + obj1[k] * obj2[k], 0);
		}

		// absArrの値に基づいて、absorbanceのinputを更新
		refreshAbsRow(index){
			this.params.abs.value = this.absArr.map(v => v.value).join("\n");
			const rowResults = this.calculateValue(this.results[index].sequence, this.absArr[index].value);
			this.results[index] = rowResults;
			this.dispatchEvent(Model.CONST.REFLECT_CONC_RESULTS, index, rowResults);
		}

		downloadTSV() {
			if (!this.results.length) return;

			let tsv = [
					"Sequence", "Length", "Abs.", "Tm_Nearest Neighbor", "Tm_Wallace", 
					"ssDNA_ε(260 nm) /cm^−1･M^−1", "ssDNA_Conc. /μM", "ssDNA_Conc. /ng･μL^−1", "ssDNA_Mw", 
					"dsDNA_ε(260 nm) /cm^−1･M^−1", "dsDNA_Conc. /μM", "dsDNA_Conc. /ng･μL^−1", "dsDNA_Mw", 
					"GC /%", "A", "T", "C", "G", "[Na^+] /mM", "[Mg^2+] /mM", "[dNTPs] /mM", "[Primer] /nM", "Used Values for Tm", "Use Traditional Formula"
				].join("\t") + "\n";
			this.results.forEach(r => {
				Object.keys(r).forEach(key => {
					tsv += r[key] + "\t";
				});
				tsv += this.params.na.value + "\t" + this.params.mg.value + "\t" + this.params.dntp.value + "\t" + this.params.dna.value + "\t" + this.params.hsValues.value + "\t" + this.params.isTraditional.value + "\n";
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

        static get CONST() {
            return {
                VALUE_CHANGED: "VALUE_CHANGED",
				HS_VALUE_CHANGED: "HS_VALUE_CHANGED",
				FORMULA_TYPE_CHANGED: "FORMULA_TYPE_CHANGED",
				CALCULATED: "CALCULATED",
				REFLECT_CONC_RESULTS: "REFLECT_CONC_RESULTS",
				HS_VALUES: {
					// ΔH /kcal･mol^-1
					// ΔS /cal･mol^-1･K^-1
					// 注意: ΔHはkcalだが、ΔSはcal
					breslauer: {
						deltaHTable: { 
							dApdA: -9.1, dApdC: -6.5, dApdG: -7.8, dApdT: -8.6, 
							dCpdA: -5.8, dCpdC: -11.0, dCpdG: -11.9, dCpdT: -7.8, 
							dGpdA: -5.6, dGpdC: -11.1, dGpdG: -11.0, dGpdT: -6.5, 
							dTpdA: -6.0, dTpdC: -5.6, dTpdG: -5.8, dTpdT: -9.1, 
							initTermGC: 0, initTermAT: 0, sym: 0
						},
						deltaSTable: { 
							dApdA: -24.0, dApdC: -17.3, dApdG: -20.8, dApdT: -23.9, 
							dCpdA: -12.9, dCpdC: -26.6, dCpdG: -27.8, dCpdT: -20.8, 
							dGpdA: -13.5, dGpdC: -26.7, dGpdG: -26.6, dGpdT: -17.3, 
							dTpdA: -16.9, dTpdC: -13.5, dTpdG: -12.9, dTpdT: -24.0, 
							initTermGC: 0, initTermAT: 0, sym: 0
						},
						initiationS: -10.8,
						deltaGTable: {
							dApdA: -1.66, dApdC: -1.13, dApdG: -1.35, dApdT: -1.19, 
							dCpdA: -1.80, dCpdC: -2.75, dCpdG: -3.28, dCpdT: -1.35, 
							dGpdA: -1.41, dGpdC: -2.82, dGpdG: -2.75, dGpdT: -1.13, 
							dTpdA: -0.76, dTpdC: -1.41, dTpdG: -1.80, dTpdT: -1.66, 
							initTermGC: 2.60, initTermAT: 2.60, sym: 0
						},
					}, 
					sugimoto: {
						deltaHTable: { 
							dApdA: -8.0, dApdC: -9.4, dApdG: -6.6, dApdT: -5.6, 
							dCpdA: -8.2, dCpdC: -10.9, dCpdG: -11.8, dCpdT: -6.6, 
							dGpdA: -8.8, dGpdC: -10.5, dGpdG: -10.9, dGpdT: -9.4, 
							dTpdA: -6.6, dTpdC: -8.8, dTpdG: -8.2, dTpdT: -8.0, 
							initTermGC: 0, initTermAT: 0, sym: 0
						},
						deltaSTable: { 
							dApdA: -21.9, dApdC: -25.5, dApdG: -16.4, dApdT: -15.2, 
							dCpdA: -21.0, dCpdC: -28.4, dCpdG: -29.0, dCpdT: -16.4, 
							dGpdA: -23.5, dGpdC: -26.4, dGpdG: -28.4, dGpdT: -25.5, 
							dTpdA: -18.4, dTpdC: -23.5, dTpdG: -21.0, dTpdT: -21.9, 
							initTermGC: 0, initTermAT: 0, sym: 0
						},
						initiationS: -9,
						deltaGTable: {
							dApdA: -1.20, dApdC: -1.50, dApdG: -1.50, dApdT: -0.90, 
							dCpdA: -1.70, dCpdC: -2.10, dCpdG: -2.80, dCpdT: -1.50, 
							dGpdA: -1.50, dGpdC: -2.30, dGpdG: -2.10, dGpdT: -1.50, 
							dTpdA: -0.90, dTpdC: -1.50, dTpdG: -1.70, dTpdT: -1.20, 
							initTermGC: 1.70, initTermAT: 1.70, sym: 0
						},
					}, 
					santalucia: {
						deltaHTable: { 
							dApdA: -7.9, dApdC: -8.4, dApdG: -7.8, dApdT: -7.2, 
							dCpdA: -8.5, dCpdC: -8.0, dCpdG: -10.6, dCpdT: -7.8, 
							dGpdA: -8.2, dGpdC: -9.8, dGpdG: -8.0, dGpdT: -8.4, 
							dTpdA: -7.2, dTpdC: -8.2, dTpdG: -8.5, dTpdT: -7.9, 
							initTermGC: 0.1, initTermAT: 2.3, sym: 0
						},
						deltaSTable: { 
							dApdA: -22.2, dApdC: -22.4, dApdG: -21.0, dApdT: -20.4, 
							dCpdA: -22.7, dCpdC: -19.9, dCpdG: -27.2, dCpdT: -21.0, 
							dGpdA: -22.2, dGpdC: -24.4, dGpdG: -19.9, dGpdT: -22.4, 
							dTpdA: -21.3, dTpdC: -22.2, dTpdG: -22.7, dTpdT: -22.2, 
							initTermGC: -2.8, initTermAT: 4.1, sym: -1.4
						},
						initiationS: -10.8,
						deltaGTable: {
							dApdA: -1.00, dApdC: -1.44, dApdG: -1.28, dApdT: -0.88, 
							dCpdA: -1.45, dCpdC: -1.84, dCpdG: -2.17, dCpdT: -1.28, 
							dGpdA: -1.30, dGpdC: -2.24, dGpdG: -1.84, dGpdT: -1.44, 
							dTpdA: -0.58, dTpdC: -1.30, dTpdG: -1.45, dTpdT: -1.00, 
							initTermGC: 0.98, initTermAT: 1.03, sym: 0.43
						},
						/* // 1996年の方。1998年の方を使用するため、コメントアウト。
						deltaGTable: {
							dApdA: -1.02, dApdC: -1.43, dApdG: -1.16, dApdT: -0.73, 
							dCpdA: -1.38, dCpdC: -1.77, dCpdG: -2.09, dCpdT: -1.16, 
							dGpdA: -1.46, dGpdC: -2.28, dGpdG: -1.77, dGpdT: -1.43, 
							dTpdA: -0.60, dTpdC: -1.46, dTpdG: -1.38, dTpdT: -1.02, 
							initTermGC: 0.91, initTermAT: 1.11, sym: 0.43
						},
						*/
					}
				},
				MW_TABLE: { A: 313.21, C: 289.18, G: 329.21, T: 304.2 },
				
				// ε260 (モル吸光係数)
				EPSILON_TABLE_1: { 
					pdA: 15400, pdC: 7400, pdG: 11500, pdT: 8700
				},
				EPSILON_TABLE_2: { 
					dApdA: 27400, dApdC: 21200, dApdG: 25000, dApdT: 22800, 
					dCpdA: 21200, dCpdC: 14600, dCpdG: 18000, dCpdT: 15200, 
					dGpdA: 25200, dGpdC: 17600, dGpdG: 21600, dGpdT: 20000, 
					dTpdA: 23400, dTpdC: 16200, dTpdG: 19000, dTpdT: 16800 
				},
            };
        }
        constructor(){
            super();
            const self = this;
        }
    }
    
    // ViewとModelを双方向に繋ぐ。
    class Controller extends EventDispatcher{
        static get CONST() {
            return {
                ON_LOAD: "ON_LOAD",
				BIND_VIEWS: "BIND_VIEWS",
				RENDER_HS_TABLE: "RENDER_HS_TABLE",
				REFLECT_URL: "REFRECT_URL",
				REFLECT_RESULTS: "REFLECT_RESULTS",
            };
        }
        constructor(model){
            super();
            this.model = model;
            const self = this;
        }
		
		calculate(){
			if(this.model.params.seq.value.trim().length == 0){
				return;
			}
			// URLに値を反映
			this.dispatchEvent(Controller.CONST.REFLECT_URL, this.model.getSearch());
			// 実際に値を計算させる
			const results = this.model.calculateValues();
			this.dispatchEvent(Controller.CONST.REFLECT_RESULTS, results);
		}

		// 行のabsorbanceが変更されたときに検知、その行だけ再計算するようにDataBindingを設定する。
		bindResultAbs(input, absElement){
			absElement.bindElement(input);
			absElement.addValueChangeListener((newValue, oldValue) => {
				const newValueFloat = parseFloat("0" + newValue);
				const oldValueFloat = parseFloat("0" + oldValue);
				if(newValueFloat != oldValueFloat){
					this.model.refreshAbsRow(
						this.model.absArr.indexOf(absElement)
					);
				}
			});
		}

		clearInput(){
			if( window.confirm("Clear all your inputs?") ){
				const baseUrl = window.location.origin + window.location.pathname.replace(/[^/]+$/, "");
				location.href = baseUrl;
			}
		}

        onload(){
			this.dispatchEvent(Controller.CONST.BIND_VIEWS);
			this.model.loadParams();	// URLから初期値を変数に代入
			this.dispatchEvent(Controller.CONST.RENDER_HS_TABLE);
        }
    }
    class View extends EventDispatcher {
        static get CONST() {
            return {
            };
        }

		concTds = [];	// 各行ごとに、濃度に関連するtdのHTMLElementを保存。{conc_uM: ~, conc_nguL: ~, dsConc_uM: ~, dsConc_nguL: ~}

        constructor(model, controller) {
            super();
            const self = this;
            this.model = model;
            this.controller = controller;

			// eventlistenerの登録
			document.getElementById("calculateBtn").addEventListener("click", () => {this.controller.calculate()});
			document.getElementById("downloadBtn").addEventListener("click", () => {this.model.downloadTSV()});
			document.getElementById("clearBtn").addEventListener("click", () => {this.controller.clearInput()});

			// 長い配列を表示する用のモーダルの設定。
			modalOverlay.addEventListener("click", e => {
				if(e.target !== modalBox){
					modalOverlay.close();
				}
			});


			this.model.addEventListener(Model.CONST.HS_VALUE_CHANGED, () => {
				this.controller.calculate();
				this.drawHSValues();
			});
			this.model.addEventListener(Model.CONST.FORMULA_TYPE_CHANGED, () => {
				this.controller.calculate();
			});

			// Absが変更になった際に、その行の濃度だけ数値を修正する。
			this.model.addEventListener(Model.CONST.REFLECT_CONC_RESULTS, (index, results) => {
				const concTd = this.concTds[index];
				Object.keys(concTd).forEach(key => {
					concTd[key].textContent = results[key];
				});
			});

			// URLに値を反映する。
			this.controller.addEventListener(Controller.CONST.REFLECT_URL, (search) => {
				history.replaceState({}, '', search);
			});

			this.controller.addEventListener(Controller.CONST.BIND_VIEWS, () => {
				// 全ての入力欄をバインド
				this.model.params.seq.bindElement(document.getElementById("seq"));
				this.model.params.abs.bindElement(document.getElementById("abs"));
				this.model.params.na.bindElement(document.getElementById("naInput"));
				this.model.params.mg.bindElement(document.getElementById("mgInput"));
				this.model.params.dntp.bindElement(document.getElementById("dntpInput"));
				this.model.params.dna.bindElement(document.getElementById("dnaInput"));
				this.model.params.hsValues.bindElement(
					new DataBinding.BoundRadio(document.forms.hsValues.elements["hsValues"])
				);
				this.model.isCalculated.bindElement(
					new DataBinding.BoundEnabled(document.getElementById("downloadBtn"))
				);
				this.model.isCalculated.bindElement(
					new DataBinding.BoundEnabled(document.getElementById("clearBtn"))
				);
				this.model.params.isTraditional.bindElement(
					new DataBinding.BoundCheckbox(document.getElementById("traditional"))
				);
				this.model.params.isTraditional.bindElement(
					new DataBinding.BoundVisible(document.getElementById("formulaTraditional"))
				);
				this.model.params.isTraditional.bindElement(
					new DataBinding.BoundInvisible(document.getElementById("formulaSantaLucia"))
				);
			});
			this.controller.addEventListener(Controller.CONST.RENDER_HS_TABLE, () => {
				this.drawHSValues();
			});

			this.controller.addEventListener(Controller.CONST.REFLECT_RESULTS, (results) => {
				this.renderTable(results);
			});
        }
		
		// モーダルダイアログの設定
		modalOverlay = document.getElementById("modalOverlay");
		modalBox = document.getElementById("modalBox");
		showModal(text){
			this.modalBox.textContent = text;
			this.modalOverlay.showModal();
		}

		// ΔH, ΔSの値をページ上に反映
		drawHSValues(){
			const hvalues = document.getElementById("hvalues");
			const hsTable = this.model.getHSTable();
			while (hvalues.childElementCount > 2) {hvalues.removeChild(hvalues.lastChild);}
			Object.entries(hsTable.deltaHTable).forEach(([key, value]) => {
				const td = document.createElement("td");
				td.textContent = value;
				hvalues.appendChild(td);
			});
			const svalues = document.getElementById("svalues");
			while (svalues.childElementCount > 2) {svalues.removeChild(svalues.lastChild);}
			Object.entries(hsTable.deltaSTable).forEach(([key, value]) => {
				const td = document.createElement("td");
				td.textContent = value;
				svalues.appendChild(td);
			});
		}
		
		renderTable(results) {
			const resultsContainer = document.getElementById("results");
			while(resultsContainer.firstChild){
				resultsContainer.removeChild(resultsContainer.firstChild);
			}
			this.concTds.splice(0);	// 濃度関連のtdのHTMLElementを保持しておく配列をリセット。
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
				this.concTds.push({conc_uM: null, conc_nguL: null, dsConc_uM: null, dsConc_nguL: null});
				Object.keys(r).forEach(key => {
					const value = r[key];
					const td = document.createElement("td");
					tr.appendChild(td);
					td.classList.add(key);
					switch(key){
						case "abs":
							const input = document.createElement("input");
							input.setAttribute("type", "text");
							input.classList.add("abs-input");
							this.controller.bindResultAbs(input, this.model.absArr[i]);
							td.appendChild(input);
							break;
						case "sequence":
							td.setAttribute("title", value);
							td.style.cursor = "pointer";
							td.addEventListener("click", e =>{
								this.showModal(value);
							});
							td.textContent = value;
							break;
						case "conc_uM":
						case "conc_nguL":
						case "dsConc_uM":
						case "dsConc_nguL":
							this.concTds.slice(-1)[0][key] = td;
							td.textContent = value;
							break;
						default:
							td.textContent = value;
							break;
					}
				});
			});
			resultsContainer.appendChild(table);
		}
    }
    // MVCをまとめるだけ。
    class App {
        constructor(){
            const model = new Model();
            const controller = new Controller(model);
            const view = new View(model, controller);
            controller.onload();
        }
    }
    // ロード時にオブジェクトだけ作成
    window.onload = function () {
        let app = new App();
    };
})();