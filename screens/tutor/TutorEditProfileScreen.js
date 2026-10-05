import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const SUBJECT_OPTIONS = ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Tin', 'Sinh', 'Sử', 'Địa'];

export default function TutorEditProfileScreen({ user, onBack, onSaved }) {
  const [bio, setBio] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [price, setPrice] = useState('');
  const [expYears, setExpYears] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setBio(data.bio || '');
        setSubjects(data.subjects || []);
        setPrice(data.price_per_session ? String(data.price_per_session) : '');
        setExpYears(data.experience_years ? String(data.experience_years) : '');
      }
      setLoading(false);
    })();
  }, [user.id]);

  const toggleSubject = (sub) => {
    setSubjects(prev =>
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  const handleSave = async () => {
    if (!bio.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập giới thiệu');
    if (subjects.length === 0) return Alert.alert('Lỗi', 'Chọn ít nhất 1 môn dạy');
    if (!price || parseInt(price) < 10000) {
      return Alert.alert('Lỗi', 'Giá mỗi buổi tối thiểu 10.000đ');
    }

    setSaving(true);
    const payload = {
      bio: bio.trim(),
      subjects,
      price_per_session: parseInt(price),
      experience_years: parseInt(expYears) || 0,
    };

    const { data: existing } = await supabase
      .from('tutor_profiles').select('user_id').eq('user_id', user.id).maybeSingle();

    let res;
    if (existing) {
      res = await supabase
        .from('tutor_profiles').update(payload).eq('user_id', user.id);
    } else {
      res = await supabase
        .from('tutor_profiles').insert({ user_id: user.id, ...payload });
    }
    setSaving(false);

    if (res.error) return Alert.alert('Lỗi', res.error.message);

    Alert.alert('Thành công', 'Đã cập nhật hồ sơ gia sư', [
      { text: 'OK', onPress: onSaved },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Hồ sơ gia sư</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#8B5CF6" />
          <Text style={styles.infoText}>
            Hồ sơ này giúp học sinh biết về bạn. Điền đầy đủ để được nhiều người chọn.
          </Text>
        </View>

        <Text style={styles.label}>Giới thiệu bản thân</Text>
        <TextInput
          style={styles.textarea}
          placeholder="VD: Gia sư Toán 12 với 5 năm kinh nghiệm..."
          value={bio}
          onChangeText={setBio}
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={500}
        />
        <Text style={styles.charCount}>{bio.length}/500</Text>

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
                <Text style={[styles.subjectText, active && styles.subjectTextActive]}>
                  {sub}
                </Text>
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
            placeholder="VD: 5"
            keyboardType="number-pad"
            value={expYears}
            onChangeText={setExpYears}
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.unit}>năm</Text>
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
              <Text style={styles.saveText}>Lưu hồ sơ</Text>
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
    borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  infoText: { flex: 1, fontSize: 13, color: '#5B21B6', lineHeight: 19 },
  label: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 8, marginTop: 4 },
  textarea: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    fontSize: 14, color: '#111', minHeight: 120, textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  charCount: {
    fontSize: 11, color: '#9CA3AF', textAlign: 'right',
    marginTop: 4, marginBottom: 12,
  },
  subjectsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  subjectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  subjectChipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  subjectText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  subjectTextActive: { color: '#fff', fontWeight: '600' },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 16 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  input: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  unit: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
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
