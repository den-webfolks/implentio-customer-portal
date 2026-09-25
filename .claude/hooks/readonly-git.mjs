import { readFileSync } from "node:fs";

// Read-only git subcommands the reviewer may run
const ALLOWED = ["diff", "status", "log", "show", "ls-files", "blame", "rev-parse", "merge-base", "grep"];

// Flags that write files or run external programs
const FORBIDDEN_FLAGS = [/^--output(=|$)/, /^--ext-diff$/, /^-O/, /^--open-files-in-pager/];

const block = (reason) => {
  process.stderr.write(
    `Blocked: ${reason}. ui-ux-adversary may only run single read-only git commands: git ${ALLOWED.join(" | ")}.`
  );
  process.exit(2);
};

let command = "";
try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  command = String(input?.tool_input?.command ?? "").trim();
} catch {
  block("could not parse hook input");
}

if (!command) block("empty command");

// No chaining, pipes, redirects, substitution or multi-line scripts
if (/[;&|<>`$\n\\]/.test(command)) block("shell operators are not allowed");

const tokens = command.match(/"[^"]*"|'[^']*'|\S+/g).map((t) => t.replace(/^["']|["']$/g, ""));

if (tokens[0] !== "git") block("only git is allowed");

// Skip safe global options before the subcommand
let i = 1;
while (i < tokens.length && tokens[i].startsWith("-")) {
  const opt = tokens[i];
  if (opt === "--no-pager") {
    i += 1;
  } else if (opt === "-C") {
    i += 2;
  } else {
    block(`global option ${opt} is not allowed`);
  }
}

const sub = tokens[i];
if (!sub || !ALLOWED.includes(sub)) block(`git ${sub ?? "(none)"} is not allowed`);

for (const arg of tokens.slice(i + 1)) {
  if (FORBIDDEN_FLAGS.some((re) => re.test(arg))) block(`flag ${arg} is not allowed`);
}

process.exit(0);
