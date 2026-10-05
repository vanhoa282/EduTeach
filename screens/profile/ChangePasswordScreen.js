import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { changePassword } from '../../lib/auth';

export default function ChangePasswordScreen({ user, onBack }) {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [show3, setShow3] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!oldPass || !newPass || !confirm) {
      return Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ');
    }
    if (newPass.length < 6) {
      return Alert.alert('Lỗi', 'Mật khẩu mới phải từ 6 ký tự');
    }
    if (newPass !== confirm) {
      return Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
    }

    setSaving(true);
    const res = await changePassword(user.id, oldPass, newPass);
    setSaving(false);

    if (res.error) return Alert.alert('Lỗi', res.error);

    Alert.alert('Thành công', 'Đã đổi mật khẩu', [
      { text: 'OK', onPress: onBack },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Đổi mật khẩu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.iconHeader}>
          <View style={styles.iconBox}>
            <Ionicons name="lock-closed" size={36} color="#8B5CF6" />
          </View>
          <Text style={styles.headerTitle}>Bảo mật tài khoản</Text>
          <Text style={styles.headerDesc}>
            Đổi mật khẩu định kỳ để bảo vệ tài khoản của bạn
          </Text>
        </View>

        <Text style={styles.label}>Mật khẩu hiện tại</Text>
        <View style={styles.inputBox}>
          <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="Nhập mật khẩu cũ"
            secureTextEntry={!show1}
            value={oldPass}
            onChangeText={setOldPass}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity onPress={() => setShow1(!show1)}>
            <Ionicons name={show1 ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Mật khẩu mới</Text>
        <View style={styles.inputBox}>
          <Ionicons name="key-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="Tối thiểu 6 ký tự"
            secureTextEntry={!show2}
            value={newPass}
            onChangeText={setNewPass}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity onPress={() => setShow2(!show2)}>
            <Ionicons name={show2 ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
        <View style={styles.inputBox}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="Nhập lại mật khẩu mới"
            secureTextEntry={!show3}
            value={confirm}
            onChangeText={setConfirm}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity onPress={() => setShow3(!show3)}>
            <Ionicons name={show3 ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={20} color="#F59E0B" />
          <Text style={styles.noteText}>
            Sau khi đổi mật khẩu, bạn sẽ không bị đăng xuất. Nhớ mật khẩu mới cho lần đăng nhập sau.
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
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
              <Text style={styles.saveText}>Đổi mật khẩu</Text>
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
  iconHeader: { alignItems: 'center', marginBottom: 32 },
  iconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  headerDesc: {
    fontSize: 13, color: '#6B7280', textAlign: 'center',
    marginTop: 6, paddingHorizontal: 20, lineHeight: 18,
  },
  label: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 8, marginTop: 4 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  input: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  noteBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#FFFBEB',
    borderRadius: 12, padding: 14, marginTop: 8,
    borderWidth: 1, borderColor: '#FEF3C7',
  },
  noteText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#8B5CF6', paddingVertical: 16, borderRadius: 12,
  },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
