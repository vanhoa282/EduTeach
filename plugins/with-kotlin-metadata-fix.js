const { withProjectBuildGradle } = require('expo/config-plugins');

// firebase-auth 25 (via @react-native-firebase/auth v27) ships Kotlin 2.4 metadata.
// Some library modules still compile with an older per-module Kotlin compiler and
// fail with "Module was compiled with an incompatible version of Kotlin" when the
// classpath carries the 2.4 stdlib. This flag tells every Kotlin compile task to
// skip the metadata version check (the workaround the compiler itself suggests).
module.exports = function withKotlinMetadataFix(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes('skip-metadata-version-check')) {
      cfg.modResults.contents += `
// Cooper: allow per-module Kotlin compilers to read newer stdlib metadata
subprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            freeCompilerArgs += ['-Xskip-metadata-version-check']
        }
    }
}
`;
    }
    return cfg;
  });
};
