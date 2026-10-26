const { withAppBuildGradle } = require('expo/config-plugins');

// Release builds are signed with Noteriv's own key, read from the environment so it never enters the repository:
//   NOTERIV_RELEASE_STORE_FILE      path to the .jks keystore
//   NOTERIV_RELEASE_STORE_PASSWORD  its password (also the key's password: PKCS12 uses one)
//   NOTERIV_RELEASE_KEY_ALIAS       the key's alias (noteriv)
// The template signs release builds with the debug key; an APK signed that way could not be updated by a properly
// signed one, so without these variables a release build stops with an error instead. Debug builds are unchanged.
// See docs/plans/2026-10-26-phien-k-m4-ghi-nhanh-ci-release.md for where the keystore lives.

const MARKER = '// noteriv-release-signing';

const SIGNING_CONFIG = `
        release {
            ${MARKER}
            def storeFilePath = System.getenv("NOTERIV_RELEASE_STORE_FILE")
            if (storeFilePath) {
                storeFile file(storeFilePath)
                storePassword System.getenv("NOTERIV_RELEASE_STORE_PASSWORD")
                keyAlias System.getenv("NOTERIV_RELEASE_KEY_ALIAS") ?: "noteriv"
                keyPassword System.getenv("NOTERIV_RELEASE_STORE_PASSWORD")
            }
        }`;

const GUARD = `
${MARKER}
gradle.taskGraph.whenReady { graph ->
    if (graph.allTasks.any { it.name.toLowerCase().contains("release") } && !System.getenv("NOTERIV_RELEASE_STORE_FILE")) {
        throw new GradleException("Release builds are signed with Noteriv's key: set NOTERIV_RELEASE_STORE_FILE, NOTERIV_RELEASE_STORE_PASSWORD and NOTERIV_RELEASE_KEY_ALIAS.")
    }
}
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (gradle.includes(MARKER)) return config;

    const signingAnchor = /signingConfigs\s*\{\s*\n(\s*)debug\s*\{/;
    if (!signingAnchor.test(gradle)) {
      throw new Error('withReleaseSigning: no `signingConfigs { debug {` block in android/app/build.gradle');
    }
    gradle = gradle.replace(signingAnchor, (whole) => whole.replace(/debug\s*\{$/, `${SIGNING_CONFIG.trim()}\n        debug {`));

    // In buildTypes.release, the template's `signingConfig signingConfigs.debug` becomes the release config.
    const releaseType = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!releaseType.test(gradle)) {
      throw new Error('withReleaseSigning: no `signingConfig signingConfigs.debug` in buildTypes.release');
    }
    gradle = gradle.replace(releaseType, '$1signingConfig signingConfigs.release');

    config.modResults.contents = gradle + GUARD;
    return config;
  });
};
