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
    "🔍 자동 8-리뷰어 트리거",
    "",
    "방금 git push 가 성공했습니다.",
    "프로젝트 정책: 푸시 직후 /review8 을 자동으로 실행합니다.",
    "",
    "다음을 지금 바로 수행하세요:",
    "1. `git log -1 --format=%H` 로 방금 푸시된 커밋 SHA 확인",
    "2. `.claude/commands/review8.md` 의 지시대로 8개 Agent 를 단일 메시지에 병렬 실행 (Security / SEO / Performance / UX / Maintainability / Quality / Architecture / Type Safety)",
    "3. 각 에이전트는 subagent_type=Explore, thoroughness=medium",
    "4. 스코프는 `HEAD~1..HEAD` (방금 푸시된 커밋)",
    "5. 결과 종합 후 유저에게 발견사항 보고. AUTO-FIX 가능 항목은 적용 여부 물어봄.",
    "",
    "이 리뷰는 필수입니다. 스킵하지 마세요.",
].join("\n");

const out = {
    hookSpecificOutput: {
        hookEventName: data?.hook_event_name ?? "PostToolUse",
        additionalContext: reminder,
    },
};
process.stdout.write(JSON.stringify(out));
process.exit(0);
