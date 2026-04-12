#!/usr/bin/env node
// Stop hook: scans the last assistant message for violations of MEMORY.md
// rules — specifically `feedback_self_execute.md` (외부 서비스 작업을 사용자에게 요청 금지)
// and `feedback_env_local_access.md` (.env.local/크리덴셜을 사용자에게 묻지 말 것).
//
// Input (stdin JSON): { transcript_path, session_id, ... }
// Output: when a violation is detected, prints {"decision":"block","reason":"..."}
// to stdout, which feeds the reason back to the model so it must redo the work
// itself instead of stopping.

import fs from "node:fs";

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

function getLastAssistantText(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return "";
  const lines = fs.readFileSync(transcriptPath, "utf8").split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.type !== "assistant") continue;
      const content = entry.message?.content;
      if (!Array.isArray(content)) continue;
      const text = content
        .filter((c) => c.type === "text" && typeof c.text === "string")
        .map((c) => c.text)
        .join("\n");
      if (text.trim()) return text;
    } catch {}
  }
  return "";
}

// Services that I (Claude) have credentials/CLI access to and must operate myself.
const SELF_EXECUTABLE_SERVICES =
  /(Vercel|Supabase|Cloudflare|Oracle|PortOne|아임포트|iamport|AWS|S3|카카오|Kakao|애플|Apple|구글\s*개발자|Google\s*Developer|후이즈|whois|GitHub|gh\s+|cloudflared|Tunnel)/i;

// Phrases that indicate I'm asking the user to take an action.
const REQUEST_PHRASES = [
  /해\s*주세요/,
  /해\s*주십시오/,
  /해\s*주실래요/,
  /해\s*주시기/,
  /직접\s*[^\.\n]{0,20}(하|해|수정|삭제|추가|제거|변경|확인|등록|로그인|입력)/,
  /수동으로\s*[^\.\n]{0,30}(하|해|수정|삭제|추가|제거|변경|등록)/,
  /대시보드에서\s*[^\.\n]{0,30}(하|해|수정|삭제|추가|제거|변경|확인)/,
  /UI에서\s*[^\.\n]{0,30}(하|해|수정|삭제|추가|제거|변경)/,
  /부탁드립니다/,
  /부탁드려요/,
  /please\s+(do|run|update|remove|set|configure|check|verify|click|open|login|sign\s+in)/i,
];

// Asking for credentials / env values
const CREDENTIAL_REQUEST = [
  /(키|토큰|시크릿|비밀번호|패스워드|password|secret|token|api\s*key|크리덴셜|credential)[^\n]{0,30}(알려|주세요|입력|제공|공유|보내)/i,
  /\.env(\.local)?[^\n]{0,30}(알려|주세요|보내|공유)/i,
  /(접속\s*정보|로그인\s*정보)[^\n]{0,20}(알려|주세요|제공)/i,
];

// Meta-discussion keywords. If a segment contains any of these, it's almost
// certainly Claude *describing* the hook itself, not making a real request.
// Skip those segments to avoid self-referential false positives.
const META_KEYWORDS =
  /(패턴|감지|훅|정규식|차단|규칙|검증|매칭|예시|샘플|등록|메타|설명|문서화|hook|pattern|regex|detect|block|memory\.md|MEMORY\.md|feedback_|reference_)/i;

// Strip code blocks, inline code, and link URLs so service names inside
// commands (e.g. `npx vercel env add`) don't trigger detection.
function stripCodeAndLinks(text) {
  return text
    .replace(/```[\s\S]*?```/g, " ")        // fenced code
    .replace(/`[^`\n]*`/g, " ")              // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // markdown links → keep label only
    .replace(/https?:\/\/\S+/g, " ");        // bare URLs
}

function findViolations(rawText) {
  const violations = [];
  const text = stripCodeAndLinks(rawText);

  // Check 1: 외부 서비스 작업을 사용자에게 요청
  // Split into sentences/lines, check if any line mentions a service AND a request phrase
  const segments = text.split(/[\n。\.!?]/);
  for (const seg of segments) {
    if (!SELF_EXECUTABLE_SERVICES.test(seg)) continue;
    if (META_KEYWORDS.test(seg)) continue; // skip meta-discussion of the hook itself
    for (const phrase of REQUEST_PHRASES) {
      if (phrase.test(seg)) {
        violations.push({
          rule: "feedback_self_execute.md",
          excerpt: seg.trim().slice(0, 200),
        });
        break;
      }
    }
  }

  // Check 2: 사용자에게 크리덴셜/환경변수 요청
  for (const phrase of CREDENTIAL_REQUEST) {
    const m = text.match(phrase);
    if (!m) continue;
    const ctx = text.slice(Math.max(0, m.index - 80), m.index + 200);
    if (META_KEYWORDS.test(ctx)) continue;
    violations.push({
      rule: "feedback_env_local_access.md / reference_all_credentials.md",
      excerpt: ctx.trim(),
    });
  }

  return violations;
}

(async () => {
  try {
    const raw = await readStdin();
    let payload = {};
    try { payload = JSON.parse(raw); } catch {}

    // Avoid infinite loops: if the assistant is already retrying after a block,
    // don't block again. Stop hooks receive a `stop_hook_active` flag for this.
    if (payload.stop_hook_active) {
      process.exit(0);
    }

    const text = getLastAssistantText(payload.transcript_path);
    if (!text) process.exit(0);

    const violations = findViolations(text);
    if (violations.length === 0) process.exit(0);

    const summary = violations
      .map((v, i) => `  ${i + 1}. [${v.rule}] "${v.excerpt}"`)
      .join("\n");

    const reason = [
      "🚨 MEMORY.md 규칙 위반 감지 — 응답 차단됨.",
      "",
      "위반 내용:",
      summary,
      "",
      "관련 규칙:",
      "- feedback_self_execute.md: 외부 서비스 설정은 직접 실행, 사용자에게 절대 요청 금지",
      "- reference_all_credentials.md: 모든 크리덴셜은 메모리에 있음, 사용자에게 묻지 말 것",
      "- feedback_env_local_access.md: .env.local은 dotenv로 우회 읽기",
      "",
      "✅ 해야 할 일:",
      "1. reference_all_credentials.md를 다시 읽어 필요한 CLI/API 호출 방법 확인",
      "2. Vercel은 `npx vercel env ...`, Supabase는 Management API/pg, Cloudflare는 cloudflared 등으로 직접 실행",
      "3. .env.local 값이 필요하면 `node -e \"require('dotenv').config({path:'.env.local'});console.log(process.env.KEY)\"`",
      "4. 작업을 직접 완료한 뒤 응답을 마무리할 것",
    ].join("\n");

    const out = {
      decision: "block",
      reason,
      systemMessage: "🛑 self-execute 훅: 사용자에게 외부 작업을 요청하는 응답이 감지되어 차단됨",
    };
    process.stdout.write(JSON.stringify(out));
    process.exit(0);
  } catch (e) {
    // Never crash the session — fail open.
    process.stderr.write(`[check-self-execute] ${e?.message ?? e}\n`);
    process.exit(0);
  }
})();
