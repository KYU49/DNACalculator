/*!
 * MIT License
 * 
 * Copyright (c) 2025 KYU @ https://github.com/KYU49
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */


export class DataBinding{
    /**
     * @typedef {[BoundElement]} #boundElements この変数にbindされているhtml elementと、bindの情報。
     * @typedef {Object} #value ここに値が入る。getterとsetterで制御。
     * @typedef {boolean} overrideWithState 例えばページを更新した際に、前の入力が残っていた場合、
     * true: 前の入力で変数を上書き; false: 変数のデフォルト値でelementの値を書き換え。
     * @typedef {boolean} globalOverrideWithState 以降に作られるobjectの全てのisStateOverrideはこの値になる。
     */
    #value;
    #boundElements = [];
    #boundListeners = [];

    /**
     * 値変更時に呼び出されるコールバック関数。
     * @callback ValueChangeListener
     * @param {*} newValue - 変更後の値
     * @param {*} oldValue - 変更前の値
     */
    #valueChangeListeners = [];
    
    overrideWithState;
    static globalOverrideWithState = false;

    constructor(initialVal){
        this.#value = initialVal;
        this.overrideWithState = DataBinding.globalOverrideWithState;
    }

    get value(){
        return this.#value;
    }
    set value(newValue){
        // 各エレメントに値の変更を通知
        if(this.#value != newValue){
            let oldValue = this.#value;
            for(const tempElement of this.#boundElements){
                tempElement.value2element(newValue, tempElement.element);
            }
            this.#value = newValue;
            for(const listener of this.#valueChangeListeners){
                listener(newValue, oldValue);
            }
        }
    }

    static BoundElement = class {

        /**
         * 値が変更されたときに発火。html elementに変更された新しい値を通知する。defaultではinputのvalue。
         * @param {DataBinding} parent 呼び出し元のDataBinding自体。主に`parent.value = hoge;`として使う
         * @param {Element} element 通知先のElement
         *
         * html elementの値が変更された(eventListenerTypeが呼ばれた)ときに発火。html elementから値(defaultではvalue)を読み込み、変数に代入する。
         * @param {Element} element 値が変更されたelement。
         * @return {string | boolean | number} 変更後の値。これが自動でproxyに設定される。
         * 
         * html elementのどのeventlistenerに応じて値の変更を監視するか。
         * @param {string} eventListenerType inputとかchangedとか。
         */
        constructor(element, 
            value2element = (newValue, element) => {}, 
            element2value =(parent, element) => {},
            eventListenerType = null
        ){
            this.element = element;
            this.value2element = value2element;
            this.element2value = element2value;
            this.eventListenerType = eventListenerType;
        }
    }
    // `input type="text"`や`textarea`などにbindしたい場合のテンプレート
    static BoundInputText = class extends DataBinding.BoundElement {
        constructor(element){
            super(element, 
                (newValue, element) => {
                    // 一応カーソル位置を保持。javascriptのselectionは文字数より大きい値を入れてもerrorを出さない。
                    let start = element.selectionStart;
                    let end = element.selectionEnd;
                    element.value = newValue;
                    element.selectionStart = start;
                    element.selectionEnd = end;
                },
                (parent, element) => {
                    parent.value = element.value;
                },
                "input"
            );
        }
    }
    // 要素のinnerHTMLにbindしたい場合のテンプレート
    static BoundInnerHTML = class extends DataBinding.BoundElement{
        constructor(element){
            super(element,
                (newValue, element) => {
                    element.innerHTML = newValue;
                }
            )
        }
    }
    // checkboxにbindしたい場合のテンプレート
    static BoundCheckbox = class extends DataBinding.BoundElement{
        constructor(element){
            super(element,
                (newValue, element) => {
                    element.checked = newValue;
                },
                (parent, element) => {
                    parent.value = element.checked;
                },
                "change"
            )
        }
    }
    // input radioにbindしたい場合のテンプレート
    // document.forms.formName.elements["radio_input_name"]を渡すこと。
    static BoundRadio = class extends DataBinding.BoundElement{
        constructor(element){
            super(element, 
                (newValue, element) => {
                    element.value = newValue;
                },
                (parent, element) => {
                    parent.value = element.value;
                },
                "change"
            );
        }
    }
    // booleanの数値に対して、elementの可視化状態をbindしたい場合のテンプレート。別途cssで`.hidden{display: "none";}`の指定が必要
    static BoundVisible = class extends DataBinding.BoundElement{
        constructor(element){
            super(element,
                (newValue, element) => {
                    if(newValue){
                        if(element.classList.contains("hidden")){
                            element.classList.remove("hidden");
                        }
                    } else {
                        element.classList.add("hidden");
                    }
                }
            )
        }
    }
    // booleanの数値に対して、elementの可視化状態をbindしたい場合のテンプレート。trueで消える。別途cssで`.hidden{display: "none";}`の指定が必要
    static BoundInvisible = class extends DataBinding.BoundElement{
        constructor(element){
            super(element,
                (newValue, element) => {
                    if(!newValue){
                        if(element.classList.contains("hidden")){
                            element.classList.remove("hidden");
                        }
                    } else {
                        element.classList.add("hidden");
                    }
                }
            )
        }
    }
    // booleanの数値に対して、elementのdisabled状態をbindしたい場合のテンプレート。
    static BoundEnabled = class extends DataBinding.BoundElement{
        constructor(element){
            super(element,
                (newValue, element) => {
                    element.disabled = !newValue;
                }
            )
        }
    }
    // booleanの数値に対して、elementのdisabled状態をbindしたい場合のテンプレート。
    static BoundDisabled = class extends DataBinding.BoundElement{
        constructor(element){
            super(element,
                (newValue, element) => {
                    element.disabled = newValue;
                }
            )
        }
    }

