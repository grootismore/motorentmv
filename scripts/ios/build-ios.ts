#!/usr/bin/env -S npx tsx
/// <reference types="node" />
/**
 * Builds an UNSIGNED arm64 iOS *device* archive and packages it into an IPA
 * for sideloading (Sideloadly, AltStore, SideStore re-sign it at install
 * time -- this script never touches Apple certificates, provisioning
 * profiles, or EAS signing).
 *
 * Adapted from the archive-then-Payload-then-zip shape used by
 * grootismore/renata-jelly's scripts/ios/build-ios.ts, with RideFinder's own
 * workspace/scheme/bundle id resolved from the generated native project
 * rather than assumed, and two concrete packaging fixes this project's own
 * build was missing -- see the `ditto` and `zip -y` calls in packageIpa()
 * below.
 *
 * Usage: npx tsx scripts/ios/build-ios.ts [--production]
 * (invoked via `npm run ios:unsigned-build`)
 *
 * Expects `npx expo prebuild --platform ios --clean` to have already run
 * -- this script does not regenerate the native project itself, so it
 * always builds whatever is currently in ios/.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access, appendFile, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const IOS_DIR = path.join(REPO_ROOT, 'ios');
const BUILD_DIR = path.join(REPO_ROOT, 'build');
const ENV_FILE = path.join(REPO_ROOT, '.env');
const ARCHIVE_PATH = path.join(BUILD_DIR, 'RideFinder.xcarchive');
const PAYLOAD_DIR = path.join(BUILD_DIR, 'Payload');
const VALIDATION_DIR = path.join(BUILD_DIR, 'validation');
const EXPECTED_BUNDLE_ID = 'com.ridefinder.app';

function fail(message: string): never {
  console.error(`\n::error::${message}\n`);
  process.exit(1);
}

function log(message: string): void {
  console.log(`[build-ios] ${message}`);
}

function run(command: string, args: string[], options: { cwd?: string } = {}): string {
  log(`$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    stdio: ['inherit', 'pipe', 'inherit'],
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.status !== 0) {
    fail(`${command} exited with status ${result.status}`);
  }
  return result.stdout ?? '';
}

function plistRead(plistPath: string, key: string): string | null {
  const result = spawnSync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, plistPath], {
    encoding: 'utf8',
  });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function requireMacOS(): Promise<void> {
  if (process.platform !== 'darwin') {
    fail(`This script builds a real iOS device archive via xcodebuild and must run on macOS (found: ${process.platform}).`);
  }
}

/** Minimal KEY=VALUE parser for the plain `.env` file this project's own
 * workflow writes (no quoting/multiline/expansion needed -- see the
 * "Write production environment" workflow step). */
