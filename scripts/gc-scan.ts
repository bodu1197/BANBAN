#!/usr/bin/env node
/* eslint-disable no-console, sonarjs/no-os-command, sonarjs/cognitive-complexity */

/**
 * HOWTATTOO Garbage Collection Scanner
 * -------------------------------------
 * Scans the codebase for CLAUDE.md rule violations that ESLint cannot catch.
 * Integrates with quality-gate.ts as an additional check.
 *
 * Checks:
 * 1. "use client" without // @client-reason: comment
 * 2. Inline style={{}} usage (Tailwind only)
 * 3. Hardcoded hex colors in className (bg-[#...], text-[#...])
 * 4. Missing Readonly<> on component props
 * 5. hover: without matching focus-visible:
 * 6. Icon buttons without aria-label
 * 7. CSS modules or styled-components imports
 * 8. useEffect + fetch for initial data loading
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const SRC_DIR = join(process.cwd(), "src");
const IGNORE_DIRS = ["components/ui", "i18n/dictionaries", "types"];

interface Violation {
    file: string;
    line: number;
    rule: string;
    message: string;
}

const violations: Violation[] = [];

function addViolation(file: string, line: number, rule: string, message: string): void {
    violations.push({ file: relative(process.cwd(), file), line, rule, message });
}

function walkFiles(dir: string, ext: string[]): string[] {
    const results: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const rel = relative(SRC_DIR, full);
        if (IGNORE_DIRS.some((d) => rel.startsWith(d))) continue;
        const stat = statSync(full);
        if (stat.isDirectory()) {
            results.push(...walkFiles(full, ext));
        } else if (ext.some((e) => full.endsWith(e))) {
            results.push(full);
        }
    }
    return results;
}

// --- Rule Checkers ---

function checkUseClientReason(file: string, lines: string[]): void {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '"use client";' || lines[i].trim() === "'use client';") {
            const prevLine = i > 0 ? lines[i - 1] : "";
            if (!prevLine.includes("@client-reason")) {
                addViolation(file, i + 1, "client-reason", '"use client" without // @client-reason: comment on the line above');
            }
            break;
        }
    }
}

function checkInlineStyles(file: string, lines: string[]): void {
    for (let i = 0; i < lines.length; i++) {
        if (/style=\{\{/.test(lines[i])) {
            // Skip dynamic values (variables, template literals, ternaries) — can't be Tailwind
            const line = lines[i];
            if (/\$\{|`|}\s*\?|[a-z_]\w*\s*[,}]/.test(line)) continue;
            addViolation(file, i + 1, "no-inline-style", "Inline style={{}} detected — use Tailwind classes instead");
        }
    }
}

function checkHardcodedColors(file: string, lines: string[]): void {
    const hexPattern = /(?:bg|text|border|ring|shadow|outline|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/;
    for (let i = 0; i < lines.length; i++) {
        if (hexPattern.test(lines[i])) {
            addViolation(file, i + 1, "no-hardcoded-color", "Hardcoded hex color in className — use design system variables");
        }
    }
}

function checkReadonlyProps(file: string, lines: string[]): void {
    const content = lines.join("\n");
    // Match function components with destructured props that aren't wrapped in Readonly<>
    const funcPattern = /(?:function\s+[A-Z]\w*|const\s+[A-Z]\w*\s*=\s*(?:async\s+)?(?:function\s*)?\()\s*\(\s*\{[^}]+\}\s*:\s*(?!Readonly<)(\w+)/g;
    let match;
    while ((match = funcPattern.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split("\n").length;
        addViolation(file, lineNum, "readonly-props", `Component props type "${match[1]}" not wrapped in Readonly<>`);
    }
}

function checkHoverFocusVisible(file: string, lines: string[]): void {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/hover:/.test(line) && !/focus-visible:/.test(line)) {
            // Check if focus-visible is on nearby lines (same JSX element)
            const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join(" ");
            if (!/focus-visible:/.test(context)) {
                addViolation(file, i + 1, "hover-focus-visible", "hover: style without matching focus-visible: style");
            }
        }
    }
}

function checkIconButtonAriaLabel(file: string, lines: string[]): void {
    const content = lines.join("\n");
    // Find buttons that contain only an icon component (no text children)
    const btnPattern = /<(?:button|Button)[^>]*>\s*<(?:[\w]+Icon|X|Plus|Minus|Check|ChevronDown|ChevronUp|ChevronLeft|ChevronRight|Edit2?|Trash2?|Search|Menu|Close|Loader2?|ImagePlus|MessageCircleReply|MessageSquarePlus)\b[^/]*\/>\s*<\/(?:button|Button)>/g;
    let match;
    while ((match = btnPattern.exec(content)) !== null) {
        if (!/aria-label/.test(match[0])) {
            const lineNum = content.substring(0, match.index).split("\n").length;
            addViolation(file, lineNum, "icon-button-aria", "Icon-only button without aria-label");
        }
    }
}

function checkForbiddenImports(file: string, lines: string[]): void {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/from\s+['"].*\.module\.css['"]/.test(line)) {
            addViolation(file, i + 1, "no-css-modules", "CSS module import detected — use Tailwind only");
        }
        if (/from\s+['"](?:styled-components|@emotion)/.test(line)) {
            addViolation(file, i + 1, "no-css-in-js", "styled-components/emotion import — use Tailwind only");
        }
    }
}

function checkUseEffectFetch(file: string, lines: string[]): void {
    const content = lines.join("\n");
    // Detect useEffect containing fetch() or supabase.from()
    const effectPattern = /useEffect\(\s*\(\)\s*=>\s*\{[^}]*(?:fetch\(|\.from\()[^}]*\}/gs;
    let match;
    while ((match = effectPattern.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split("\n").length;
        // Skip if comment says it's intentional (e.g., real-time subscription)
        const snippet = match[0];
        if (/onAuthStateChange|subscribe|realtime|channel/i.test(snippet)) continue;
        addViolation(file, lineNum, "no-useeffect-fetch", "useEffect + fetch/supabase for data loading — use Server Component or Server Action instead");
    }
}

// --- Main ---

function main(): void {
    const updateBaseline = process.argv.includes("--update-baseline");
    console.log("\n\x1b[36m[GC Scanner]\x1b[0m Scanning for CLAUDE.md rule violations...\n");

    const tsxFiles = walkFiles(SRC_DIR, [".tsx"]);
    const tsFiles = walkFiles(SRC_DIR, [".ts", ".tsx"]);

    for (const file of tsFiles) {
        const lines = readFileSync(file, "utf-8").split("\n");
        checkUseClientReason(file, lines);
        checkForbiddenImports(file, lines);
    }

    for (const file of tsxFiles) {
        const lines = readFileSync(file, "utf-8").split("\n");
        checkInlineStyles(file, lines);
        checkHardcodedColors(file, lines);
        checkHoverFocusVisible(file, lines);
        checkIconButtonAriaLabel(file, lines);
        checkUseEffectFetch(file, lines);
    }

    // Readonly<Props> check only on component files
    const componentFiles = tsxFiles.filter((f) =>
        !f.includes("components/ui") && !f.includes(".test.") && !f.includes(".spec.")
    );
    for (const file of componentFiles) {
        const lines = readFileSync(file, "utf-8").split("\n");
        checkReadonlyProps(file, lines);
    }

    // Report
    if (violations.length === 0) {
        console.log("\x1b[32m  ✓ No CLAUDE.md violations found\x1b[0m\n");
        process.exit(0);
    }

    // Group by rule
    const byRule = new Map<string, Violation[]>();
    for (const v of violations) {
        const list = byRule.get(v.rule) ?? [];
        list.push(v);
        byRule.set(v.rule, list);
    }

    for (const [rule, items] of byRule) {
        console.log(`\x1b[31m  [${rule}]\x1b[0m (${items.length} violations)`);
        for (const v of items.slice(0, 5)) {
            console.log(`    ${v.file}:${v.line} — ${v.message}`);
        }
        if (items.length > 5) {
            console.log(`    ... and ${items.length - 5} more`);
        }
        console.log();
    }

    console.log(`\x1b[33m  Total: ${violations.length} CLAUDE.md violations\x1b[0m\n`);

    // Baseline comparison: block if violations INCREASED
    const baselinePath = join(process.cwd(), "scripts", "gc-baseline.json");
    // --update-baseline: force save current state as new baseline
    if (updateBaseline) {
        const current: Record<string, number> = {};
        for (const [rule, items] of byRule) current[rule] = items.length;
        writeFileSync(baselinePath, JSON.stringify(current, null, 2) + "\n");
        console.log(`\x1b[32m  Baseline updated: scripts/gc-baseline.json\x1b[0m\n`);
        process.exit(0);
    }

    let baseline: Record<string, number> = {};
    try {
        baseline = JSON.parse(readFileSync(baselinePath, "utf-8")) as Record<string, number>;
    } catch {
        // No baseline yet — create one
        console.log("\x1b[33m  No baseline found — creating initial baseline.\x1b[0m");
        const current: Record<string, number> = {};
        for (const [rule, items] of byRule) current[rule] = items.length;
        writeFileSync(baselinePath, JSON.stringify(current, null, 2) + "\n");
        console.log(`\x1b[32m  Baseline saved to scripts/gc-baseline.json\x1b[0m\n`);
        process.exit(0);
    }

    // Compare current vs baseline
    let regressions = 0;
    let improvements = 0;
    for (const [rule, items] of byRule) {
        const prev = baseline[rule] ?? 0;
        const diff = items.length - prev;
        if (diff > 0) {
            console.log(`\x1b[31m  ↑ ${rule}: ${prev} → ${items.length} (+${diff} NEW violations)\x1b[0m`);
            regressions += diff;
        } else if (diff < 0) {
            console.log(`\x1b[32m  ↓ ${rule}: ${prev} → ${items.length} (${diff} fixed)\x1b[0m`);
            improvements += Math.abs(diff);
        }
    }

    if (regressions > 0) {
        console.log(`\n\x1b[31m  ✗ ${regressions} new violations introduced — blocking push.\x1b[0m`);
        console.log(`\x1b[31m    Fix the new violations or update baseline with: npx tsx scripts/gc-scan.ts --update-baseline\x1b[0m\n`);
        process.exit(1);
    }

    if (improvements > 0) {
        console.log(`\n\x1b[32m  ✓ ${improvements} violations fixed! Updating baseline.\x1b[0m`);
        const current: Record<string, number> = {};
        for (const [rule, items] of byRule) current[rule] = items.length;
        writeFileSync(baselinePath, JSON.stringify(current, null, 2) + "\n");
    }

    console.log(`\x1b[32m  ✓ GC Scanner passed (no new violations)\x1b[0m\n`);
    process.exit(0);
}

main();
