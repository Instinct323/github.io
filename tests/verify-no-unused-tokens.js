import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const TOKENS_FILE_PATH = path.join(ROOT_DIR, 'src', 'styles', 'tokens.css');
const SCAN_TARGETS = [
  path.join(ROOT_DIR, 'src'),
  path.join(ROOT_DIR, 'tests'),
];
const TEXT_FILE_EXTENSIONS = new Set(['.astro', '.css', '.js', '.json', '.jsonc', '.md', '.mjs', '.ts', '.tsx']);
const TOKEN_DECLARATION_PATTERN = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g;
const TOKEN_REFERENCE_PATTERN = /var\(\s*(--[a-z0-9-]+)\b/g;

async function collect_files(dir_path) {
  const dir_entries = await fs.readdir(dir_path, { withFileTypes: true });
  const results = [];

  for (const entry of dir_entries) {
    const entry_path = path.join(dir_path, entry.name);

    if (entry.isDirectory()) {
      results.push(...await collect_files(entry_path));
      continue;
    }

    if (TEXT_FILE_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(entry_path);
    }
  }

  return results;
}

function parse_token_declarations(tokens_content) {
  const declared_tokens = new Set();
  const token_dependencies = new Map();

  for (const match of tokens_content.matchAll(TOKEN_DECLARATION_PATTERN)) {
    const token_name = match[1];
    const token_value = match[2];
    declared_tokens.add(token_name);

    const dependencies = new Set();
    for (const dep_match of token_value.matchAll(TOKEN_REFERENCE_PATTERN)) {
      dependencies.add(dep_match[1]);
    }

    token_dependencies.set(token_name, dependencies);
  }

  return {
    declared_tokens,
    token_dependencies,
  };
}

function collect_directly_used_tokens(files_content_by_path, tokens_file_path) {
  const directly_used_tokens = new Set();

  for (const [file_path, content] of files_content_by_path) {
    const scan_content = file_path === tokens_file_path
      ? content.replace(TOKEN_DECLARATION_PATTERN, '')
      : content;

    for (const match of scan_content.matchAll(TOKEN_REFERENCE_PATTERN)) {
      directly_used_tokens.add(match[1]);
    }
  }

  return directly_used_tokens;
}

function resolve_reachable_tokens(root_tokens, token_dependencies) {
  const reachable = new Set();
  const queue = [...root_tokens];

  while (queue.length > 0) {
    const token_name = queue.pop();
    if (!token_name || reachable.has(token_name)) {
      continue;
    }

    reachable.add(token_name);
    const dependencies = token_dependencies.get(token_name);
    if (!dependencies) {
      continue;
    }

    for (const dependency of dependencies) {
      queue.push(dependency);
    }
  }

  return reachable;
}

async function main() {
  const tokens_content = await fs.readFile(TOKENS_FILE_PATH, 'utf8');
  const { declared_tokens, token_dependencies } = parse_token_declarations(tokens_content);
  const files = (await Promise.all(SCAN_TARGETS.map(collect_files))).flat();
  const files_content_by_path = new Map();

  for (const file_path of files) {
    const content = await fs.readFile(file_path, 'utf8');
    files_content_by_path.set(file_path, content);
  }

  const directly_used_tokens = collect_directly_used_tokens(files_content_by_path, TOKENS_FILE_PATH);
  const reachable_tokens = resolve_reachable_tokens(directly_used_tokens, token_dependencies);
  const unused_tokens = [...declared_tokens].filter((token_name) => !reachable_tokens.has(token_name));

  if (unused_tokens.length === 0) {
    return;
  }

  const sorted_unused_tokens = unused_tokens.sort((left, right) => left.localeCompare(right));
  console.error(`Detected ${sorted_unused_tokens.length} unused CSS tokens in src/styles/tokens.css:`);

  for (const token_name of sorted_unused_tokens) {
    console.error(`- ${token_name}`);
  }

  process.exitCode = 1;
}

await main();
