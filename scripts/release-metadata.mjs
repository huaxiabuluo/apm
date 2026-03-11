import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }

  console.log(`${name}=${value}`);
}

function normalizeVersion(input) {
  const value = (input || '').trim();

  if (!value) {
    return '';
  }

  return value.replace(/^refs\/tags\//, '').replace(/^v/, '');
}

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/);

  if (!match) {
    throw new Error(`Invalid semver version: ${version}`);
  }

  return {
    prerelease: match[4] || null,
  };
}

function inferNpmTag(prerelease) {
  if (!prerelease) {
    return 'latest';
  }

  return prerelease.split('.')[0];
}

const packageJsonPath = path.resolve('package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const releaseVersion = normalizeVersion(process.env.RELEASE_TAG || process.env.RELEASE_VERSION || packageJson.version);

if (!releaseVersion) {
  throw new Error('Missing release version. Set RELEASE_TAG or RELEASE_VERSION.');
}

const manualTag = (process.env.RELEASE_NPM_TAG || 'auto').trim();
const { prerelease } = parseVersion(releaseVersion);
const inferredTag = inferNpmTag(prerelease);
const npmTag = manualTag === '' || manualTag === 'auto' ? inferredTag : manualTag;

if (!prerelease && npmTag !== 'latest') {
  throw new Error(`Stable version ${releaseVersion} must publish with the latest dist-tag.`);
}

if (prerelease && npmTag === 'latest') {
  throw new Error(`Prerelease version ${releaseVersion} cannot publish with the latest dist-tag.`);
}

if (packageJson.version !== releaseVersion) {
  throw new Error(`package.json version (${packageJson.version}) does not match release version (${releaseVersion}).`);
}

setOutput('package_name', packageJson.name);
setOutput('tag_name', `v${releaseVersion}`);
setOutput('version', releaseVersion);
setOutput('npm_tag', npmTag);
setOutput('is_prerelease', prerelease ? 'true' : 'false');
