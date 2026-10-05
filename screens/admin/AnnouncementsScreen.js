import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl, ActivityIndicator, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { adminGetAnnouncements, adminCreateAnnouncement, adminToggleAnnouncement, adminDeleteAnnouncement } from '../../lib/announce';

const TYPE_OPTIONS = [
  { key: 'info', label: 'Thông tin', icon: 'information-circle', color: '#2563EB', bg: '#EFF6FF' },
  { key: 'success', label: 'Thành công', icon: 'checkmark-circle', color: '#10B981', bg: '#F0FDF4' },
  { key: 'warning', label: 'Cảnh báo', icon: 'warning', color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'danger', label: 'Khẩn', icon: 'alert-circle', color: '#EF4444', bg: '#FEF2F2' },
];

export default function AnnouncementsScreen({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('info');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await adminGetAnnouncements();
    if (res.announcements) setItems(res.announcements);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) return Alert.alert('Lỗi', 'Nhập tiêu đề');
    setSaving(true);
    const res = await adminCreateAnnouncement({
      title, content, type, userId: user.id,
    });
    setSaving(false);
    if (res.error) return Alert.alert('Lỗi', res.error);
    setShowModal(false);
    setTitle(''); setContent(''); setType('info');
    Alert.alert('Đã tạo', 'Thông báo sẽ hiện cho tất cả user');
    load();
  };

  const handleToggle = async (item) => {
    const res = await adminToggleAnnouncement(item.id, !item.active);
    if (res.error) return Alert.alert('Lỗi', res.error);
    load();
  };

  const handleDelete = (item) => {
    Alert.alert('Xoá', `Xoá "${item.title}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive',
        onPress: async () => {
          const res = await adminDeleteAnnouncement(item.id);
          if (res.error) return Alert.alert('Lỗi', res.error);
          load();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Thông báo hệ thống</Text>
            <Text style={styles.subtitle}>{items.length} thông báo</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {items.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="megaphone-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
            <Text style={styles.emptyDesc}>Bấm nút + để tạo thông báo đầu tiên</Text>
          </View>
        )}

        {items.map(item => {
          const cfg = TYPE_OPTIONS.find(t => t.key === item.type) || TYPE_OPTIONS[0];
          return (
            <View key={item.id} style={[styles.card, !item.active && styles.cardInactive]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.itemTime}>
                    {new Date(item.created_at).toLocaleString('vi-VN')}
                  </Text>
                </View>
                <Switch
                  value={item.active}
                  onValueChange={() => handleToggle(item)}
                  trackColor={{ true: '#7C3AED', false: '#D1D5DB' }}
                  thumbColor="#fff"
                />
              </View>

              {item.content && (
                <Text style={styles.itemContent} numberOfLines={3}>{item.content}</Text>
              )}

              <View style={styles.cardFooter}>
                <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.typeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.deleteText}>Xoá</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo thông báo</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Loại thông báo</Text>
            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeBtn, type === t.key && { backgroundColor: t.bg, borderColor: t.color }]}
                  onPress={() => setType(t.key)}
                >
                  <Ionicons name={t.icon} size={18} color={t.color} />
                  <Text style={[styles.typeBtnText, type === t.key && { color: t.color, fontWeight: 'bold' }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Tiêu đề</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Bảo trì hệ thống 22h hôm nay"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />

            <Text style={styles.label}>Nội dung</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Chi tiết thông báo..."
              value={content}
              onChangeText={setContent}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <TouchableOpacity
              style={[styles.submitBtn, saving && { opacity: 0.7 }]}
              onPress={handleCreate}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.submitText}>Đăng thông báo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  addBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardInactive: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  itemTitle: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  itemTime: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  itemContent: { fontSize: 13, color: '#4B5563', marginTop: 10, lineHeight: 19 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeText: { fontSize: 11, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  label: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 8, marginTop: 4 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', gap: 4,
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
  },
  typeBtnText: { fontSize: 10, color: '#6B7280', fontWeight: '500' },
  input: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14,
    fontSize: 14, color: '#111', borderWidth: 1, borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#7C3AED', paddingVertical: 16,
    borderRadius: 12, marginTop: 8,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
