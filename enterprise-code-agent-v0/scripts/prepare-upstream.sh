#!/usr/bin/env bash
# 固定上游并生成匹配协议；需要外网，不登录、不调用模型。
# Pin upstream and generate matching schemas; no login or model invocation.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${CODEX_VERSION:-0.167.0}"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Expected a fixed stable version' >&2; exit 2; }
TAG="rust-v${VERSION}"
UPSTREAM="$ROOT/vendor/codex"
TOOLING="$ROOT/.tooling/codex"
for executable in git node npm; do
  command -v "$executable" >/dev/null || { echo "Missing $executable" >&2; exit 2; }
done
mkdir -p "$ROOT/vendor" "$TOOLING" "$ROOT/evidence"
if [[ -e "$UPSTREAM" ]]; then
  git -C "$UPSTREAM" rev-parse --is-inside-work-tree >/dev/null
  [[ -z "$(git -C "$UPSTREAM" status --porcelain)" ]] || { echo 'Upstream has changes; refusing to overwrite' >&2; exit 2; }
  EXPECTED="$(git -C "$UPSTREAM" rev-parse "refs/tags/$TAG^{commit}")"
  [[ "$(git -C "$UPSTREAM" rev-parse HEAD)" == "$EXPECTED" ]] || { echo 'Existing upstream is not the requested tag' >&2; exit 2; }
else
  git clone --depth 1 --single-branch --branch "$TAG" https://github.com/openai/codex.git "$UPSTREAM"
fi
COMMIT="$(git -C "$UPSTREAM" rev-parse HEAD)"
# Local installation only; ignore lifecycle scripts and preserve the npm lockfile.
npm install --prefix "$TOOLING" --ignore-scripts --save-exact "@openai/codex@$VERSION"
BIN="$TOOLING/node_modules/.bin/codex"
CLI_VERSION="$("$BIN" --version)"
[[ "$CLI_VERSION" == "codex-cli $VERSION" ]] || { echo "CLI mismatch: $CLI_VERSION" >&2; exit 2; }
GEN="$ROOT/contracts/generated"
if [[ -e "$GEN" ]]; then
  echo 'contracts/generated already exists. Review it; do not overwrite blindly.' >&2
  exit 2
fi
mkdir -p "$GEN/typescript" "$GEN/json-schema" "$ROOT/.tooling/schema-home"
CODEX_HOME="$ROOT/.tooling/schema-home" "$BIN" app-server generate-ts --out "$GEN/typescript"
CODEX_HOME="$ROOT/.tooling/schema-home" "$BIN" app-server generate-json-schema --out "$GEN/json-schema"
ROOT="$ROOT" VERSION="$VERSION" TAG="$TAG" COMMIT="$COMMIT" CLI_VERSION="$CLI_VERSION" node --input-type=module <<'JS'
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = process.env.ROOT;
const base = path.join(root, 'contracts/generated');
const files = [];
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(full);
    else files.push(full);
  }
}
visit(base);
const hash = crypto.createHash('sha256');
for (const file of files.sort()) { hash.update(path.relative(base, file)); hash.update('\0'); hash.update(fs.readFileSync(file)); hash.update('\0'); }
const lockfile = path.join(root, '.tooling/codex/package-lock.json');
const evidence = {
  repository: 'https://github.com/openai/codex', tag: process.env.TAG,
  commit: process.env.COMMIT, expectedVersion: process.env.VERSION,
  cliVersion: process.env.CLI_VERSION, generatedFiles: files.length,
  schemaSha256: hash.digest('hex'),
  installerLockSha256: crypto.createHash('sha256').update(fs.readFileSync(lockfile)).digest('hex'),
  generatedAt: new Date().toISOString(), stableSchemaOnly: true,
  sourceAuditPassed: false, modelCompatibilityPassed: false, productAccepted: false,
};
fs.writeFileSync(path.join(root, 'evidence/upstream-lock.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
JS
printf '\nNext: run G0 source audit and the handshake probe; this script does not validate the product.\n'
