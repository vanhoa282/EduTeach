import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function TutorProfileScreen({ user, onLogout }) {
  const items = [
    { icon: 'person-outline', label: 'Thông tin cá nhân', color: '#3B82F6' },
    { icon: 'document-text-outline', label: 'Hồ sơ gia sư', color: '#8B5CF6' },
    { icon: 'card-outline', label: 'Tài khoản ngân hàng', color: '#10B981' },
    { icon: 'shield-checkmark-outline', label: 'Xác minh CCCD', color: '#F59E0B' },
    { icon: 'star-outline', label: 'Đánh giá của học sinh', color: '#EC4899' },
    { icon: 'headset-outline', label: 'Liên hệ hỗ trợ', color: '#6B7280' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatarBox}>
            <Ionicons name="person" size={40} color="#2563EB" />
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

        <View style={styles.menu}>
          {items.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.menuItem, idx === items.length - 1 && styles.menuItemLast]}
              activeOpacity={0.7}
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
  avatarBox: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    position: 'relative',
  },
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
  menu: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  menuLabel: { flex: 1, fontSize: 15, color: '#111', fontWeight: '500' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: 12, padding: 16,
  },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '600' },
});
