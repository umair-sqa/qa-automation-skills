#!/usr/bin/env node
/**
 * validate-skills.js
 *
 * Dependency-free structural validator for the qa-automation-skills catalog.
 * Uses only Node built-ins (fs, path) — no YAML library, no npm dependency.
 *
 * Checks:
 *   - Every skills/<name>/SKILL.md has valid frontmatter with `name` +
 *     `description`, `name` matches its directory, `description` is
 *     non-empty, under 1024 chars, and contains "Use when" (case-insensitive).
 *     The file must contain the headings Overview, When to Use, Common
 *     Rationalizations, Red Flags, Verification as `## ` headings, in that
 *     relative order.
 *   - Every agents/<file>.md has frontmatter with `name` + `description`.
 *   - Every .claude/commands/<file>.md body mentions at least one real skill
 *     directory name from the catalog.
 *
 * Exit code: 0 if everything passes, 1 if anything fails.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');
const AGENTS_DIR = path.join(ROOT, 'agents');
const COMMANDS_DIR = path.join(ROOT, '.claude', 'commands');

const REQUIRED_HEADINGS_IN_ORDER = [
  'Overview',
  'When to Use',
  'Common Rationalizations',
  'Red Flags',
  'Verification',
];

const MAX_DESCRIPTION_LENGTH = 1024;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(ext))
    .map((d) => d.name)
    .sort();
}

/**
 * Hand-rolled frontmatter parser.
 * Assumes frontmatter is a flat `key: value` block between two `---` lines
 * at the very start of the file. Returns { frontmatter, body, error }.
 */
function parseFrontmatter(content) {
  const lines = content.split(/\r?\n/);

  if (lines[0] !== '---') {
    return { frontmatter: null, body: content, error: 'File does not start with a `---` frontmatter fence' };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatter: null, body: content, error: 'Frontmatter opening `---` has no closing `---`' };
  }

  const fmLines = lines.slice(1, endIndex);
  const frontmatter = {};
  let currentKey = null;

  for (const rawLine of fmLines) {
    if (rawLine.trim() === '' || rawLine.trim().startsWith('#')) continue;

    const match = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2].trim();
      // Strip a single layer of matching quotes, if present.
      if (
        (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
        (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
      ) {
        value = value.slice(1, -1);
      }
      frontmatter[key] = value;
      currentKey = key;
    } else if (currentKey && /^\s+\S/.test(rawLine)) {
      // Continuation of a folded/multi-line value (simple flat-file support).
      frontmatter[currentKey] = `${frontmatter[currentKey]} ${rawLine.trim()}`.trim();
    }
  }

  const body = lines.slice(endIndex + 1).join('\n');
  return { frontmatter, body, error: null };
}

/**
 * Extract `## ` headings from a markdown body, in file order.
 */
function extractHeadings(body) {
  const headings = [];
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (match) headings.push(match[1].trim());
  }
  return headings;
}

/**
 * Verify that requiredHeadings all appear in `headings`, in the same
 * relative order (other headings may appear interspersed).
 */
function headingsAppearInOrder(headings, requiredHeadings) {
  let cursor = 0;
  for (const required of requiredHeadings) {
    const idx = headings.indexOf(required, cursor);
    if (idx === -1) {
      return { ok: false, missing: required };
    }
    cursor = idx + 1;
  }
  return { ok: true, missing: null };
}

// ---------------------------------------------------------------------------
// Validation: skills/*/SKILL.md
// ---------------------------------------------------------------------------

