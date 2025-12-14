#!/usr/bin/env node
import {mkdtempSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, URL} from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
let versions;
try {
  versions = JSON.parse(
    readFileSync(join(__dirname, '..', 'openiap-versions.json'), 'utf8'),
  );
} catch {
  throw new Error(
    'expo-iap: Unable to load openiap-versions.json. Ensure the file exists and is valid JSON.',
  );
}

const DEFAULT_TAG = versions?.gql;
if (typeof DEFAULT_TAG !== 'string' || DEFAULT_TAG.length === 0) {
  throw new Error(
    'expo-iap: "gql" version missing in openiap-versions.json. Specify --tag manually or update the file.',
  );
}

const PROJECT_ROOT = process.cwd();

function parseArgs() {
  const args = process.argv.slice(2);
  let tag = DEFAULT_TAG;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--tag' && typeof args[i + 1] === 'string') {
      tag = args[i + 1];
      i++;
    }
  }

  return {tag};
}

function getReleaseUrl(tag) {
  return `https://github.com/hyodotdev/openiap/releases/download/${tag}/openiap-typescript.zip`;
}

function resolveCandidateTags(tag) {
  if (tag.startsWith('gql-')) {
    return [tag];
  }

  // Prefer the new gql-<version> scheme but fall back to legacy bare tags
  return [`gql-${tag}`, tag];
}

function downloadTypesArchive(zipPath, tags) {
  let resolvedTag = null;
  let lastError = null;

  for (const [index, candidate] of tags.entries()) {
    const releaseUrl = getReleaseUrl(candidate);
    console.log(`Downloading OpenIAP types (tag: ${candidate}) from ${releaseUrl}`);

    try {
      execFileSync('curl', ['-L', '-o', zipPath, releaseUrl], {
        stdio: 'inherit',
      });
      resolvedTag = candidate;
      break;
    } catch (error) {
      lastError = error;
      const hasFallback = index < tags.length - 1;
      console.warn(
        `Failed to download for tag ${candidate}; ${
          hasFallback ? 'trying fallback' : 'no fallback available'
        }.`,
      );
    }
  }

  if (!resolvedTag) {
    throw lastError ?? new Error('Unable to download OpenIAP types archive.');
  }

  return resolvedTag;
}

function main() {
  const {tag} = parseArgs();
  const candidateTags = resolveCandidateTags(tag);
  const tempDir = mkdtempSync(join(tmpdir(), 'openiap-types-'));
  const zipPath = join(tempDir, 'openiap-typescript.zip');

  try {
    const resolvedTag = downloadTypesArchive(zipPath, candidateTags);

    console.log('Extracting types.ts from archive');
    execFileSync('unzip', ['-o', zipPath, 'types.ts', '-d', tempDir], {
      stdio: 'inherit',
    });

    const extractedPath = join(tempDir, 'types.ts');
    let contents = readFileSync(extractedPath, 'utf8');
    contents = contents.replace(
      /Run `[^`]+` after updating any \*\.graphql schema file\./,
      'Run `bun run generate:types` after updating any *.graphql schema file.',
    );

    const destination = join(PROJECT_ROOT, 'src', 'types.ts');
    writeFileSync(destination, contents);
    console.log(`Updated src/types.ts from tag ${resolvedTag}`);
  } finally {
    rmSync(tempDir, {recursive: true, force: true});
  }
}

main();
