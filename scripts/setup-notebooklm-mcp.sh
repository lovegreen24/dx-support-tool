#!/bin/bash
set -e

# NotebookLM(2026年7月よりGemini Notebookへ改称)MCP連携の導入プリフライト。
#
# 前提: NotebookLMには一般向けの公開APIが存在しない(公式APIはGoogle Cloudの
# Gemini Notebook Enterprise版のみ)。そのため本連携はChrome自動操作型の
# サードパーティMCP `notebooklm-mcp`(MIT)を利用する。認証はコンサルタント本人の
# Googleセッション(永続Chromeプロファイル)に依存するため、hosting型は必ず local。
# cloud_proxy(Cloudflare Workers)には載せられない。
#
# このスクリプトは環境の事前確認のみを行う。実際のGoogleログインは、Claude Code上で
# MCPツール `setup_auth` を1回実行する(ブラウザウィンドウが開く)。

NOTEBOOKLM_MCP_VERSION="2.0.0"
SKIP_WARMUP=0
for arg in "$@"; do
  case "$arg" in
    --skip-warmup) SKIP_WARMUP=1 ;;
    *) echo "不明な引数: $arg (使用可能: --skip-warmup)"; exit 1 ;;
  esac
done

echo "========================================="
echo "  NotebookLM MCP 導入プリフライト"
echo "========================================="
echo ""

# ===== 1. Node.js =====
if ! command -v node >/dev/null 2>&1; then
  echo "❌ node が見つかりません(notebooklm-mcp は Node.js >=18 が必要)"
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "❌ Node.js $(node -v) は非対応です(>=18 が必要)"
  exit 1
fi
echo "✅ Node.js $(node -v)"

if ! command -v npx >/dev/null 2>&1; then
  echo "❌ npx が見つかりません"
  exit 1
fi
echo "✅ npx $(npx --version)"

# ===== 2. WSL判定(本プロジェクトはWSL2前提。M-009 OCR抽出と同じ制約) =====
IS_WSL=0
if grep -qi microsoft /proc/version 2>/dev/null; then
  IS_WSL=1
  if grep -qi "wsl2" /proc/version 2>/dev/null; then
    echo "✅ WSL2 を検出"
  else
    echo "❌ WSL1 と思われる環境です。notebooklm-mcp は WSL1 非対応のため WSL2 へ移行してください"
    exit 1
  fi
fi

# ===== 2b. ディスプレイ必須チェック =====
# setup_auth は「可視Chromeを開いて人間がGoogleログインする」フローのため、画面が無い環境
# (クラウド実行のClaude Code・WSLgなしのWSL2・headlessサーバー)では必ず失敗する。
# 実際に画面の無い環境で setup_auth を実行し、10分近く待ってから失敗する事故が起きたため、
# ここで先に落として無駄な待ち時間を防ぐ。
if [ -z "${DISPLAY:-}" ] && [ -z "${WAYLAND_DISPLAY:-}" ]; then
  echo "❌ DISPLAY/WAYLAND_DISPLAY が未設定です(画面の無い環境)"
  echo ""
  echo "   setup_auth は可視Chromeウィンドウでの手動Googleログインが前提のため、この環境では"
  echo "   必ず失敗します(タイムアウトまで待たされた末に失敗する)。"
  echo ""
  echo "   よくある原因:"
  echo "     - クラウド上のClaude Code(ブラウザ/アプリ版)で実行している"
  echo "       → 本人のPCのターミナルから 'claude' を起動して実行すること"
  if [ "$IS_WSL" -eq 1 ]; then
    echo "     - WSL2でWSLgが有効になっていない"
    echo "       → Windows 11 で 'wsl --update' 後、WSLを再起動すること"
  fi
  echo ""
  echo "   ※ 上流READMEはheadlessサーバー向けにxvfb-runを案内しているが、仮想ディスプレイは"
  echo "      画面が見えずログイン操作ができないため、本プロジェクトでは採用しない。"
  exit 1
fi
echo "✅ ディスプレイ環境あり(DISPLAY=${DISPLAY:-$WAYLAND_DISPLAY})"

