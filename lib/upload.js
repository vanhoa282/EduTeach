import * as ImagePicker from 'expo-image-picker';
import { fetch as expoFetch } from 'expo/fetch';
import { supabase } from './supabase';

export async function pickImage({ allowsEditing = true, aspect = [4, 3] } = {}) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return { error: 'Cần quyền truy cập thư viện ảnh' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing,
    aspect,
    quality: 0.7,
  });

  if (result.canceled) return { cancelled: true };
  return { uri: result.assets[0].uri };
}

export async function takePhoto({ allowsEditing = true, aspect = [4, 3] } = {}) {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    return { error: 'Cần quyền truy cập camera' };
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing,
    aspect,
    quality: 0.7,
  });

  if (result.canceled) return { cancelled: true };
  return { uri: result.assets[0].uri };
}

export async function uploadImage({ uri, bucket = 'bills', folder = '' }) {
  if (!uri) return { error: 'Không có ảnh' };

  try {
    // Dùng expo/fetch để tránh warning blob
    const response = await expoFetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const ext = uri.split('.').pop().split('?')[0] || 'jpg';
    const filename = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, arrayBuffer, {
        contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
        upsert: false,
      });

    if (error) return { error: error.message };

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, path: data.path };
  } catch (e) {
    return { error: e.message || 'Upload thất bại' };
  }
}
