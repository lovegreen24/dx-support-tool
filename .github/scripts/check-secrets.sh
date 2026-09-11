#!/bin/sh
# 秘密情報チェック(.git/hooks/pre-commit の staged 検知ロジックをCI向けに移植・二重化)
#
# 使用法:
#   <対象ファイルパスの一覧(1行1パス)> | .github/scripts/check-secrets.sh
#
# 戻り値: 0 = 問題なし / 1 = 秘密情報の疑いを検知
#
# 注: 呼び出し側で `.github/ci-fixtures/` 配下(自己テスト用fixture)は
#     事前に除外してから渡すこと(本番チェックでの誤検知防止)。
set -eu

# pre-commit hookと同一のファイル名パターン(.env系 / *-key.json / *.pem)
FILENAME_PATTERN='(^|/)\.env(\.|$)|\.env\.local|-key\.json$|\.pem$'

# 明らかなAPIキー・トークンらしき文字列パターン(AWSアクセスキー・sk-系トークン・GitHub PAT・key=値形式)
# 注: 秘密鍵ファイル自体はFILENAME_PATTERN(*.pem等)で検知するため、
#     "-----BEGIN PRIVATE KEY-----"のようなヘッダ文字列そのものは対象外とする
#     (PEM整形処理やテスト用ダミーPEMなど正当なコードにも頻出し誤検知するため)。
CONTENT_PATTERN='AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{36}|(secret|api|access)[_-]?key[[:space:]]*[:=][[:space:]]*.{16,}'

found=0

while IFS= read -r f; do
  [ -z "$f" ] && continue

  if printf '%s\n' "$f" | grep -Eq "$FILENAME_PATTERN"; then
    echo "✋ 秘密情報ファイルの疑い(ファイル名一致): $f"
    found=1
    continue
  fi

  if [ -f "$f" ] && grep -EIq "$CONTENT_PATTERN" "$f" 2>/dev/null; then
    echo "✋ 秘密情報の疑い(内容パターン一致): $f"
    found=1
  fi
done

if [ "$found" = "1" ]; then
  exit 1
fi
exit 0
