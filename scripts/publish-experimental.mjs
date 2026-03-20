import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

function printHelp() {
  console.log(`Usage: node scripts/publish-experimental.mjs [options]

Generate and publish a prerelease version like:
  0.0.0-experimental-46103596-20260305

Options:
  --version <version>           Publish an explicit version instead of generating one
  --base-version <version>      Base semver version before the prerelease suffix (default: 0.0.0)
  --preid <name>                Prerelease channel prefix (default: experimental)
  --tag <tag>                   npm dist-tag to publish under (default: same as --preid)
  --commit <sha>                Commit identifier used in generated versions (default: git short SHA)
  --date <yyyymmdd>             Date used in generated versions (default: current UTC date)
  --access <value>              npm publish access, defaults to publishConfig.access or public
  --otp <code>                  One-time password for npm publish
  --dry-run                     Run npm publish with --dry-run
  --skip-build                  Skip the explicit npm run build step before publish
  --keep-version                Keep the generated version in package.json after publish
  --help                        Show this help message
`);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    access: '',
    baseVersion: '0.0.0',
    commit: '',
    date: '',
    dryRun: false,
    keepVersion: false,
    otp: '',
    preid: 'experimental',
    skipBuild: false,
    tag: '',
    version: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--skip-build') {
      options.skipBuild = true;
      continue;
    }

    if (arg === '--keep-version') {
      options.keepVersion = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (!arg.startsWith('--')) {
      fail(`Unknown argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = argv[index + 1];

    if (!value || value.startsWith('--')) {
      fail(`Missing value for --${key}`);
    }

    index += 1;

    if (key === 'version') {
      options.version = value;
      continue;
    }

    if (key === 'base-version') {
      options.baseVersion = value;
      continue;
    }

    if (key === 'preid') {
      options.preid = value;
      continue;
    }

    if (key === 'tag') {
      options.tag = value;
      continue;
    }

    if (key === 'commit') {
      options.commit = value;
      continue;
    }

    if (key === 'date') {
      options.date = value;
      continue;
    }

    if (key === 'access') {
      options.access = value;
      continue;
    }

    if (key === 'otp') {
      options.otp = value;
      continue;
    }

    fail(`Unknown option: --${key}`);
  }

  return options;
}

function readPackageJson(packageJsonPath) {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

function writePackageJson(packageJsonPath, packageJson) {
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function validateSemver(version) {
  const semverPattern = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

  if (!semverPattern.test(version)) {
    fail(`Invalid semver version: ${version}`);
  }
}

function validateDate(value) {
  if (!/^\d{8}$/.test(value)) {
    fail(`Invalid date "${value}". Expected YYYYMMDD.`);
  }
}

function getCurrentUtcDate() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

function getGitShortSha() {
  try {
    return execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    fail(`Unable to resolve git short SHA: ${error.message}`);
  }
}

function run(command, args, extraEnv = {}) {
  execFileSync(command, args, {
    env: {
      ...process.env,
      ...extraEnv,
    },
    stdio: 'inherit',
  });
}

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const packageJsonPath = path.resolve('package.json');
const packageJson = readPackageJson(packageJsonPath);
const originalVersion = packageJson.version;
const publishAccess = options.access || packageJson.publishConfig?.access || 'public';
const publishTag = options.tag || options.preid;
const publishVersion =
  options.version ||
  [options.baseVersion, options.preid, options.commit || getGitShortSha(), options.date || getCurrentUtcDate()].join(
    '-',
  );

validateSemver(options.baseVersion);
validateSemver(publishVersion);

if (options.date) {
  validateDate(options.date);
}

console.log(`Package: ${packageJson.name}`);
console.log(`Original version: ${originalVersion}`);
console.log(`Publish version: ${publishVersion}`);
console.log(`npm dist-tag: ${publishTag}`);
console.log(`Access: ${publishAccess}`);
console.log(`Dry run: ${options.dryRun ? 'true' : 'false'}`);

packageJson.version = publishVersion;
writePackageJson(packageJsonPath, packageJson);

let restoreVersion = !options.keepVersion;
let publishCacheDir = '';

try {
  if (!options.skipBuild) {
    run('npm', ['run', 'build']);
  }

  const publishArgs = ['publish', '--access', publishAccess, '--tag', publishTag];

  if (options.dryRun) {
    publishArgs.push('--dry-run');
  }

  if (options.otp) {
    publishArgs.push('--otp', options.otp);
  }

  publishCacheDir = fs.mkdtempSync(path.join(tmpdir(), 'apm-publish-cache-'));

  run('npm', publishArgs, {
    HUSKY: '0',
    npm_config_cache: publishCacheDir,
  });
  console.log(`Published ${packageJson.name}@${publishVersion}`);
} finally {
  if (publishCacheDir) {
    fs.rmSync(publishCacheDir, { force: true, recursive: true });
  }

  if (restoreVersion) {
    packageJson.version = originalVersion;
    writePackageJson(packageJsonPath, packageJson);
    console.log(`Restored package.json version to ${originalVersion}`);
  }
}