function validateSkill(dirName) {
  const filePath = path.join(SKILLS_DIR, dirName, 'SKILL.md');
  const failures = [];

  if (!fs.existsSync(filePath)) {
    return { name: dirName, filePath, ok: false, failures: ['SKILL.md does not exist'] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const { frontmatter, body, error } = parseFrontmatter(content);

  if (error) {
    return { name: dirName, filePath, ok: false, failures: [error] };
  }

  if (!frontmatter.name) {
    failures.push('frontmatter missing `name`');
  } else if (frontmatter.name !== dirName) {
    failures.push(`frontmatter \`name: ${frontmatter.name}\` does not match directory name \`${dirName}\``);
  }

  if (!frontmatter.description) {
    failures.push('frontmatter missing `description`');
  } else {
    if (frontmatter.description.trim().length === 0) {
      failures.push('`description` is empty');
    }
    if (frontmatter.description.length > MAX_DESCRIPTION_LENGTH) {
      failures.push(`\`description\` is ${frontmatter.description.length} chars, exceeds ${MAX_DESCRIPTION_LENGTH}`);
    }
    if (!/use when/i.test(frontmatter.description)) {
      failures.push('`description` does not contain "Use when" (case-insensitive)');
    }
  }

  const headings = extractHeadings(body);
  const orderCheck = headingsAppearInOrder(headings, REQUIRED_HEADINGS_IN_ORDER);
  if (!orderCheck.ok) {
    failures.push(
      `missing or out-of-order required heading: "## ${orderCheck.missing}" (required order: ${REQUIRED_HEADINGS_IN_ORDER.join(' -> ')})`
    );
  }

  return { name: dirName, filePath, ok: failures.length === 0, failures };
}

// ---------------------------------------------------------------------------
// Validation: agents/*.md
// ---------------------------------------------------------------------------

function validateAgent(fileName) {
  const filePath = path.join(AGENTS_DIR, fileName);
  const failures = [];
  const content = fs.readFileSync(filePath, 'utf8');
  const { frontmatter, error } = parseFrontmatter(content);

  if (error) {
    return { name: fileName, filePath, ok: false, failures: [error] };
  }

  if (!frontmatter.name) failures.push('frontmatter missing `name`');
  if (!frontmatter.description) failures.push('frontmatter missing `description`');

  return { name: fileName, filePath, ok: failures.length === 0, failures };
}

// ---------------------------------------------------------------------------
// Validation: .claude/commands/*.md
// ---------------------------------------------------------------------------

function validateCommand(fileName, skillNames) {
  const filePath = path.join(COMMANDS_DIR, fileName);
  const failures = [];
  const content = fs.readFileSync(filePath, 'utf8');

  const mentionsSkill = skillNames.some((skillName) => content.includes(skillName));
  if (!mentionsSkill) {
    failures.push('body does not mention any real skill directory name from the catalog');
  }

  return { name: fileName, filePath, ok: failures.length === 0, failures };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function relPath(p) {
  return path.relative(ROOT, p);
}

function main() {
  const skillDirs = listDirs(SKILLS_DIR);
  const agentFiles = listFiles(AGENTS_DIR, '.md');
  const commandFiles = listFiles(COMMANDS_DIR, '.md');

  let anyFailure = false;

  console.log('== Skills (skills/*/SKILL.md) ==');
  let skillPass = 0;
  for (const dirName of skillDirs) {
    const result = validateSkill(dirName);
    if (result.ok) {
      skillPass++;
      console.log(`PASS  ${relPath(result.filePath)}`);
    } else {
      anyFailure = true;
      console.log(`FAIL  ${relPath(result.filePath)}`);
      for (const f of result.failures) console.log(`      - ${f}`);
    }
  }

  console.log('');
  console.log('== Agents (agents/*.md) ==');
  let agentPass = 0;
  for (const fileName of agentFiles) {
    const result = validateAgent(fileName);
    if (result.ok) {
      agentPass++;
      console.log(`PASS  ${relPath(result.filePath)}`);
    } else {
      anyFailure = true;
      console.log(`FAIL  ${relPath(result.filePath)}`);
      for (const f of result.failures) console.log(`      - ${f}`);
    }
  }

  console.log('');
  console.log('== Commands (.claude/commands/*.md) ==');
  let commandPass = 0;
  for (const fileName of commandFiles) {
    const result = validateCommand(fileName, skillDirs);
    if (result.ok) {
      commandPass++;
      console.log(`PASS  ${relPath(result.filePath)}`);
    } else {
      anyFailure = true;
      console.log(`FAIL  ${relPath(result.filePath)}`);
      for (const f of result.failures) console.log(`      - ${f}`);
    }
  }

  console.log('');
  console.log('== Summary ==');
  console.log(`${skillPass}/${skillDirs.length} skills passed`);
  console.log(`${agentPass}/${agentFiles.length} agents passed`);
  console.log(`${commandPass}/${commandFiles.length} commands passed`);

  if (anyFailure) {
    console.log('');
    console.log('RESULT: FAIL');
    process.exit(1);
  } else {
    console.log('');
    console.log('RESULT: PASS');
    process.exit(0);
  }
}

main();
