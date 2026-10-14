#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const DB_PATH = path.resolve(__dirname, "prompts-db.json");
const REQUIRED_FIELDS = ["id", "title", "category", "version", "lastUpdated", "content"];
const WRITABLE_FIELDS = new Set(["title", "category", "content"]);
const MANAGED_FIELDS = new Set(["id", "version", "lastUpdated"]);
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const HEADING_PATTERN = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

function usage() {
  return [
    "Usage: node update-prompt.js --id <id> --section <section> (--updateText <text> | --updateTextFile <path>)",
    "",
    "section:",
    "  title | category | content   replace that field",
    "  <markdown heading>           replace only that heading's body",
    "",
    "The script bumps the patch version and refreshes lastUpdated.",
    "id, version, and lastUpdated cannot be set directly.",
    "Use --updateTextFile when the replacement text is too large for a command line.",
  ].join("\n");
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { help: true };
  }

  const out = {};
  const known = new Set(["id", "section", "updateText", "updateTextFile"]);

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    let key;
    let value;

    if (!token.startsWith("--")) {
      throw new ValidationError(`Unexpected argument "${token}"\n\n${usage()}`);
    }

    const eq = token.indexOf("=");
    if (eq !== -1) {
      key = token.slice(2, eq);
      value = token.slice(eq + 1);
    } else {
      key = token.slice(2);
      if (i + 1 >= argv.length) {
        throw new ValidationError(`Missing value for --${key}\n\n${usage()}`);
      }
      value = argv[i + 1];
      i += 1;
    }

    if (!known.has(key)) {
      throw new ValidationError(`Unknown argument --${key}\n\n${usage()}`);
    }
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      throw new ValidationError(`Duplicate argument --${key}`);
    }
    out[key] = value;
  }

  for (const key of ["id", "section"]) {
    if (!Object.prototype.hasOwnProperty.call(out, key)) {
      throw new ValidationError(`Missing required argument --${key}\n\n${usage()}`);
    }
  }

  const hasText = Object.prototype.hasOwnProperty.call(out, "updateText");
  const hasFile = Object.prototype.hasOwnProperty.call(out, "updateTextFile");
  if (hasText === hasFile) {
    throw new ValidationError(`Provide either --updateText or --updateTextFile.\n\n${usage()}`);
  }

  out.id = out.id.trim();
  out.section = out.section.trim();
  if (out.id === "" || out.section === "") {
    throw new ValidationError("id and section cannot be empty or whitespace");
  }
  if (hasFile && out.updateTextFile.trim() === "") {
    throw new ValidationError("--updateTextFile cannot be empty");
  }

  return out;
}

function resolveUpdateText(args) {
  if (Object.prototype.hasOwnProperty.call(args, "updateText")) {
    return args.updateText;
  }

  const filePath = path.resolve(args.updateTextFile);
  try {
    return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  } catch (err) {
    throw new ValidationError(`Cannot read --updateTextFile (${err.message})`);
  }
}

function assertJsonSafe(value, label) {
  let encoded;
  try {
    encoded = JSON.stringify(value);
  } catch (err) {
    throw new ValidationError(`${label} cannot be stored as JSON (${err.message})`);
  }

  let decoded;
  try {
    decoded = JSON.parse(encoded);
  } catch (err) {
    throw new ValidationError(`${label} breaks JSON syntax (${err.message})`);
  }

  if (decoded !== value) {
    throw new ValidationError(`${label} does not round-trip through JSON`);
  }
}

function assertNoControlChars(value, label) {
  if (CONTROL_CHARS.test(value)) {
    throw new ValidationError(`${label} contains disallowed control characters`);
  }
}

function countFenceLines(markdown, marker) {
  const pattern = new RegExp(`^[ ]{0,3}${marker}[^\\n]*$`, "gm");
  return (markdown.match(pattern) || []).length;
}

function assertBalancedFences(markdown, label) {
  for (const marker of ["```", "~~~"]) {
    if (countFenceLines(markdown, marker) % 2 !== 0) {
      throw new ValidationError(`${label} has an unclosed ${marker} code fence`);
    }
  }
}

function validateMarkdown(markdown, label) {
  if (typeof markdown !== "string") {
    throw new ValidationError(`${label} must be a string`);
  }
  assertJsonSafe(markdown, label);
  assertNoControlChars(markdown, label);
  assertBalancedFences(markdown, label);
}

