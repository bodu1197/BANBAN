#!/usr/bin/env node
// git push 성공 직후 /review8 자동 실행 유도.
//
// Bash 로 `git push` 가 exit 0 으로 끝나면 Claude 에게 컨텍스트를 주입해서
// 방금 푸시한 커밋 범위에 대해 /review8 을 즉시 실행하도록 한다.
//
// 프로젝트 정책 (CLAUDE.md): 푸시 = 리뷰 자동 트리거.

import { readFileSync } from "node:fs";

function readStdin() {
    try {
        return readFileSync(0, "utf-8");
    } catch {
        return "";
    }
}

let data;
try {
    data = JSON.parse(readStdin() || "{}");
} catch (e) {
    process.stderr.write(`[post-push-trigger-review8] invalid JSON from stdin: ${e?.message ?? e}\n`);
    process.exit(0);
}

if (data?.tool_name !== "Bash") process.exit(0);

const cmd = String(data?.tool_input?.command ?? "");
// "git push" 단어 경계로 매치 — "git push origin main", "git push --tags" 등 포함
if (!/\bgit\s+push\b/.test(cmd)) process.exit(0);

// 성공 판정 — exit code 비제로 또는 stderr 의 실패 표시가 있으면 fail
const resp = data?.tool_response ?? {};
let success = true;
if (resp?.success === false) success = false;
for (const k of ["exit_code", "exitCode", "returncode"]) {
    const v = resp?.[k];
    if (typeof v === "number" && v !== 0) success = false;
}
const stderr = String(resp?.stderr ?? "") + String(resp?.output ?? "");
if (/\b(rejected|failed to push|error:)\b/i.test(stderr)) success = false;
if (!success) process.exit(0);

const reminder = [
    "🔍 푸시 후 리뷰 확인",
    "",
    "방금 git push 가 성공했습니다.",
    "",
    "⚠️ **먼저 중복인지부터 판정하라 — 대개 여기서 끝난다.**",
    "방금 올린 커밋을 push 전에 이미 리뷰했다면, 다시 리뷰하는 건 같은 걸 두 번 보는 순수 낭비다",
    "(2026-07-25: 이 무조건 재리뷰 지시가 리뷰 비용을 정확히 2배로 만들고 있었다).",
    "이미 리뷰했으면 **아무것도 하지 말고 종료하라.**",
    "",
    "미리뷰 커밋이 섞여 올라간 경우에만 아래를 수행한다:",
    "1. `git log -1 --format=%H` 로 방금 푸시된 커밋 SHA 확인",
    "2. `.claude/commands/review8.md` 의 지시대로 리뷰 — **에이전트는 4개**(8개 아님. 8관점을 2개씩 묶는다: ①Security+Type ②Performance+Architecture ③UX+SEO ④Quality+Maintainability)",
    "3. `subagent_type=Explore` + **`model` 명시 필수** (돈·권한·RLS·마이그레이션·DB쿼리·보안설정=opus / UI·문서·린트=sonnet / 애매하면 opus / haiku 금지)",
    "   ※ model 을 안 적으면 세션 모델(최상위)을 상속한다 — 2026-07-25 미지정 12개가 ~706k 토큰 소모.",
    "4. 스코프는 미리뷰 커밋 범위만",
    "5. 발견사항이 있으면 유저에게 보고.",
].join("\n");

const out = {
    hookSpecificOutput: {
        hookEventName: data?.hook_event_name ?? "PostToolUse",
        additionalContext: reminder,
    },
};
process.stdout.write(JSON.stringify(out));
process.exit(0);
