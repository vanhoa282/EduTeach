const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins");
const { getMainApplicationOrThrow } = AndroidConfig.Manifest;

module.exports = function withBackgroundActions(config) {
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