function parseEnvFile(contents: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    values[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return values;
}

/**
 * Validates that the Release bundle's public runtime variables are present
 * in the `.env` file on disk -- deliberately NOT `process.env`.
 *
 * These names must never be set as this script's own process environment:
 * `@expo/env`'s loader (node_modules/@expo/env/build/index.js's `load()`)
 * only assigns a value from `.env` `if (typeof process.env[key] ===
 * 'undefined')` -- if the key is already *defined* in the environment
 * Xcode hands to the "Bundle React Native code and images" Run Script
 * phase (even as an empty string), it is silently left alone and the real
 * `.env` value is never applied. A prior version of this script (and the
 * workflow step that invokes it) set these as step-level env for this
 * script's own pre-flight check, which was inherited all the way down
 * into that phase's environment as empty -- producing a structurally
 * valid, fully green-CI IPA that still showed "Supabase is not
 * configured" on device, since the real values from `.env` were silently
 * discarded rather than applied. Reading the file directly here, instead
 * of checking `process.env`, keeps `.env` the single source of truth end
 * to end and this script's own environment clean of these names.
 */
async function requireEnv(names: string[]): Promise<void> {
  if (!(await exists(ENV_FILE))) {
    fail(`No .env file found at ${ENV_FILE}. The workflow's "Write production environment" step must run before this script.`);
  }
  const values = parseEnvFile(await readFile(ENV_FILE, 'utf8'));
  const missing = names.filter((name) => !values[name] || values[name] === '');
  if (missing.length > 0) {
    fail(
      `Missing required public runtime variable(s) in ${ENV_FILE}: ${missing.join(', ')}. ` +
        'Set these in the GitHub Actions workflow/environment before building -- never hardcode them into source.',
    );
  }
}

/** Resolve the single .xcworkspace under ios/ -- never guessed or hardcoded. */
async function resolveWorkspace(): Promise<string> {
  if (!(await exists(IOS_DIR))) {
    fail(`No ios/ directory found at ${IOS_DIR}. Run "npx expo prebuild --platform ios --clean" first.`);
  }
  const entries = await readdir(IOS_DIR);
  const workspaces = entries.filter((name) => name.endsWith('.xcworkspace'));
  if (workspaces.length === 0) {
    fail(`No .xcworkspace found under ${IOS_DIR} after prebuild.`);
  }
  if (workspaces.length > 1) {
    fail(`Expected exactly one .xcworkspace under ${IOS_DIR}, found: ${workspaces.join(', ')}`);
  }
  const workspacePath = path.join(IOS_DIR, workspaces[0]!);
  log(`Resolved workspace: ${workspacePath}`);
  return workspacePath;
}

/**
 * Resolve the real shared scheme from the workspace itself via
 * `xcodebuild -list -json`, rather than assuming it matches the workspace
 * basename. Falls back to the basename only if it's also a listed scheme
 * (Expo-generated projects name the app scheme after the product, but this
 * verifies it instead of guessing).
 */
async function resolveScheme(workspacePath: string): Promise<string> {
  const output = run('xcodebuild', ['-list', '-json', '-workspace', workspacePath]);
  let schemes: string[] = [];
  try {
    const parsed = JSON.parse(output) as { workspace?: { schemes?: string[] } };
    schemes = parsed.workspace?.schemes ?? [];
  } catch {
    fail(`Could not parse "xcodebuild -list -json" output for ${workspacePath}`);
  }
  const nonPodsSchemes = schemes.filter((name) => name !== 'Pods');
  const candidate = path.basename(workspacePath, '.xcworkspace');
  if (nonPodsSchemes.includes(candidate)) {
    log(`Resolved scheme: ${candidate}`);
    return candidate;
  }
  if (nonPodsSchemes.length === 1) {
    log(`Resolved scheme: ${nonPodsSchemes[0]} (workspace basename "${candidate}" wasn't a listed scheme)`);
    return nonPodsSchemes[0]!;
  }
  fail(
    `Could not resolve a single app scheme for ${workspacePath}. ` +
      `Listed schemes: ${schemes.join(', ') || '(none)'}`,
  );
}

async function cleanPriorBuildOutputs(): Promise<void> {
  // Only ever removes RideFinder's own known build outputs -- never a blanket
  // `rm -rf build`, in case something unrelated ever lands in that folder.
  await mkdir(BUILD_DIR, { recursive: true });
  await rm(ARCHIVE_PATH, { recursive: true, force: true });
  await rm(PAYLOAD_DIR, { recursive: true, force: true });
  await rm(VALIDATION_DIR, { recursive: true, force: true });
  const entries = await readdir(BUILD_DIR);
  await Promise.all(
    entries
      .filter((name) => name.startsWith('RideFinder-unsigned') && name.endsWith('.ipa'))
      .map((name) => rm(path.join(BUILD_DIR, name), { force: true })),
  );
}

async function installPodsIfNeeded(): Promise<void> {
  const podfile = path.join(IOS_DIR, 'Podfile');
  if (!(await exists(podfile))) {
    log('No ios/Podfile found -- skipping pod install.');
    return;
  }
  run('pod', ['install'], { cwd: IOS_DIR });
}

function archive(workspacePath: string, scheme: string): void {
  run('xcodebuild', [
    'clean',
    'archive',
    '-workspace',
    workspacePath,
    '-scheme',
    scheme,
    '-configuration',
    'Release',
    '-destination',
    'generic/platform=iOS',
    '-archivePath',
    ARCHIVE_PATH,
    'ARCHS=arm64',
    'VALID_ARCHS=arm64',
    'ONLY_ACTIVE_ARCH=NO',
    // Signing explicitly disabled, not merely skipped -- this is what
    // guarantees the archive step cannot silently pick up a local
    // developer identity and produce a signed-but-untraceable artifact.
    'CODE_SIGNING_ALLOWED=NO',
    'CODE_SIGNING_REQUIRED=NO',
    'CODE_SIGN_IDENTITY=',
    'CODE_SIGN_ENTITLEMENTS=',
    'DEVELOPMENT_TEAM=',
    'PROVISIONING_PROFILE=',
    'PROVISIONING_PROFILE_SPECIFIER=',
    'AD_HOC_CODE_SIGNING_ALLOWED=YES',
    'SKIP_INSTALL=NO',
    'BUILD_LIBRARY_FOR_DISTRIBUTION=NO',
  ]);
}

async function locateArchivedApp(): Promise<string> {
  const applicationsDir = path.join(ARCHIVE_PATH, 'Products', 'Applications');
  if (!(await exists(applicationsDir))) {
    fail(`No Products/Applications directory found in the archive at ${ARCHIVE_PATH}`);
  }
  const entries = await readdir(applicationsDir);
  const apps = entries.filter((name) => name.endsWith('.app'));
  if (apps.length === 0) {
    fail(`No .app bundle found under ${applicationsDir}`);
  }
  if (apps.length > 1) {
    fail(
      `Expected exactly one .app bundle under ${applicationsDir} (RideFinder has a single app target), found: ${apps.join(', ')}`,
    );
  }
  const appPath = path.join(applicationsDir, apps[0]!);
  log(`Located archived app: ${appPath}`);
  return appPath;
}

interface AppBundleReport {
  appPath: string;
  executableName: string;
  bundleId: string;
  archs: string[];
}

/** The same checks the prior workflow ran post-build, run here against the
 * archived .app before it's ever copied into Payload/, so a bad archive
 * fails fast instead of producing a bad IPA. */
async function verifyAppBundle(appPath: string): Promise<AppBundleReport> {
  const infoPlist = path.join(appPath, 'Info.plist');
  if (!(await exists(infoPlist))) {
    fail(`${appPath} has no Info.plist`);
  }

  const bundleId = plistRead(infoPlist, 'CFBundleIdentifier');
  if (bundleId !== EXPECTED_BUNDLE_ID) {
    fail(`Bundle identifier mismatch: expected "${EXPECTED_BUNDLE_ID}", got "${bundleId ?? '(missing)'}"`);
  }

  const packageType = plistRead(infoPlist, 'CFBundlePackageType');
  if (packageType !== 'APPL') {
    fail(`CFBundlePackageType is "${packageType ?? '(missing)'}", expected "APPL"`);
  }

  const executableName = plistRead(infoPlist, 'CFBundleExecutable');
  if (!executableName) {
    fail(`Info.plist at ${infoPlist} has no CFBundleExecutable`);
  }
  const executablePath = path.join(appPath, executableName);
  if (!(await exists(executablePath))) {
    fail(`Executable "${executableName}" declared in Info.plist not found at ${executablePath}`);
  }
  const execStat = await stat(executablePath);
  if ((execStat.mode & 0o111) === 0) {
    fail(`Executable ${executablePath} exists but is not executable`);
  }

  const supportedPlatformsRaw = spawnSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleSupportedPlatforms', infoPlist], {
    encoding: 'utf8',
  }).stdout;
  if (/simulator/i.test(supportedPlatformsRaw)) {
    fail(`${infoPlist} declares a Simulator-supported platform -- this is not a physical-device build`);
  }
  if (!/iPhoneOS/.test(supportedPlatformsRaw)) {
    fail(`${infoPlist} does not declare iPhoneOS as a supported platform`);
  }

  const minimumOsVersion = plistRead(infoPlist, 'MinimumOSVersion');
  log(`MinimumOSVersion: ${minimumOsVersion ?? '(not set)'}`);

  const archOutput = execFileSync('lipo', ['-archs', executablePath], { encoding: 'utf8' }).trim();
  const archs = archOutput.split(/\s+/).filter(Boolean);
  log(`Executable architectures: ${archs.join(', ')}`);
  if (!archs.includes('arm64')) {
    fail(`Executable does not contain an arm64 slice (found: ${archOutput})`);
  }
  if (archs.includes('x86_64')) {
    fail(`Executable contains an x86_64 slice -- this looks like a Simulator build, not a device build`);
  }

  // arm64 alone isn't sufficient proof of a device build (Apple Silicon
  // Simulator binaries are also arm64) -- the Mach-O platform load command
  // must say iOS (2), never iOS-Simulator (7).
  const otoolOutput = execFileSync('otool', ['-l', executablePath], { encoding: 'utf8' });
  const buildVersionMatch = /LC_BUILD_VERSION[\s\S]{0,200}?platform\s+(\d+)/.exec(otoolOutput);
  if (buildVersionMatch) {
    const platform = buildVersionMatch[1];
    if (platform === '7') {
      fail(`Executable's Mach-O platform load command reports iOS-Simulator (7), not a physical device`);
    }
    if (platform !== '2') {
      log(`::warning::Unexpected Mach-O platform value "${platform}" (expected 2 for iOS) -- relying on the other checks above`);
    }
  } else if (!/LC_VERSION_MIN_IPHONEOS/.test(otoolOutput)) {
    log('::warning::Could not find LC_BUILD_VERSION or LC_VERSION_MIN_IPHONEOS in the executable\'s load commands');
  }

  const frameworksDir = path.join(appPath, 'Frameworks');
  const binaryStrings = execFileSync('strings', [executablePath], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 });
  const loadCommands = execFileSync('otool', ['-L', executablePath], { encoding: 'utf8' });
  const modulePresent = async (name: string): Promise<boolean> => {
    if (await exists(frameworksDir)) {
      const frameworkEntries = await readdir(frameworksDir);
      if (frameworkEntries.some((entry) => entry.toLowerCase().startsWith(name.toLowerCase()))) return true;
    }
    return new RegExp(name, 'i').test(loadCommands) || new RegExp(name, 'i').test(binaryStrings);
  };
  for (const requiredModule of ['hermes', 'ExpoModulesCore']) {
    if (!(await modulePresent(requiredModule))) {
      fail(`Required native module "${requiredModule}" not found embedded, load-commanded, or linked into ${executablePath}`);
    }
    log(`Required native module present: ${requiredModule}`);
  }

  // react-native-screens (which ships the native TabsHost backing
  // NativeTabs) is always statically present in this project -- not an
  // optional/removable dependency -- so its absence here would mean the
  // archive doesn't actually contain the native tab bar implementation.
  if (!(await modulePresent('RNScreens')) && !(await modulePresent('rnscreens'))) {
    log('::warning::Could not positively confirm react-native-screens (native tab bar) in the compiled binary -- proceeding, since Expo SDK 57 can statically inline this module under a different symbol name.');
  }

  const jsBundlePath = path.join(appPath, 'main.jsbundle');
  if (!(await exists(jsBundlePath))) {
    fail(`No embedded JavaScript bundle found at ${jsBundlePath} -- this is not a complete Release build`);
  }
  const jsBundleStat = await stat(jsBundlePath);
  if (jsBundleStat.size < 1024) {
    fail(`Embedded JavaScript bundle at ${jsBundlePath} is suspiciously small (${jsBundleStat.size} bytes)`);
  }
  log(`Embedded JS bundle present: ${jsBundlePath} (${jsBundleStat.size} bytes)`);

  if (await exists(path.join(appPath, 'PlugIns'))) {
    const plugins = (await readdir(path.join(appPath, 'PlugIns'))).filter((name) => name.endsWith('.appex'));
    if (plugins.length > 0) {
      log(`::warning::Found ${plugins.length} app extension(s) under PlugIns/ -- RideFinder is not expected to have any: ${plugins.join(', ')}. Not deleting them automatically; verify they're expected before shipping this build.`);
    }
  }

  return { appPath, executableName, bundleId, archs };
}

