//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const MAX_LEN_COLOR = 6;
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    const oldState = vscode.getState() || { colors: [] };

    /** @type {Array<{ value: string }>} */
    let colors = oldState.colors;

    createColorList(colors);

    const addBtn = document.querySelector('.add-color-button');
    if (null !== addBtn) {
        addBtn.addEventListener('click', () => {
            genColor();
        });
    }

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'genColor':
                {
                    genColor();
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
        input.maxLength = MAX_LEN_COLOR + 1;
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

    // 入力された文字列を、16進色コードとして解釈可能な文字列に変換して返す
    /**
     * @param {string} inputStr
     */
    function convInput2HexColor(inputStr) {
        let valueConv = inputStr;
        if (!valueConv) {
            // Treat empty value as delete
            valueConv = "000000";
        }

        // Replace non-hexadecimal characters with empty strings
        valueConv = valueConv.replace(/[^0-9A-Fa-f]/g, '');

        // Limit string to 6 characters
        if (MAX_LEN_COLOR < valueConv.length) {
            valueConv = valueConv.substring(0, MAX_LEN_COLOR);
        } else {
            valueConv = valueConv.padStart(MAX_LEN_COLOR, '0');
        }
        return valueConv;
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
     * @param {string} color 
     */
    function onColorClicked(color) {
        vscode.postMessage({ type: 'colorSelected', value: color });
    }

    function genColor() {
        if (10 > (colors.length / 2)) {
            const rndmColor = getRandomColor();
            colors.push({ value: rndmColor });
            colors.push({ value: getComplementaryColor(rndmColor) });
            updateColorList(colors);
        }
    }

    /**
     * @returns string
     */
    function getRandomColor() {
        // 0から255までのランダムな整数を生成し、それを16進数形式に変換
        const r = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        const g = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        const b = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        // 16進数形式のRGB値を合成してCSS形式の色コードに変換
        const color = `${r}${g}${b}`;
        return color;
    }

    /**
     * @returns string
     */
    function getComplementaryColor(hexColor) {
        // 16進数形式の色コードをRGBに変換
        const r = parseInt(hexColor.substring(1, 3), 16);
        const g = parseInt(hexColor.substring(3, 5), 16);
        const b = parseInt(hexColor.substring(5, 7), 16);
    
        // 補色を計算
        const complementaryR = 255 - r;
        const complementaryG = 255 - g;
        const complementaryB = 255 - b;
        const complementaryHexColor = `${complementaryR.toString(16).padStart(2, '0')}${complementaryG.toString(16).padStart(2, '0')}${complementaryB.toString(16).padStart(2, '0')}`;
        return complementaryHexColor.toUpperCase(); // 補色を返す（大文字）
    }

}());
