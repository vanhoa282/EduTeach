import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { adminGetUsers, adminUpdateRole, adminSetStatus } from '../../lib/auth';
import { adminResetPassword } from '../../lib/adminTutor';

const ROLE_CFG = {
  student: { label: 'Học sinh', color: '#2563EB', bg: '#EFF6FF', icon: 'school' },
  tutor: { label: 'Gia sư', color: '#8B5CF6', bg: '#F5F3FF', icon: 'briefcase' },
  admin: { label: 'Admin', color: '#7C3AED', bg: '#F5F3FF', icon: 'shield-checkmark' },
};

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'student', label: 'Học sinh' },
  { key: 'tutor', label: 'Gia sư' },
  { key: 'admin', label: 'Admin' },
  { key: 'banned', label: 'Bị khoá' },
];

export default function UsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    const res = await adminGetUsers();
    if (res.users) setUsers(res.users);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const doChangeRole = async (userId, role) => {
    const res = await adminUpdateRole(userId, role);
    if (res.error) return Alert.alert('Lỗi', res.error);
    Alert.alert('OK', 'Đã đổi role thành ' + role);
    load();
  };

  const handleChangeRole = (user) => {
    Alert.alert(
      'Đổi role',
      'Đổi role cho ' + (user.full_name || user.phone),
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Học sinh', onPress: () => doChangeRole(user.id, 'student') },
        { text: 'Gia sư', onPress: () => doChangeRole(user.id, 'tutor') },
        { text: 'Admin', onPress: () => doChangeRole(user.id, 'admin') },
      ]
    );
  };

  const handleToggleBan = (user) => {
    const newStatus = user.status === 'banned' ? 'active' : 'banned';
    Alert.alert(
      newStatus === 'banned' ? 'Khoá tài khoản' : 'Mở khoá',
      `Bạn chắc chắn muốn ${newStatus === 'banned' ? 'khoá' : 'mở khoá'} ${user.full_name || user.phone}?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            const res = await adminSetStatus(user.id, newStatus);
            if (res.error) return Alert.alert('Lỗi', res.error);
            load();
          },
        },
      ]
    );
  };

  const handleResetPassword = (user) => {
    Alert.alert('Reset mật khẩu', `Đặt mật khẩu mới cho ${user.full_name || user.phone}?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Random',
        onPress: async () => {
          const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
          let p = '';
          for (let i = 0; i < 8; i++) p += chars.charAt(Math.floor(Math.random() * chars.length));
          const res = await adminResetPassword(user.id, p);
          if (res.error) return Alert.alert('Lỗi', res.error);
          Alert.alert('Mật khẩu mới', `SĐT: ${user.phone}\nMật khẩu: ${p}`);
        },
      },
    ]);
  };

  const filtered = users.filter(u => {
    if (filter === 'banned' && u.status !== 'banned') return false;
    if (filter !== 'all' && filter !== 'banned' && u.role !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.phone || '').includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  const studentCount = users.filter(u => u.role === 'student').length;
  const tutorCount = users.filter(u => u.role === 'tutor').length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const bannedCount = users.filter(u => u.status === 'banned').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Người dùng</Text>
        <Text style={styles.subtitle}>
          {users.length} tổng · {studentCount} HS · {tutorCount} GS · {adminCount} admin
          {bannedCount > 0 ? ` · ${bannedCount} khoá` : ''}
        </Text>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên, SĐT..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filtered.map(u => {
          const cfg = ROLE_CFG[u.role] || ROLE_CFG.student;
          const banned = u.status === 'banned';
          return (
            <View key={u.id} style={[styles.card, banned && styles.cardBanned]}>
              <View style={styles.cardHeader}>
                <View style={[styles.avatarBox, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{u.full_name || 'Chưa có tên'}</Text>
                    {banned && (
                      <View style={styles.bannedBadge}>
                        <Text style={styles.bannedText}>ĐÃ KHOÁ</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.phone}>{u.phone}</Text>
                  <Text style={styles.joinDate}>
                    Tham gia: {new Date(u.created_at).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.roleText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleChangeRole(u)}>
                  <Ionicons name="swap-horizontal" size={14} color="#7C3AED" />
                  <Text style={styles.actionBtnText}>Đổi role</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => handleResetPassword(u)}>
                  <Ionicons name="key-outline" size={14} color="#7C3AED" />
                  <Text style={styles.actionBtnText}>Reset pass</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, banned && { backgroundColor: '#F0FDF4' }]}
                  onPress={() => handleToggleBan(u)}
                >
                  <Ionicons
                    name={banned ? 'lock-open-outline' : 'lock-closed-outline'}
                    size={14}
                    color={banned ? '#10B981' : '#EF4444'}
                  />
                  <Text style={[styles.actionBtnText, { color: banned ? '#10B981' : '#EF4444' }]}>
                    {banned ? 'Mở' : 'Khoá'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Không có user nào</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  filterRow: { gap: 8, paddingBottom: 16 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  filterChipText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 15, color: '#9CA3AF', marginTop: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardBanned: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  bannedBadge: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  bannedText: { fontSize: 9, color: '#DC2626', fontWeight: 'bold' },
  phone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  joinDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  roleText: { fontSize: 11, fontWeight: '600' },
  actionsRow: {
    flexDirection: 'row', gap: 6, marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, backgroundColor: '#F5F3FF', paddingVertical: 9, borderRadius: 9,
  },
  actionBtnText: { fontSize: 11, color: '#7C3AED', fontWeight: '600' },
});
