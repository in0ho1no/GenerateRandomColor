//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    // 16進カラーコードの長さ
    const COLOR_STRING_MAX_LEN = 6;
    // カラーリストの最大数
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
     * カラー追加ボタンを作成する。
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
     * @param {Array<{ value: string }>} colors
     */
    function createColorList(colors) {
        createColorInput('000000');
        updateColorList(colors);
    }

    /**
     * @param {string} color
     */
    function createColorInput(color) {
        const ul = document.querySelector('.field-list');
        if (null === ul) {
            return;
        }
        ul.textContent = '';

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
                const convColor = convInput2HexColor(target.value);
                createColorInput(convColor);
            }
        });
        ul.appendChild(input);
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
            // 2色ずつ利用するので即continueする
            if (1 === (index % 2)) {
                continue;
            }

            const colorBG = colors[index].value;
            const colorTxT = colors[index+1].value;

            const li = document.createElement('li');
            li.className = 'color-entry';

            const colorPreviewBG = document.createElement('div');
            colorPreviewBG.className = 'color-preview';
            colorPreviewBG.style.backgroundColor = `#${colorBG}`;
            colorPreviewBG.addEventListener('click', () => {
                onColorClicked(colorBG);
                navigator.clipboard.writeText(colorBG);
            });
            li.appendChild(colorPreviewBG);

            const colorPreviewTXT = document.createElement('div');
            colorPreviewTXT.className = 'color-preview';
            colorPreviewTXT.style.backgroundColor = `#${colorTxT}`;
            colorPreviewTXT.addEventListener('click', () => {
                onColorClicked(colorTxT);
                navigator.clipboard.writeText(colorTxT);
            });
            li.appendChild(colorPreviewTXT);

            const sampleText = document.createElement('div');
            sampleText.className = 'sample-text';
            sampleText.style.backgroundColor = colorPreviewBG.style.backgroundColor;
            sampleText.style.color = colorPreviewTXT.style.backgroundColor;
            sampleText.textContent = 'ABCサンプル123';
            // テキストを選択禁止にする
            sampleText.addEventListener('selectstart', (event) => {
                event.preventDefault();
            });
            li.appendChild(sampleText);

            const swapColor = document.createElement('div');
            swapColor.className = 'swap-color';
            swapColor.style.backgroundColor = colorPreviewBG.style.backgroundColor;
            swapColor.style.color = colorPreviewTXT.style.backgroundColor;
            swapColor.textContent = '⇔';
            swapColor.addEventListener('click', () => {
                const tempSwap = sampleText.style.backgroundColor;
                sampleText.style.backgroundColor = sampleText.style.color;
                sampleText.style.color = tempSwap;
            });
            // テキストを選択禁止にする
            swapColor.addEventListener('selectstart', (event) => {
                event.preventDefault();
            });
            li.appendChild(swapColor);

            ul.appendChild(li);
        }

        // Update the saved state
        vscode.setState({ colors: colors });
    }

    /**
     * 入力された文字列を、16進文字列6桁の色コードに変換して返す。
     * 入力が空の場合は '000000' を返す。
     * @param {string} inputStr - 入力された文字列
     * @returns {string} 変換された16進文字列6桁の色コード
     */
    function convInput2HexColor(inputStr) {
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
