import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ phone, onLogout }) {
  const items = [
    { icon: 'person-outline', label: 'Thông tin cá nhân', color: '#3B82F6' },
    { icon: 'card-outline', label: 'Phương thức thanh toán', color: '#10B981' },
    { icon: 'lock-closed-outline', label: 'Bảo mật', color: '#8B5CF6' },
    { icon: 'headset-outline', label: 'Liên hệ hỗ trợ', color: '#F59E0B' },
    { icon: 'document-text-outline', label: 'Điều khoản & Chính sách', color: '#6B7280' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarBox}>
          <Ionicons name="person" size={40} color="#2563EB" />
        </View>
        <Text style={styles.name}>{phone}</Text>
        <Text style={styles.role}>Khách hàng</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },
  header: { alignItems: 'center', paddingVertical: 24 },
  avatarBox: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  name: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  role: { fontSize: 14, color: '#666', marginTop: 4 },
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
