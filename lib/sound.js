import { Audio } from 'expo-av';

let soundObject = null;

export async function playNotificationSound() {
  try {
    // Nếu đang có sound cũ → stop
    if (soundObject) {
      try { await soundObject.unloadAsync(); } catch (e) {}
      soundObject = null;
    }

    // Dùng âm notification mặc định của hệ thống (Android)
    // Hoặc dùng URL remote
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
