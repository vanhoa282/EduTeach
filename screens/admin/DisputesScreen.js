import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { adminGetDisputes, adminResolveDispute } from '../../lib/adminSettings';

const STATUS_CFG = {
  open: { label: 'Chờ xử lý', color: '#F59E0B', bg: '#FFFBEB' },
  resolved: { label: 'Đã chấp nhận', color: '#10B981', bg: '#F0FDF4' },
  rejected: { label: 'Bác bỏ', color: '#EF4444', bg: '#FEF2F2' },
};

const FILTERS = [
  { key: 'open', label: 'Chờ xử lý' },
  { key: 'resolved', label: 'Đã chấp nhận' },
  { key: 'rejected', label: 'Bác bỏ' },
  { key: 'all', label: 'Tất cả' },
];

export default function DisputesScreen({ onBack }) {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('open');
  const [resolveModal, setResolveModal] = useState(null);
  const [resolveAction, setResolveAction] = useState('resolved');
  const [resolveNote, setResolveNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const res = await adminGetDisputes();
    if (res.disputes) setDisputes(res.disputes);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleOpenResolve = (d, action) => {
    setResolveModal(d);
    setResolveAction(action);
    setResolveNote('');
  };

  const handleSubmitResolve = async () => {
    if (!resolveModal) return;
    setSubmitting(true);
    const res = await adminResolveDispute(resolveModal.id, resolveNote, resolveAction);
    setSubmitting(false);
    if (res.error) return Alert.alert('Lỗi', res.error);
    setResolveModal(null);
    Alert.alert('Đã xử lý', 'Khiếu nại đã được cập nhật.');
    load();
  };

  const filtered = disputes.filter(d => filter === 'all' ? true : d.status === filter);
  const openCount = disputes.filter(d => d.status === 'open').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#DC2626" />
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
        <Text style={styles.topBarTitle}>Khiếu nại</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.topBarInner}>
        <TouchableOpacity onPress={onBack} style={styles.backBtnInner}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitleInner}>Khiếu nại</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Khiếu nại</Text>
        <Text style={styles.subtitle}>
          {openCount > 0 ? `${openCount} chờ xử lý · ` : ''}{disputes.length} tổng
        </Text>

        <View style={styles.topBarInner}>
        <TouchableOpacity onPress={onBack} style={styles.backBtnInner}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitleInner}>Khiếu nại</Text>
        <View style={{ width: 40 }} />
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

        {filtered.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>
              {filter === 'open' ? 'Không có khiếu nại chờ' : 'Không có khiếu nại'}
            </Text>
          </View>
        )}

        {filtered.map(d => {
          const cfg = STATUS_CFG[d.status] || STATUS_CFG.open;
          const session = d.session;
          const course = session?.course;
          const student = course?.student;
          const tutor = course?.tutor;
          const isOpen = d.status === 'open';

          return (
            <View key={d.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <Ionicons name="alert-circle" size={22} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    Buổi {session?.session_number || '?'} · {course?.subject || 'Khóa học'}
                  </Text>
                  <Text style={styles.cardTime}>
                    {new Date(d.created_at).toLocaleString('vi-VN')}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={14} color="#9CA3AF" />
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: '600' }}>HS:</Text> {student?.full_name || '---'} · {student?.phone || ''}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="briefcase-outline" size={14} color="#9CA3AF" />
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: '600' }}>GS:</Text> {tutor?.full_name || '---'} · {tutor?.phone || ''}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="chatbubble-outline" size={14} color="#9CA3AF" />
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: '600' }}>Lý do:</Text> {d.reason || 'Không rõ'}
                </Text>
              </View>

              {d.resolution_note ? (
                <View style={styles.resolveNote}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.resolveNoteText}>Admin: {d.resolution_note}</Text>
                </View>
              ) : null}

              {isOpen && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.btn, styles.rejectBtn]}
                    onPress={() => handleOpenResolve(d, 'rejected')}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                    <Text style={[styles.btnText, { color: '#EF4444' }]}>Bác bỏ</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.approveBtn]}
                    onPress={() => handleOpenResolve(d, 'resolved')}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                    <Text style={[styles.btnText, { color: '#fff' }]}>Chấp nhận</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal
        visible={!!resolveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setResolveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {resolveAction === 'resolved' ? 'Chấp nhận khiếu nại' : 'Bác bỏ khiếu nại'}
              </Text>
              <TouchableOpacity onPress={() => setResolveModal(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Buổi {resolveModal?.session?.session_number} · {resolveModal?.session?.course?.subject}
            </Text>

            <Text style={styles.modalLabel}>Ghi chú xử lý</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={resolveAction === 'resolved'
                ? 'VD: Đã hoàn tiền 50% cho HS'
                : 'VD: Bằng chứng không đủ'}
              value={resolveNote}
              onChangeText={setResolveNote}
              multiline
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity
              style={[
                styles.modalSubmit,
                resolveAction === 'rejected' && { backgroundColor: '#EF4444' },
                submitting && { opacity: 0.7 },
              ]}
              onPress={handleSubmitResolve}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitText}>
                  {resolveAction === 'resolved' ? 'Xác nhận chấp nhận' : 'Xác nhận bác bỏ'}
                </Text>
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
  title: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 16 },
  filterRow: { gap: 8, paddingBottom: 16 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  filterChipText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginTop: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#111' },
  cardTime: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  infoText: { flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 19 },
  resolveNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, marginTop: 8,
  },
  resolveNoteText: { flex: 1, fontSize: 12, color: '#065F46', lineHeight: 18 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 10,
  },
  rejectBtn: { backgroundColor: '#FEF2F2' },
  approveBtn: { backgroundColor: '#10B981' },
  btnText: { fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  modalSub: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  modalLabel: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 8 },
  modalInput: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14,
    fontSize: 14, color: '#111', minHeight: 80, textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16,
  },
  modalSubmit: {
    paddingVertical: 16, borderRadius: 12,
    backgroundColor: '#10B981', alignItems: 'center',
  },
  modalSubmitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