function validatePrompt(prompt, indexLabel) {
  const where = indexLabel || "prompt";
  if (!prompt || typeof prompt !== "object" || Array.isArray(prompt)) {
    throw new ValidationError(`${where} must be an object`);
  }

  const keys = Object.keys(prompt);
  const missing = REQUIRED_FIELDS.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !REQUIRED_FIELDS.includes(key));
  if (missing.length > 0) {
    throw new ValidationError(`${where} is missing ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    throw new ValidationError(`${where} has unsupported fields: ${extra.join(", ")}`);
  }

  for (const key of REQUIRED_FIELDS) {
    if (typeof prompt[key] !== "string") {
      throw new ValidationError(`${where}.${key} must be a string`);
    }
  }

  if (!ID_PATTERN.test(prompt.id)) {
    throw new ValidationError(
      `${where}.id must match ${ID_PATTERN} (letters, numbers, ".", "_", "-")`
    );
  }
  if (prompt.title.trim() === "") {
    throw new ValidationError(`${where}.title cannot be empty`);
  }
  if (prompt.category.trim() === "") {
    throw new ValidationError(`${where}.category cannot be empty`);
  }
  if (/[\r\n]/.test(prompt.title) || /[\r\n]/.test(prompt.category)) {
    throw new ValidationError(`${where} title and category must be single-line text`);
  }
  if (!VERSION_PATTERN.test(prompt.version)) {
    throw new ValidationError(`${where}.version must use MAJOR.MINOR.PATCH`);
  }
  if (Number.isNaN(Date.parse(prompt.lastUpdated))) {
    throw new ValidationError(`${where}.lastUpdated must be a valid timestamp`);
  }
  if (prompt.content.trim() === "") {
    throw new ValidationError(`${where}.content cannot be empty`);
  }

  assertNoControlChars(prompt.title, `${where}.title`);
  assertNoControlChars(prompt.category, `${where}.category`);
  validateMarkdown(prompt.content, `${where}.content`);
}

function validateDatabase(db) {
  if (!db || typeof db !== "object" || Array.isArray(db)) {
    throw new ValidationError("Database root must be an object");
  }

  const keys = Object.keys(db);
  if (keys.length !== 1 || keys[0] !== "prompts" || !Array.isArray(db.prompts)) {
    throw new ValidationError('Database root must contain only a "prompts" array');
  }

  const seen = new Set();
  db.prompts.forEach((prompt, index) => {
    validatePrompt(prompt, `prompts[${index}]`);
    if (seen.has(prompt.id)) {
      throw new ValidationError(`Duplicate prompt id "${prompt.id}"`);
    }
    seen.add(prompt.id);
  });

  let encoded;
  try {
    encoded = JSON.stringify(db);
    JSON.parse(encoded);
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError(`Database cannot be serialized as JSON (${err.message})`);
  }
}

function orderPrompt(prompt) {
  return {
    id: prompt.id,
    title: prompt.title,
    category: prompt.category,
    version: prompt.version,
    lastUpdated: prompt.lastUpdated,
    content: prompt.content,
  };
}

function bumpVersion(version) {
  const match = VERSION_PATTERN.exec(version);
  if (!match) {
    throw new ValidationError(`Cannot bump invalid version "${version}"`);
  }
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

function splitLines(content) {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const endsWithNewline = content.endsWith(newline);
  const core = endsWithNewline ? content.slice(0, -newline.length) : content;
  const lines = core.length === 0 ? [] : core.split(newline);
  return { newline, endsWithNewline, lines };
}

function joinLines(lines, newline, endsWithNewline) {
  const text = lines.join(newline);
  return endsWithNewline || text.length === 0 ? `${text}${newline}` : text;
}

function findHeading(lines, sectionName) {
  const matches = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = HEADING_PATTERN.exec(lines[i]);
    if (match && match[2].trim() === sectionName) {
      matches.push({ index: i, level: match[1].length, text: match[2].trim() });
    }
  }
  if (matches.length > 0) return matches;

  const target = sectionName.toLowerCase();
  for (let i = 0; i < lines.length; i += 1) {
    const match = HEADING_PATTERN.exec(lines[i]);
    if (match && match[2].trim().toLowerCase() === target) {
      matches.push({ index: i, level: match[1].length, text: match[2].trim() });
    }
  }
  return matches;
}

function assertBodyStaysInSection(body, level, sectionName) {
  const lines = splitLines(body).lines;
  for (const line of lines) {
    const match = HEADING_PATTERN.exec(line);
    if (match && match[1].length <= level) {
      throw new ValidationError(
        `updateText contains a level-${match[1].length} heading, which would break the "${sectionName}" block`
      );
    }
  }
}

function replaceMarkdownSection(content, sectionName, updateText) {
  const { newline, endsWithNewline, lines } = splitLines(content);
  const matches = findHeading(lines, sectionName);
  if (matches.length === 0) {
    return null;
  }
  if (matches.length > 1) {
    throw new ValidationError(
      `Section "${sectionName}" matches ${matches.length} headings. Use a unique heading.`
    );
  }

  const { index: start, level } = matches[0];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const match = HEADING_PATTERN.exec(lines[i]);
    if (match && match[1].length <= level) {
      end = i;
      break;
    }
  }

  const body = updateText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");

  assertBodyStaysInSection(body, level, sectionName);
  assertBalancedFences(body, `section "${sectionName}"`);

  const bodyLines = body.length === 0 ? [] : body.split("\n");
  const replacement = [lines[start], ""];
  if (bodyLines.length > 0) {
    replacement.push(...bodyLines);
  }
  if (end < lines.length) {
    replacement.push("");
  }

  const nextLines = [
    ...lines.slice(0, start),
    ...replacement,
    ...lines.slice(end),
  ];
  return joinLines(nextLines, newline, endsWithNewline || content.length === 0);
}

function applyFieldUpdate(prompt, section, updateText) {
  assertNoControlChars(updateText, "updateText");

  if (section === "title" || section === "category") {
    if (updateText.trim() === "") {
      throw new ValidationError(`${section} cannot be empty`);
    }
    if (/[\r\n]/.test(updateText)) {
      throw new ValidationError(`${section} must be single-line text`);
    }
    return { ...prompt, [section]: updateText };
  }

  if (updateText.trim() === "") {
    throw new ValidationError("content cannot be empty");
  }
  const content = updateText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  validateMarkdown(content, "content");
  return { ...prompt, content };
}

function applyUpdate(db, { id, section, updateText }) {
  validateDatabase(db);
  assertJsonSafe(updateText, "updateText");

  if (MANAGED_FIELDS.has(section)) {
    throw new ValidationError(
      `"${section}" is managed by the storage engine and cannot be set directly`
    );
  }

  const next = JSON.parse(JSON.stringify(db));
  const index = next.prompts.findIndex((prompt) => prompt.id === id);
  if (index === -1) {
    throw new ValidationError(`No prompt found with id "${id}"`);
  }

  const current = next.prompts[index];
  let updated;
  if (WRITABLE_FIELDS.has(section)) {
    updated = applyFieldUpdate(current, section, updateText);
  } else {
    const content = replaceMarkdownSection(current.content, section, updateText);
    if (content === null) {
      throw new ValidationError(
        `No markdown heading named "${section}" in prompt "${id}". ` +
          "Use --section title, category, or content to replace a whole field."
      );
    }
    validateMarkdown(content, "content");
    updated = { ...current, content };
  }

  updated.version = bumpVersion(current.version);
  updated.lastUpdated = new Date().toISOString();
  updated = orderPrompt(updated);
  next.prompts[index] = updated;
  validateDatabase(next);
  return { db: next, prompt: updated };
}

function loadDatabase(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new ValidationError(`Database file not found: ${filePath}`);
    }
    throw err;
  }

  raw = raw.replace(/^\uFEFF/, "");
  let db;
  try {
    db = JSON.parse(raw);
  } catch (err) {
    throw new ValidationError(`prompts-db.json is not valid JSON (${err.message})`);
  }
  validateDatabase(db);
  return db;
}

function replaceFile(tmpPath, filePath) {
  try {
    fs.renameSync(tmpPath, filePath);
    return;
  } catch (err) {
    if (err.code !== "EEXIST" && err.code !== "EPERM") {
      throw err;
    }
  }

  const backupPath = `${filePath}.${process.pid}.bak`;
  fs.rmSync(backupPath, { force: true });
  fs.renameSync(filePath, backupPath);
  try {
    fs.renameSync(tmpPath, filePath);
    fs.rmSync(backupPath, { force: true });
  } catch (err) {
    try {
      if (!fs.existsSync(filePath) && fs.existsSync(backupPath)) {
        fs.renameSync(backupPath, filePath);
      }
    } catch (_restoreErr) {
      // Leave the backup in place so the previous database can be recovered.
    }
    throw err;
  }
}

function saveDatabase(filePath, db) {
  validateDatabase(db);
  const json = `${JSON.stringify(db, null, 2)}\n`;
  const reparsed = JSON.parse(json);
  validateDatabase(reparsed);

  const tmpPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.tmp`
  );
  try {
    fs.writeFileSync(tmpPath, json, { encoding: "utf8" });
    replaceFile(tmpPath, filePath);
  } catch (err) {
    fs.rmSync(tmpPath, { force: true });
    throw err;
  }

  const confirmed = loadDatabase(filePath);
  if (JSON.stringify(confirmed) !== JSON.stringify(reparsed)) {
    throw new ValidationError("Post-write check failed: saved database does not match the update");
  }
  return confirmed;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const db = loadDatabase(DB_PATH);
  const { db: updated } = applyUpdate(db, {
    id: args.id,
    section: args.section,
    updateText: resolveUpdateText(args),
  });
  const confirmed = saveDatabase(DB_PATH, updated);
  const prompt = confirmed.prompts.find((entry) => entry.id === args.id);

  process.stdout.write(`${JSON.stringify({
    ok: true,
    id: prompt.id,
    section: args.section,
    version: prompt.version,
    lastUpdated: prompt.lastUpdated,
  }, null, 2)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`update-prompt: ${message}\n`);
    if (!(err instanceof ValidationError) && err instanceof Error && err.stack) {
      process.stderr.write(`${err.stack}\n`);
    }
    process.exitCode = 1;
  }
}

module.exports = {
  DB_PATH,
  ValidationError,
  applyUpdate,
  bumpVersion,
  loadDatabase,
  parseArgs,
  saveDatabase,
  validateDatabase,
  validateMarkdown,
  validatePrompt,
};
