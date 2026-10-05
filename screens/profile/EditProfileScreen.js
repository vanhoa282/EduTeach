import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { updateProfile } from '../../lib/auth';

const AVATARS = [
  'https://i.pravatar.cc/150?img=12',
  'https://i.pravatar.cc/150?img=45',
  'https://i.pravatar.cc/150?img=32',
  'https://i.pravatar.cc/150?img=15',
  'https://i.pravatar.cc/150?img=68',
  'https://i.pravatar.cc/150?img=49',
];

export default function EditProfileScreen({ user, onBack, onSaved }) {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatar, setAvatar] = useState(user?.avatar_url || AVATARS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      return Alert.alert('Lỗi', 'Vui lòng nhập họ tên');
    }

    setSaving(true);
    const res = await updateProfile(user.id, {
      fullName: fullName.trim(),
      avatarUrl: avatar,
    });
    setSaving(false);

    if (res.error) return Alert.alert('Lỗi', res.error);

    Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân', [
      { text: 'OK', onPress: () => onSaved && onSaved(res.user) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Thông tin cá nhân</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarEmoji}>
              {user?.role === 'tutor' ? '👨‍🏫' : '👤'}
            </Text>
          </View>
          <Text style={styles.avatarLabel}>Chọn avatar</Text>
        </View>

        <View style={styles.avatarGrid}>
          {AVATARS.map((url, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.avatarOption,
                avatar === url && styles.avatarOptionActive,
              ]}
              onPress={() => setAvatar(url)}
              activeOpacity={0.7}
            >
              <Text style={styles.avatarOptionText}>#{idx + 1}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Họ và tên</Text>
        <View style={styles.inputBox}>
          <Ionicons name="person-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="Nguyễn Văn A"
            value={fullName}
            onChangeText={setFullName}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <Text style={styles.label}>Số điện thoại</Text>
        <View style={[styles.inputBox, styles.inputBoxDisabled]}>
          <Ionicons name="call-outline" size={20} color="#D1D5DB" />
          <Text style={styles.inputDisabled}>{user?.phone}</Text>
          <Ionicons name="lock-closed" size={16} color="#D1D5DB" />
        </View>
        <Text style={styles.hint}>SĐT không thể thay đổi. Liên hệ admin nếu cần.</Text>

        <Text style={styles.label}>Vai trò</Text>
        <View style={[styles.inputBox, styles.inputBoxDisabled]}>
          <Ionicons
            name={user?.role === 'admin' ? 'shield-checkmark' : user?.role === 'tutor' ? 'briefcase' : 'school'}
            size={20}
            color="#D1D5DB"
          />
          <Text style={styles.inputDisabled}>
            {user?.role === 'admin' ? 'Quản trị viên' : user?.role === 'tutor' ? 'Gia sư' : 'Học sinh'}
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveText}>Lưu thay đổi</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  content: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  avatarEmoji: { fontSize: 48 },
  avatarLabel: { fontSize: 13, color: '#6B7280' },
  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    justifyContent: 'center', marginBottom: 24,
  },
  avatarOption: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 2, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarOptionActive: {
    borderColor: '#2563EB', backgroundColor: '#EFF6FF',
  },
  avatarOptionText: { fontSize: 12, fontWeight: 'bold', color: '#6B7280' },
  label: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 8, marginTop: 4 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  inputBoxDisabled: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' },
  input: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  inputDisabled: { flex: 1, fontSize: 15, color: '#9CA3AF' },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: -8, marginBottom: 16, paddingHorizontal: 4 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 12,
  },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