# ===== 3. Chrome(無い場合は同梱Chromiumにフォールバック) =====
if command -v google-chrome >/dev/null 2>&1 || command -v google-chrome-stable >/dev/null 2>&1; then
  echo "✅ Google Chrome を検出"
else
  echo "⚠️  Google Chrome が見つかりません。同梱の Patchright Chromium で動作します"
  echo "    (明示する場合: BROWSER_CHANNEL=chromium)"
fi

# ===== 4. パッケージ解決確認(バージョン固定) =====
RESOLVED="$(npm view "notebooklm-mcp@${NOTEBOOKLM_MCP_VERSION}" version 2>/dev/null || true)"
if [ "$RESOLVED" != "$NOTEBOOKLM_MCP_VERSION" ]; then
  echo "❌ notebooklm-mcp@${NOTEBOOKLM_MCP_VERSION} を解決できません(ネットワーク/レジストリを確認)"
  exit 1
fi
echo "✅ notebooklm-mcp@${NOTEBOOKLM_MCP_VERSION} を解決"

# ===== 5. .mcp.json との整合確認 =====
cd "$(dirname "$0")/.."
if [ ! -f ".mcp.json" ]; then
  echo "❌ .mcp.json が存在しません(リポジトリルートに必要)"
  exit 1
fi
node -e "
  const c = require('./.mcp.json');
  const s = c.mcpServers && c.mcpServers.notebooklm;
  if (!s) { console.error('❌ .mcp.json に notebooklm エントリがありません'); process.exit(1); }
  const pinned = (s.args || []).find((a) => a.startsWith('notebooklm-mcp@'));
  if (pinned !== 'notebooklm-mcp@${NOTEBOOKLM_MCP_VERSION}') {
    console.error('❌ .mcp.json の固定バージョンが本スクリプトと不一致: ' + pinned);
    process.exit(1);
  }
  console.log('✅ .mcp.json の notebooklm エントリを確認(' + pinned + ')');
"

# ===== 6. ブラウザ事前ダウンロード(初回のMCP起動タイムアウト回避) =====
if [ "$SKIP_WARMUP" -eq 1 ]; then
  echo "⏭️  ブラウザ事前ダウンロードをスキップ(--skip-warmup)"
else
  echo ""
  echo ">>> ブラウザ(Patchright Chromium)を事前ダウンロード中... 初回は数分かかります"
  if npx -y "notebooklm-mcp@${NOTEBOOKLM_MCP_VERSION}" config get >/dev/null 2>&1; then
    echo "✅ 事前ダウンロード完了(以後のMCP起動は速い)"
  else
    echo "⚠️  事前ダウンロードに失敗しました。MCP初回起動が遅くタイムアウトする可能性があります"
    echo "    手動で確認: npx -y notebooklm-mcp@${NOTEBOOKLM_MCP_VERSION} config get"
  fi
fi

echo ""
echo "========================================="
echo "  ✅ プリフライト通過"
echo "========================================="
echo ""
echo "次の手順:"
echo "  1. Claude Code を本リポジトリで起動し、.mcp.json の notebooklm サーバーを承認する"
echo "  2. \`claude mcp list\` で notebooklm が Connected になることを確認"
echo "  3. MCPツール \`setup_auth\` を1回実行し、開いたChromeでGoogleアカウントにログイン"
echo "     → cookieは ~/.local/share/notebooklm-mcp/chrome_profile/ に永続化される(以後ログイン不要)"
echo "  4. MCPツール \`get_health\` で認証状態を確認"
echo "  5. 参照したいノートブックの共有URLを \`add_notebook\` で登録し、\`select_notebook\` で既定に設定"
echo ""
echo "認証をやり直す場合(アカウント切替・cookie失効):"
echo "  Chromeを全て閉じる → rm -rf ~/.local/share/notebooklm-mcp/chrome_profile → 手順3を再実行"
echo "  (re_auth・cleanup_dataはNOTEBOOKLM_PROFILE=standardでは公開されないため手動で行う)"
echo ""
echo "⚠️  chrome_profile ディレクトリは本人のGoogleセッションそのものです。"
echo "    リポジトリ内には絶対に置かず、バックアップ・共有もしないこと。"
