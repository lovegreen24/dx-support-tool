#!/bin/sh
# カバレッジ閾値チェック(ratchet floor)
# パッケージごとの実測値から少し余裕を持たせた最小値を下回っていないか検証する。
#
# 使用法: check-coverage.sh <coverage-summary.jsonのパス> <最小Statements%> <最小Branches%> [表示ラベル]
# 戻り値: 0 = 閾値以上 / 1 = 閾値未満 または ファイル不在・不正
set -eu

SUMMARY_FILE="$1"
MIN_STMTS="$2"
MIN_BRANCHES="$3"
LABEL="${4:-$SUMMARY_FILE}"

if [ ! -f "$SUMMARY_FILE" ]; then
  echo "✋ ${LABEL}: coverage-summary.jsonが見つかりません(${SUMMARY_FILE})"
  exit 1
fi

STMTS_PCT=$(node -e '
  const fs = require("fs");
  const d = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  console.log(d.total.statements.pct);
' "$SUMMARY_FILE")
BRANCHES_PCT=$(node -e '
  const fs = require("fs");
  const d = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  console.log(d.total.branches.pct);
' "$SUMMARY_FILE")

echo "${LABEL}: Statements ${STMTS_PCT}%(閾値 ${MIN_STMTS}%) / Branches ${BRANCHES_PCT}%(閾値 ${MIN_BRANCHES}%)"

ok=1
awk -v v="$STMTS_PCT" -v m="$MIN_STMTS" 'BEGIN { exit !(v + 0 >= m + 0) }' || ok=0
awk -v v="$BRANCHES_PCT" -v m="$MIN_BRANCHES" 'BEGIN { exit !(v + 0 >= m + 0) }' || ok=0

if [ "$ok" = "0" ]; then
  echo "✋ ${LABEL}: カバレッジが閾値を下回りました"
  exit 1
fi
exit 0
