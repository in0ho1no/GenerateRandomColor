//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    // 16進色コードの長さ
    const COLOR_STRING_MAX_LEN = 6;
    // 色リストの最大数
    const MAX_COLOR_LIST = 10;

    // VS Code APIを取得
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    // 保存された状態を取得し、存在しない場合は初期化
    const oldState = vscode.getState() || { colors: [] };

    /**
     * 色のリスト
     * @type {Array<{ value: string }>}
     */
    let colors = oldState.colors;

    /**
     * 拡張機能からWebviewへのメッセージを処理するイベントリスナーを追加
     */
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'genColor':
                {
                    generateColorPair();
                    break;
                }
            case 'clearColors':
                {
                    colors = [];
                    updateColorList(colors);
                    break;
                }

        }
    });

    // 色追加ボタンを用意
    createAddColorButton();

    // 色リストを作成
    createColorList(colors);

    /**
     * 色追加ボタンを作成する。
     */
    function createAddColorButton() {
        const addBtn = document.querySelector('.add-color-button');
        if (null !== addBtn) {
            // クリックイベントを追加する
            addBtn.addEventListener('click', () => {
                generateColorPair();
            });
        }
    }

    /**
     * 色入力フィールドを作成する。
     * フィールドの背景色は入力された色コードとなる。
     * フィールドの文字色は入力された色コードの補色となる。
     * @param {string} color - 16進文字列6桁の色コード 'RRGGBB'
     * @returns {HTMLInputElement} - 作成された色入力フィールド
     */
    function createInputColorField(color) {
        const input = document.createElement('input');
        input.className = 'color-input';
        input.type = 'text';
        input.maxLength = COLOR_STRING_MAX_LEN + 1;
        input.value = color;
        input.style.backgroundColor = `#${color}`;
        input.style.color = `#${getComplementaryColor(color)}`;
        input.addEventListener('change', (e) => {
            const target = e.target;
            if (target instanceof HTMLInputElement) {
                const convColor = convertInput2HexColor(target.value);
                updateInputList(convColor);
            }
        });
        return input;
    }

    /**
     * 色プレビュー領域を作成する
     * @param {string} color - 16進文字列6桁の色コード 'RRGGBB'
     * @returns {HTMLDivElement} - 作成された色プレビュー領域
     */
    function createColorPreview(color){
        const colorPreview = document.createElement('div');
        colorPreview.className = 'color-preview';
        colorPreview.style.backgroundColor = `#${color}`;
        colorPreview.addEventListener('click', () => {
            onColorClicked(color);
            navigator.clipboard.writeText(color);
        });
        return colorPreview;
    }

    /**
     * サンプルテキスト領域を作成する
     * @param {string} colorBG - 背景色とする16進文字列6桁の色コード 'RRGGBB'
     * @param {string} colorTXT - 文字色とする16進文字列6桁の色コード 'RRGGBB'
     * @returns {HTMLDivElement} - 作成されたテキストプレビュー領域
     */
    function createTextPreview(colorBG, colorTXT){
        const sampleText = document.createElement('div');
        sampleText.className = 'sample-text';
        sampleText.style.backgroundColor = `#${colorBG}`;
        sampleText.style.color = `#${colorTXT}`;
        sampleText.textContent = 'ABCサンプル123';
        // テキストを選択禁止にする
        sampleText.addEventListener('selectstart', (event) => {
            event.preventDefault();
        });
        return sampleText;
    }

    /**
     * 色入れ替えボタンを作成する
     * @param {HTMLDivElement} textField - 背景色と前景色を入れ替えたいテキストフィールド
     * @returns {HTMLDivElement} - 作成された入れ替えボタン
     */
    function createSwapColorButton(textField){
        const swapColor = document.createElement('div');
        swapColor.className = 'swap-color';
        swapColor.style.backgroundColor = textField.style.backgroundColor;
        swapColor.style.color = textField.style.color;
        swapColor.textContent = '⇔';
        swapColor.addEventListener('click', () => {
            const tempSwap = textField.style.backgroundColor;
            textField.style.backgroundColor = textField.style.color;
            textField.style.color = tempSwap;
        });
        // テキストを選択禁止にする
        swapColor.addEventListener('selectstart', (event) => {
            event.preventDefault();
        });
        return swapColor;
    }

    /**
     * @param {Array<{ value: string }>} colors
     */
    function createColorList(colors) {
        updateInputList('000000');
        updateColorList(colors);
    }

    /**
     * 任意の色コードによる色の生成欄を設ける
     * @param {string} color - 16進文字列の色コード
     */
    function updateInputList(color) {
        const ul = document.querySelector('.field-list');
        if (null === ul) {
            return;
        }
        ul.textContent = '';

        const li = document.createElement('li');
        li.className = 'color-row';

        // 各フィールドを作成
        const inputColorField = createInputColorField(color);
        const colorPreviewBG = createColorPreview(converRGB2HexColor(inputColorField.style.backgroundColor));
        const colorPreviewTXT = createColorPreview(converRGB2HexColor(inputColorField.style.color));
        const swapColorButton = createSwapColorButton(inputColorField);

        // 作成したフィールドを配置する
        li.appendChild(colorPreviewBG);
        li.appendChild(colorPreviewTXT);
        li.appendChild(inputColorField);
        li.appendChild(swapColorButton);

        ul.appendChild(li);
    }

    /**
     * @param {Array<{ value: string }>} colors
     */
    function updateColorList(colors) {
        const ul = document.querySelector('.color-list');
        if (null === ul) {
            return;
        }
        ul.textContent = '';

        for (const [index, color] of colors.entries()) {
            // 2色ずつ利用する
            if (1 === (index % 2)) {
                continue;
            }

            const colorBG = colors[index].value;
            const colorTxT = colors[index+1].value;

            const li = document.createElement('li');
            li.className = 'color-row';

            const colorPreviewBG = createColorPreview(colorBG);
            li.appendChild(colorPreviewBG);

            const colorPreviewTXT = createColorPreview(colorTxT);
            li.appendChild(colorPreviewTXT);

            const textPreview = createTextPreview(colorBG, colorTxT);
            li.appendChild(textPreview);

            const swapColorButton = createSwapColorButton(textPreview);
            li.appendChild(swapColorButton);

            ul.appendChild(li);
        }

        // 色リストを更新する
        vscode.setState({ colors: colors });
    }

    /**
     * 入力された文字列を、16進文字列6桁の色コードに変換して返す。
     * 入力が空の場合は '000000' を返す。
     * @param {string} inputStr - 入力された文字列
     * @returns {string} 変換された16進文字列6桁の色コード
     */
    function convertInput2HexColor(inputStr) {
        if (!inputStr) {
            return '000000';
        }

        // 16進数以外の文字を空文字に置き換える。
        let valueConv = inputStr.replace(/[^0-9A-Fa-f]/g, '');

        // 16進文字列6桁にする
        valueConv = valueConv.substring(0, COLOR_STRING_MAX_LEN).padStart(COLOR_STRING_MAX_LEN, '0');
        return valueConv;
    }

    /**
     * 入力されたRGBを、16進文字列6桁の色コードに変換して返す。
     * @param {string} rgbColor - RGB形式の色コード
     * @returns {string} 変換された16進文字列6桁の色コード
     */
    function converRGB2HexColor(rgbColor){
        const rowColor = rgbColor.replace(/[rgb(|)]/g,"");
        const splitColor = rowColor.split(", ");
        const hexR = parseInt(splitColor[0], 10).toString(16).padStart(2, '0').toUpperCase();
        const hexG = parseInt(splitColor[1], 10).toString(16).padStart(2, '0').toUpperCase();
        const hexB = parseInt(splitColor[2], 10).toString(16).padStart(2, '0').toUpperCase();
        return `${hexR}${hexG}${hexB}`;
    }

    /**
     * 色がクリックされたときにメッセージを表示する
     * @param {string} color - 選択された16進文字列の色コード
     */
    function onColorClicked(color) {
        vscode.postMessage({ type: 'colorSelected', value: color });
    }

    /**
     * ランダムな色とその補色からなるペアを生成してリストに追加する
     */
    function generateColorPair() {
        if (MAX_COLOR_LIST*2 > colors.length) {
            const randomColor = getRandomColor();
            colors.push({ value: randomColor });
            colors.push({ value: getComplementaryColor(randomColor) });
            updateColorList(colors);
        }
    }

    /**
     * ランダムな色コードを取得する。
     * @returns {string} 16進文字列6桁の色コード 'RRGGBB'
     */
    function getRandomColor() {
        /**
         * 0から255までのランダムな整数を生成
         * 16進文字列に変換
         * 0パティングにより最低2文字の文字列とする
         * @returns {string} ランダムな16進文字列2桁
         */
        function getRandomHex() {
            return Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        }
        const r = getRandomHex();
        const g = getRandomHex();
        const b = getRandomHex();
        return `${r}${g}${b}`;
    }

    /**
     * 指定した色コードの補色を取得する。
     * @param {string} hexColor - 16進文字列6桁の色コード 'RRGGBB'
     * @returns {string} 16進文字列6桁の補色 'RRGGBB'.
     */
    function getComplementaryColor(hexColor) {
        // RGB各要素を16進文字列から10進数値に変換
        const r = parseInt(hexColor.substring(0, 2), 16);
        const g = parseInt(hexColor.substring(2, 4), 16);
        const b = parseInt(hexColor.substring(4, 6), 16);
        
        // 補色を計算して16進文字列に戻す
        const complementaryR = (255 - r).toString(16).padStart(2, '0').toUpperCase();
        const complementaryG = (255 - g).toString(16).padStart(2, '0').toUpperCase();
        const complementaryB = (255 - b).toString(16).padStart(2, '0').toUpperCase();
        return `${complementaryR}${complementaryG}${complementaryB}`;
    }
}());
