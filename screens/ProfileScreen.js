import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ user, onLogout, onOpenAdmin, onOpenScreen }) {
  const isAdmin = user?.role === 'admin';

  const items = [
    { key: 'edit-profile', icon: 'person-outline', label: 'Thông tin cá nhân', color: '#3B82F6' },
    { key: 'bank', icon: 'card-outline', label: 'Tài khoản ngân hàng', color: '#10B981' },
    { key: 'change-password', icon: 'lock-closed-outline', label: 'Bảo mật', color: '#8B5CF6' },
    { key: 'support', icon: 'headset-outline', label: 'Liên hệ hỗ trợ', color: '#F59E0B' },
    { key: 'terms', icon: 'document-text-outline', label: 'Điều khoản & Chính sách', color: '#6B7280' },
  ];

  const handleItem = (key) => {
    if (onOpenScreen) onOpenScreen(key);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatarBox}>
            <Ionicons
              name={isAdmin ? 'shield-checkmark' : 'person'}
              size={40}
              color={isAdmin ? '#7C3AED' : '#2563EB'}
            />
          </View>
          <Text style={styles.name}>{user?.full_name || user?.phone}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
          <View style={[styles.roleBadge, { backgroundColor: isAdmin ? '#F5F3FF' : '#EFF6FF' }]}>
            <Text style={[styles.roleText, { color: isAdmin ? '#7C3AED' : '#2563EB' }]}>
              {isAdmin ? 'Quản trị viên' : 'Khách hàng'}
            </Text>
          </View>
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={onOpenAdmin}
            activeOpacity={0.8}
          >
            <View style={styles.adminBtnIcon}>
              <Ionicons name="shield-checkmark" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminBtnTitle}>Trang quản trị</Text>
              <Text style={styles.adminBtnDesc}>Quản lý người dùng, khóa học, thanh toán</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.menu}>
          {items.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, idx === items.length - 1 && styles.menuItemLast]}
              activeOpacity={0.7}
              onPress={() => handleItem(item.key)}
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
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  name: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  phone: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  roleBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 8,
  },
  roleText: { fontSize: 12, fontWeight: '600' },
  adminBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#7C3AED', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  adminBtnIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  adminBtnTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  adminBtnDesc: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
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
