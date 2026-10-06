import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toggleAvailable } from '../../lib/tutorSchedule';

export default function TutorProfileScreen({ user, onLogout, onOpenScreen }) {
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('users').select('is_available').eq('id', user.id).maybeSingle();
      if (data) setIsAvailable(data.is_available !== false);
    })();
  }, [user.id]);

  const handleToggleAvailable = async (value) => {
    setIsAvailable(value);
    const res = await toggleAvailable(user.id, value);
    if (res.error) {
      setIsAvailable(!value);
      Alert.alert('Lỗi', res.error);
    }
  };

  const items = [
    { key: 'edit-profile', icon: 'person-outline', label: 'Thông tin cá nhân', color: '#3B82F6' },
    { key: 'tutor-profile', icon: 'document-text-outline', label: 'Hồ sơ gia sư', color: '#8B5CF6' },
    { key: 'set-schedule', icon: 'calendar-outline', label: 'Lịch rảnh của tôi', color: '#F59E0B' },
    { key: 'revenue', icon: 'trending-up-outline', label: 'Doanh thu', color: '#10B981' },
    { key: 'my-reviews', icon: 'star-outline', label: 'Đánh giá của học sinh', color: '#EC4899' },
    { key: 'bank', icon: 'card-outline', label: 'Tài khoản ngân hàng', color: '#06B6D4' },
    { key: 'change-password', icon: 'lock-closed-outline', label: 'Bảo mật', color: '#EF4444' },
    { key: 'support', icon: 'headset-outline', label: 'Liên hệ hỗ trợ', color: '#6B7280' },
    { key: 'terms', icon: 'document-text-outline', label: 'Điều khoản & Chính sách', color: '#9CA3AF' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            {user?.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={styles.avatarImg}
                onError={(e) => console.log('Avatar error:', e.nativeEvent.error)}
              />
            ) : (
              <Ionicons name="person" size={40} color="#2563EB" />
            )}
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          </View>
          <Text style={styles.name}>{user?.full_name || 'Gia sư'}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>

          <View style={styles.ratingBox}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.ratingText}>4.9</Text>
            <Text style={styles.ratingSub}>(128 đánh giá)</Text>
          </View>
        </View>

        <View style={[styles.availableCard, !isAvailable && styles.availableCardOff]}>
          <View style={[styles.availableIconBox, { backgroundColor: isAvailable ? '#D1FAE5' : '#FEE2E2' }]}>
            <Ionicons
              name={isAvailable ? 'checkmark-circle' : 'pause-circle'}
              size={24}
              color={isAvailable ? '#10B981' : '#EF4444'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.availableTitle}>
              {isAvailable ? 'Đang nhận lớp' : 'Tạm ngưng nhận lớp'}
            </Text>
            <Text style={styles.availableDesc}>
              {isAvailable
                ? 'Học sinh có thể đặt lớp với bạn'
                : 'Học sinh sẽ không thấy bạn trong danh sách'}
            </Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={handleToggleAvailable}
            trackColor={{ true: '#10B981', false: '#D1D5DB' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.menu}>
          {items.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, idx === items.length - 1 && styles.menuItemLast]}
              activeOpacity={0.7}
              onPress={() => onOpenScreen && onOpenScreen(item.key)}
            >
              <View style={[styles.menuIconBox, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },
  header: { alignItems: 'center', paddingVertical: 24 },
  avatarWrap: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    position: 'relative', overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  verifiedBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  name: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  phone: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  ratingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: '#FFFBEB', borderRadius: 20,
  },
  ratingText: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  ratingSub: { fontSize: 12, color: '#9CA3AF' },
  availableCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 16,
    borderWidth: 2, borderColor: '#D1FAE5',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  availableCardOff: { borderColor: '#FEE2E2' },
  availableIconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  availableTitle: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  availableDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  menu: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIconBox: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  menuLabel: { flex: 1, fontSize: 14, color: '#111', fontWeight: '500' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: 12, padding: 16,
  },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '600' },
});
