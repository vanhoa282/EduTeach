import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { adminCreateTutor } from '../../lib/adminTutor';

const SUBJECT_OPTIONS = ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Tin', 'Sinh', 'Sử', 'Địa', 'Nhạc', 'Vẽ'];

export default function CreateTutorScreen({ user, onBack, onCreated }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [price, setPrice] = useState('');
  const [expYears, setExpYears] = useState('');
  const [bio, setBio] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleSubject = (sub) => {
    setSubjects(prev =>
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  const handleCreate = async () => {
    setSaving(true);
    const res = await adminCreateTutor({
      phone: phone.trim(),
      password,
      fullName,
      subjects,
      price,
      experienceYears: expYears,
      bio,
      adminId: user.id,
    });
    setSaving(false);

    if (res.error) return Alert.alert('Lỗi', res.error);

    Alert.alert(
      'Thành công',
      `Đã tạo tài khoản gia sư:\n\nSĐT: ${phone}\nMật khẩu: ${password}\n\nHãy gửi thông tin này cho gia sư để họ đăng nhập.`,
      [{ text: 'OK', onPress: () => onCreated && onCreated() }]
    );
  };

  const handleRandomPass = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let p = '';
    for (let i = 0; i < 8; i++) p += chars.charAt(Math.floor(Math.random() * chars.length));
    setPassword(p);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Tạo tài khoản gia sư</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#7C3AED" />
          <Text style={styles.infoText}>
            Gia sư không tự đăng ký. Admin tạo tài khoản và gửi thông tin đăng nhập cho họ qua Zalo/SMS.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Thông tin đăng nhập</Text>

        <Text style={styles.label}>Số điện thoại</Text>
        <View style={styles.inputBox}>
          <Ionicons name="call-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="VD: 0901234567"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={10}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <Text style={styles.label}>Mật khẩu</Text>
        <View style={styles.inputBox}>
          <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="Tối thiểu 6 ký tự"
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)}>
            <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.randomBtn} onPress={handleRandomPass}>
          <Ionicons name="shuffle" size={16} color="#7C3AED" />
          <Text style={styles.randomText}>Tạo mật khẩu ngẫu nhiên</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>

        <Text style={styles.label}>Họ và tên</Text>
        <View style={styles.inputBox}>
          <Ionicons name="person-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="VD: Nguyễn Văn A"
            value={fullName}
            onChangeText={setFullName}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <Text style={styles.sectionTitle}>Hồ sơ gia sư</Text>

        <Text style={styles.label}>Môn dạy</Text>
        <View style={styles.subjectsGrid}>
          {SUBJECT_OPTIONS.map(sub => {
            const active = subjects.includes(sub);
            return (
              <TouchableOpacity
                key={sub}
                style={[styles.subjectChip, active && styles.subjectChipActive]}
                onPress={() => toggleSubject(sub)}
              >
                {active && <Ionicons name="checkmark" size={14} color="#fff" />}
                <Text style={[styles.subjectText, active && styles.subjectTextActive]}>{sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.hint}>Đã chọn {subjects.length} môn</Text>

        <Text style={styles.label}>Giá mỗi buổi (VND)</Text>
        <View style={styles.inputBox}>
          <Ionicons name="cash-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="VD: 200000"
            keyboardType="number-pad"
            value={price}
            onChangeText={setPrice}
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.unit}>đ</Text>
        </View>

        <Text style={styles.label}>Số năm kinh nghiệm</Text>
        <View style={styles.inputBox}>
          <Ionicons name="trending-up-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="VD: 3"
            keyboardType="number-pad"
            value={expYears}
            onChangeText={setExpYears}
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.unit}>năm</Text>
        </View>

        <Text style={styles.label}>Giới thiệu</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Giới thiệu ngắn về gia sư..."
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={500}
          placeholderTextColor="#9CA3AF"
        />

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleCreate}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.saveText}>Tạo tài khoản</Text>
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
  infoBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#F5F3FF',
    borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  infoText: { flex: 1, fontSize: 13, color: '#5B21B6', lineHeight: 19 },
  sectionTitle: {
    fontSize: 15, fontWeight: 'bold', color: '#7C3AED',
    marginTop: 16, marginBottom: 12,
  },
  label: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 8 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  input: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  unit: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  randomBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#F5F3FF', borderRadius: 20, marginBottom: 8,
  },
  randomText: { fontSize: 12, color: '#7C3AED', fontWeight: '600' },
  subjectsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  subjectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  subjectChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  subjectText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  subjectTextActive: { color: '#fff', fontWeight: '600' },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 16 },
  textarea: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    fontSize: 14, color: '#111', minHeight: 100, textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#7C3AED', paddingVertical: 16, borderRadius: 12,
  },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