    /**
     * 指定した任意のelementに値をbindする。
     * @param {DataBinding.BoundElement | Element} newElement 通知先のelementを含むboundElement object。Elemmentが渡された場合はBoundInputTextに入れる。
     */
    bindElement(newElement){
        const self = this;
        // HTML Elemmentが渡された場合はBoundInputTextに入れる。
        const boundElement = (newElement instanceof DataBinding.BoundElement) ? newElement : new DataBinding.BoundInputText(newElement);
        // この変数にbindされているElement集に追加
        this.#boundElements.push(boundElement);
        // eventlistenerが指定されていれば、設定。
        if(boundElement.eventListenerType != null){
            if(boundElement.element instanceof RadioNodeList){
                Array.from(boundElement.element).forEach(radio => {
                    const listener = () => {
                        boundElement.element2value(self, boundElement.element);
                    };
                    radio.addEventListener("change", listener);
                    this.#boundListeners.push({element: radio, listener: listener});
                });
            } else {
                const listener = () => {
                    boundElement.element2value(self, boundElement.element);
                };
                boundElement.element.addEventListener(boundElement.eventListenerType, listener);
                this.#boundListeners.push({element: boundElement.element, listener: listener});
            }

            // 更新前の情報が残ってしまうことがあるため、どちらかの値で上書きする。
            if(this.overrideWithState){
                boundElement.element2value(self, boundElement.element);
            } else {
                boundElement.value2element(this.value, boundElement.element);
            }
        }
    }

    /**
     * 指定したelementまたはBoundElementをunbindする。
     * @param {DataBinding.BoundElement | Element} targetElement 解除したいelementまたはBoundElement
     */
    unbindElement(targetElement){
        const isBoundElement = targetElement instanceof DataBinding.BoundElement;
        const boundElement = isBoundElement
            ? targetElement
            : this.#boundElements.find(be => be.element === targetElement);

        if(!boundElement) return;

        // イベントリスナー削除
        if(boundElement.eventListenerType != null){
            if(boundElement.element instanceof RadioNodeList){
                Array.from(boundElement.element).forEach(radio => {
                    const listener = this.#boundListeners.find(be => be.element == radio);
                    if(listener){
                        radio.removeEventListener("change", listener);
                    }
                });
            } else {
                const listener = this.#boundListeners.find(be => be.element == boundElement.element);
                if(listener){
                    boundElement.element.removeEventListener(
                        boundElement.eventListenerType,
                        boundElement._listener
                    );
                }
            }
        }

        // 配列から削除
        this.#boundElements = this.#boundElements.filter(be => be !== boundElement);
    }

    /**
     * 値が変わった時(valueの値が変更された時)に実行する処理を変数に追加する。
     * @param {ValueChangeListener} listener - 新しい値が設定された時に呼び出されるコールバック。
     */
    addValueChangeListener(listener){
        this.#valueChangeListeners.push(listener);
    }
    /**
     * 値が変わった時に実行する処理を削除する。
     * @param {ValueChangeListener} listener - 解除したいコールバック関数。
     * `addValueChangeListener` で登録したものと同じ参照である必要があります。
     */
    removeValueChangeListener(listener){
        this.#valueChangeListeners.splice(this.#valueChangeListeners.indexOf(listener));
    }
}