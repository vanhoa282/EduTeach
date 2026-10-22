const { withAndroidManifest, withProjectBuildGradle, AndroidConfig } = require("expo/config-plugins");
const { getMainApplicationOrThrow } = AndroidConfig.Manifest;

// Cooper fix (2026-10-22): module expo-foreground-actions compiles Kotlin with
// jvmTarget 11 while the app targets Java 17 -> EAS Gradle error
// "Inconsistent JVM Target Compatibility" (build 4bb52d57 errored).
// Force every KotlinCompile task in subprojects to JVM target 17 at prebuild
// time so the fix survives a fresh prebuild.
const JVM_TARGET_FIX = [
  "",
  "// Cooper fix: force KotlinCompile of all subprojects to JVM target 17 (match app Java 17)",
  "subprojects {",
  "  tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {",
  "    kotlinOptions {",
  "      jvmTarget = '17'",
  "    }",
  "  }",
  "}",
  "",
].join("\n");

module.exports = function withBackgroundActions(config) {
  config = withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes("KotlinCompile")) {
      config.modResults.contents += JVM_TARGET_FIX;
    }
    return config;
  });

  return withAndroidManifest(config, async (config) => {
    const application = getMainApplicationOrThrow(config.modResults);
    const service = application.service ? application.service : [];

    // Tránh duplicate khi prebuild nhiều lần
    const exists = service.some(
      (s) => s.$ && s.$["android:name"] === "expo.modules.foregroundactions.ExpoForegroundActionsService"
    );
    if (exists) return config;

    config.modResults = {
      manifest: {
        ...config.modResults.manifest,
        application: [
          {
            ...application,
            service: [
              ...service,
              {
                $: {
                  "android:name": "expo.modules.foregroundactions.ExpoForegroundActionsService",
                  "android:foregroundServiceType": "camera|microphone",
                  "android:exported": "false",
                },
              },
            ],
          },
        ],
      },
    };

    return config;
  });
};