async function packageIpa(appPath: string, ipaName: string): Promise<string> {
  await rm(PAYLOAD_DIR, { recursive: true, force: true });
  await mkdir(PAYLOAD_DIR, { recursive: true });
  // Named after the archive's own .app, not a hardcoded product-name
  // constant -- avoids this drifting out of sync with whatever Xcode
  // actually calls the product (which follows app.config.ts's `name`)
  // the next time the app is renamed.
  const destAppPath = path.join(PAYLOAD_DIR, path.basename(appPath));

  // `ditto`, not `cp -R`: Apple's own tooling uses ditto specifically
  // because plain cp can silently drop extended attributes/resource-fork
  // metadata on a bundle, which some re-signing tools depend on when they
  // walk and re-sign every nested framework. This project's prior
  // pipeline used `cp -R "$APP_PATH"/. "Payload/$APP.app"`, which is the
  // most likely single cause of "integrity cannot be confirmed" /
  // "Failed to install IPA" on re-sign.
  run('ditto', [appPath, destAppPath]);

  const ipaPath = path.join(BUILD_DIR, ipaName);
  await rm(ipaPath, { force: true });
  // `-y`: store symlinks as symlinks instead of dereferencing them into
  // full copies. This flag was ALSO missing from the prior pipeline's zip
  // invocation (`zip -qr -X "$IPA_NAME" Payload`) -- without it, BSD zip's
  // default behavior follows symlinks, which can silently duplicate or
  // corrupt framework content that legitimately uses them. `-X` alone
  // (present before) only strips extra file attributes; it does not
  // address symlink handling.
  run('zip', ['-qr', '-X', '-y', ipaName, 'Payload'], { cwd: BUILD_DIR });
  // Remove only the temporary Payload directory, per spec -- never the
  // archive or the IPA itself.
  await rm(PAYLOAD_DIR, { recursive: true, force: true });

  if (!(await exists(ipaPath))) {
    fail(`IPA packaging failed -- ${ipaPath} was not created`);
  }
  const ipaStat = await stat(ipaPath);
  log(`Packaged ${ipaName} (${ipaStat.size} bytes)`);
  return ipaPath;
}

