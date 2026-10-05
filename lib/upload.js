import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

// Chọn ảnh từ thư viện
export async function pickImage({ allowsEditing = true, aspect = [4, 3] } = {}) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return { error: 'Cần quyền truy cập thư viện ảnh' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing,
    aspect,
    quality: 0.7,
  });

  if (result.canceled) return { cancelled: true };
  return { uri: result.assets[0].uri };
}

// Chụp ảnh mới
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

// Upload ảnh lên Supabase Storage
export async function uploadImage({ uri, bucket = 'bills', folder = '' }) {
  if (!uri) return { error: 'Không có ảnh' };

  try {
    // Đọc file dạng base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 sang ArrayBuffer
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Tạo tên file unique
    const ext = uri.split('.').pop() || 'jpg';
    const filename = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, bytes, {
        contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
        upsert: false,
      });

    if (error) return { error: error.message };

    // Lấy public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, path: data.path };
  } catch (e) {
    return { error: e.message || 'Upload thất bại' };
  }
}
