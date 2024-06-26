import * as vscode from 'vscode';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "generate-random-color" is now active!');

	// プレビュー用のwebView配置
	const provider_cvp = new ColorsViewProvider(context.extensionUri);
	const colorsWebView = vscode.window.registerWebviewViewProvider(ColorsViewProvider.viewType, provider_cvp);
	context.subscriptions.push(colorsWebView);

	// 色をランダムに生成する
	const generateColorCommand = vscode.commands.registerCommand('generate-random-color.genColor', () => {
		provider_cvp.genColor();
	});
	context.subscriptions.push(generateColorCommand);

	// 生成した色をクリアする
	const clearColorsCommand = vscode.commands.registerCommand('generate-random-color.clearColors', () => {
		provider_cvp.clearColors();
	});
	context.subscriptions.push(clearColorsCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}

class ColorsViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'generate-random-color.colorsView';
	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// Javascript側からのメッセージを受けとって処理する
		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'colorSelected':
					{
						vscode.window.showInformationMessage(`Copied! #${data.value}`);
						break;
					}
				case 'debug':
					{
						vscode.window.showInformationMessage(`debug! ${data.value}`);
						break;
					}
				case 'debug2':
					{
						vscode.window.showInformationMessage(`debug2! ${data.value}`);
						break;
					}
			}
		});
	}

	public genColor() {
		if (this._view) {
			this._view.show?.(true);
			this._view.webview.postMessage({ type: 'genColor' });
		}
	}

	public clearColors() {
		if (this._view) {
			this._view.webview.postMessage({ type: 'clearColors' });
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title>Cat Colors</title>
			</head>
			<body>
				<ul class="field-list">
				</ul>

				<button class="add-color-button">Generate Random Color</button>

				<ul class="color-list">
				</ul>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

// 32文字のランダムな文字列を生成する
function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