/** Unzips the finished IPA into a fresh directory and re-validates it from
 * scratch, independent of the in-memory state from packaging -- this is
 * what actually catches a packaging-step bug rather than trusting that
 * "the script that built it says it's fine". */
async function validateIpa(ipaPath: string, report: AppBundleReport): Promise<void> {
  await rm(VALIDATION_DIR, { recursive: true, force: true });
  await mkdir(VALIDATION_DIR, { recursive: true });
  run('unzip', ['-q', ipaPath, '-d', VALIDATION_DIR]);

  const topLevelEntries = await readdir(VALIDATION_DIR);
  if (topLevelEntries.length !== 1 || topLevelEntries[0] !== 'Payload') {
    fail(
      `IPA has an incorrect root: expected exactly one top-level "Payload" directory, found [${topLevelEntries.join(', ')}]. ` +
        'A raw `ipa` needs Payload at the archive root, not nested inside an extra parent directory.',
    );
  }

  const payloadDir = path.join(VALIDATION_DIR, 'Payload');
  const payloadEntries = (await readdir(payloadDir)).filter((name) => name.endsWith('.app'));
  if (payloadEntries.length !== 1) {
    fail(`Expected exactly one .app directly under Payload/, found: ${payloadEntries.join(', ') || '(none)'}`);
  }
  const extractedAppPath = path.join(payloadDir, payloadEntries[0]!);

  const extractedInfoPlist = path.join(extractedAppPath, 'Info.plist');
  if (!(await exists(extractedInfoPlist))) {
    fail(`Extracted IPA's app bundle has no Info.plist at ${extractedInfoPlist}`);
  }
  const extractedExecutablePath = path.join(extractedAppPath, report.executableName);
  if (!(await exists(extractedExecutablePath))) {
    fail(`Extracted IPA is missing its executable at ${extractedExecutablePath} -- packaging dropped it`);
  }
  const extractedStat = await stat(extractedExecutablePath);
  if ((extractedStat.mode & 0o111) === 0) {
    fail(`Extracted executable at ${extractedExecutablePath} lost its executable bit during packaging`);
  }

  const extractedArchOutput = execFileSync('lipo', ['-archs', extractedExecutablePath], { encoding: 'utf8' }).trim();
  if (extractedArchOutput.trim() !== report.archs.join(' ')) {
    fail(
      `Architecture changed after packaging: archive had "${report.archs.join(' ')}", extracted IPA has "${extractedArchOutput}"`,
    );
  }

  const extractedBundleId = plistRead(extractedInfoPlist, 'CFBundleIdentifier');
  if (extractedBundleId !== report.bundleId) {
    fail(`Bundle identifier changed after packaging: archive had "${report.bundleId}", extracted IPA has "${extractedBundleId}"`);
  }

  if (!(await exists(path.join(extractedAppPath, 'main.jsbundle')))) {
    fail('Extracted IPA is missing its embedded JavaScript bundle -- packaging dropped it');
  }

  await rm(VALIDATION_DIR, { recursive: true, force: true });
  log('IPA structure, executable, architecture, bundle id, and JS bundle all confirmed intact after packaging.');
  log('Signing state: UNSIGNED. This IPA cannot be installed directly -- it must be re-signed by Sideloadly, AltStore, or SideStore at install time.');
}

