The English version of this document is provided at the end. Please note that it is machine-translated and may not be fully accurate.  


# DNA Calculator

複数のDNA配列から、**Tm**、**260 nmの吸光係数**、**分子量 (Mw)**を、**ssDNA**および**dsDNA**について簡単に計算できるウェブアプリとExcelシートです。

## ウェブアプリ
アクセス: [https://kyu49.github.io/DNACalculator/](https://kyu49.github.io/DNACalculator/)  

- 左のテキストエリアに複数のDNA配列を改行区切りで入力。  
- 右のテキストエリアに260 nmの吸光度を入力すると濃度を計算可能 (任意)。  
- 結果はブラウザで確認でき、**TSVファイル**としてダウンロード可能。

## Excel
ダウンロード: [DNACalculator.xltx](https://github.com/KYU49/DNACalculator/raw/refs/heads/main/DNACalculator.xltx)  
ウェブアプリと同じ計算が可能です。

## アルゴリズム
- **Tm**と**吸光係数**は**Nearest Neighbor法**で計算。  



# DNA Calculator

A web app and Excel sheet to quickly calculate **Tm**, **extinction coefficient**, and **molecular weight (Mw)** for both **ssDNA** and **dsDNA** from multiple sequences.

## Web App
Access here: [https://kyu49.github.io/DNACalculator/](https://kyu49.github.io/DNACalculator/)  

- Enter multiple DNA sequences in the left text area (line-separated).  
- Optionally enter 260 nm absorbance in the right text area to calculate concentration.  
- View results in the browser or download as a **TSV file**.

## Excel
Download: [DNACalculator.xltx](https://github.com/KYU49/DNACalculator/raw/refs/heads/main/DNACalculator.xltx)  
Performs the same calculations as the web app.

## Algorithm
- **Tm** and **molar absorptivity** are calculated using the **Nearest Neighbor method**.  

