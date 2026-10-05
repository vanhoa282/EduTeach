let Audio = null;
try {
  Audio = require('expo-av').Audio;
} catch (e) {
  console.log('expo-av not available:', e.message);
}

let soundObject = null;

export async function playNotificationSound() {
  if (!Audio) return;
  try {
    if (soundObject) {
      try { await soundObject.unloadAsync(); } catch (e) {}
      soundObject = null;
    }
    const { sound } = await Audio.Sound.createAsync(
      { uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
      { shouldPlay: true, volume: 1.0 }
    );
    soundObject = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
        soundObject = null;
      }
    });
  } catch (e) {
    console.log('Play sound error:', e.message);
  }
}