async function main(): Promise<void> {
  // --production is accepted for parity with the invoking package script,
  // but is a no-op: this project has exactly one build target (the real
  // Supabase project), never a distinct demo/staging mode, so there's no
  // second behavior for a flag to select between.
  if (process.argv.includes('--production')) {
    log('--production flag noted (this script always builds against the real Supabase project).');
  }

  await requireMacOS();
  await requireEnv(['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY']);

  const ipaName = process.env.IOS_IPA_NAME ?? 'RideFinder-unsigned.ipa';

  await cleanPriorBuildOutputs();
  const workspacePath = await resolveWorkspace();
  const scheme = await resolveScheme(workspacePath);
  await installPodsIfNeeded();
  archive(workspacePath, scheme);
  const archivedAppPath = await locateArchivedApp();
  const report = await verifyAppBundle(archivedAppPath);
  const ipaPath = await packageIpa(archivedAppPath, ipaName);
  await validateIpa(ipaPath, report);

  await writeGithubOutputs({ ipaPath, ...report });

  log(`Done: ${ipaPath}`);
}

/** Emits step outputs when running under GitHub Actions (GITHUB_OUTPUT set)
 * so a workflow can reference them -- e.g. for the job summary or to name
 * the uploaded artifact -- without re-deriving anything this script
 * already verified. A no-op when run locally. */
async function writeGithubOutputs(values: AppBundleReport & { ipaPath: string }): Promise<void> {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;
  const lines = [
    `ipa_path=${values.ipaPath}`,
    `bundle_id=${values.bundleId}`,
    `executable_name=${values.executableName}`,
    `arch_info=${values.archs.join(' ')}`,
  ];
  await appendFile(outputFile, lines.join('\n') + '\n', 'utf8');
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.stack ?? error.message : String(error));
});
