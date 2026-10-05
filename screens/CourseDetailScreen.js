import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { payTutorForSession } from '../lib/wallet';

const STATUS_CFG = {
  pending_payment: { label: 'Chờ thanh toán', color: '#F59E0B', bg: '#FFFBEB' },
  active: { label: 'Đang học', color: '#2563EB', bg: '#EFF6FF' },
  completed: { label: 'Hoàn thành', color: '#10B981', bg: '#F0FDF4' },
  cancelled: { label: 'Đã huỷ', color: '#EF4444', bg: '#FEF2F2' },
  disputed: { label: 'Khiếu nại', color: '#DC2626', bg: '#FEE2E2' },
};

const SESSION_STATUS = {
  pending: { label: 'Chưa học', color: '#9CA3AF', bg: '#F3F4F6', icon: 'ellipse-outline' },
  confirmed: { label: 'Đã học', color: '#10B981', bg: '#F0FDF4', icon: 'checkmark-circle' },
  disputed: { label: 'Khiếu nại', color: '#DC2626', bg: '#FEE2E2', icon: 'alert-circle' },
  auto_passed: { label: 'Tự động duyệt', color: '#F59E0B', bg: '#FFFBEB', icon: 'time' },
  cancelled: { label: 'Đã huỷ', color: '#6B7280', bg: '#F3F4F6', icon: 'close-circle' },
};

export default function CourseDetailScreen({ courseId, onBack }) {
  const [course, setCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const load = async () => {
    const { data: c, error: cErr } = await supabase
      .from('courses')
      .select(`*, tutor:users!courses_tutor_id_fkey (id, full_name, phone)`)
      .eq('id', courseId)
      .maybeSingle();

    if (cErr) console.error('load course error:', cErr);
    setCourse(c);

    const { data: s, error: sErr } = await supabase
      .from('sessions')
      .select('*')
      .eq('course_id', courseId)
      .order('session_number', { ascending: true });

    if (sErr) console.error('load sessions error:', sErr);
    setSessions(s || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [courseId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleConfirmSession = (session) => {
    Alert.alert(
      'Xác nhận buổi học',
      `Buổi ${session.session_number}: Bạn xác nhận đã học với gia sư?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Xác nhận', onPress: () => doConfirm(session) },
      ]
    );
  };

  const doConfirm = async (session) => {
    const { error } = await supabase
      .from('sessions')
      .update({
        status: 'confirmed',
        customer_confirmed_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (error) return Alert.alert('Lỗi', error.message);

    const payRes = await payTutorForSession(session.id);
    if (payRes.error) console.error('Pay tutor error:', payRes.error);

    setReviewModal(session);
    setReviewRating(5);
    setReviewComment('');
    load();
  };

  const handleSubmitReview = async () => {
    if (!reviewModal) return;

    const { error } = await supabase
      .from('session_reviews')
      .insert({
        session_id: reviewModal.id,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });

    if (error) return Alert.alert('Lỗi', error.message);

    setReviewModal(null);
    Alert.alert('Cảm ơn!', 'Đánh giá của bạn đã được ghi nhận.');
  };

  const handleDispute = (session) => {
    Alert.alert(
      'Khiếu nại buổi học',
      `Buổi ${session.session_number}: Bạn muốn khiếu nại?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Khiếu nại',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('sessions')
              .update({ status: 'disputed' })
              .eq('id', session.id);
            if (error) return Alert.alert('Lỗi', error.message);
            Alert.alert('Đã gửi', 'Admin sẽ liên hệ bạn trong 24h.');
            load();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#111" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Chi tiết khóa học</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#9CA3AF' }}>Không tìm thấy khóa học</Text>
        </View>
      </SafeAreaView>
    );
  }

  const cfg = STATUS_CFG[course.status] || STATUS_CFG.pending_payment;
  const confirmed = sessions.filter(s => s.status === 'confirmed').length;
  const progress = course.total_sessions > 0 ? (confirmed / course.total_sessions) * 100 : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Chi tiết khóa học</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.tutorCard}>
          <View style={styles.tutorAvatar}>
            <Ionicons name="person" size={26} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tutorName} numberOfLines={1}>
              {course.tutor?.full_name || 'Gia sư'}
            </Text>
            <Text style={styles.tutorSubject} numberOfLines={1}>{course.subject}</Text>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg, marginTop: 6, alignSelf: 'flex-start' }]}>
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="book-outline" size={16} color="#9CA3AF" />
              <Text style={styles.infoLabel}>{course.total_sessions} buổi</Text>
            </View>
          </View>
          {course.schedule && (
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                <Text style={styles.infoLabel}>{course.schedule}</Text>
              </View>
            </View>
          )}
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Học phí</Text>
            <Text style={styles.infoValue}>{course.total_price.toLocaleString('vi-VN')}đ</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Đã thanh toán</Text>
            <Text style={[styles.infoValue, { color: '#10B981' }]}>
              {course.paid_amount.toLocaleString('vi-VN')}đ
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Còn lại</Text>
            <Text style={[styles.infoValue, { color: '#F59E0B' }]}>
              {(course.total_price - course.paid_amount).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Tiến độ</Text>
            <Text style={styles.progressValue}>{confirmed}/{course.total_sessions} buổi</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Danh sách buổi học</Text>

        {sessions.length === 0 ? (
          <View style={styles.emptySessions}>
            <Ionicons name="calendar-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptySessionsTitle}>Chưa có buổi học nào</Text>
            <Text style={styles.emptySessionsDesc}>
              {course.status === 'pending_payment'
                ? 'Vui lòng chờ admin xác nhận thanh toán'
                : 'Admin sẽ tạo buổi học sau khi xác nhận'}
            </Text>
          </View>
        ) : (
          sessions.map(s => {
            const scfg = SESSION_STATUS[s.status] || SESSION_STATUS.pending;
            return (
              <View key={s.id} style={styles.sessionCard}>
                <View style={styles.sessionLeft}>
                  <View style={[styles.sessionNumber, { backgroundColor: scfg.bg }]}>
                    <Text style={[styles.sessionNumberText, { color: scfg.color }]}>
                      {s.session_number}
                    </Text>
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>Buổi {s.session_number}</Text>
                    <View style={styles.sessionMeta}>
                      <Ionicons name={scfg.icon} size={12} color={scfg.color} />
                      <Text style={[styles.sessionMetaText, { color: scfg.color }]}>
                        {scfg.label}
                      </Text>
                    </View>
                  </View>
                </View>

                {s.status === 'pending' && course.status === 'active' && (
                  <View style={styles.sessionActions}>
                    <TouchableOpacity
                      style={[styles.sessionBtn, { backgroundColor: '#FEF2F2' }]}
                      onPress={() => handleDispute(s)}
                    >
                      <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sessionBtn, { backgroundColor: '#10B981' }]}
                      onPress={() => handleConfirmSession(s)}
                    >
                      <Ionicons name="checkmark" size={14} color="#fff" />
                      <Text style={styles.sessionBtnText}>Xác nhận</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal
        visible={!!reviewModal}
        animationType="slide"
        transparent
        onRequestClose={() => setReviewModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đánh giá gia sư</Text>
              <TouchableOpacity onPress={() => setReviewModal(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Buổi {reviewModal?.session_number} · {course.tutor?.full_name}
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setReviewRating(n)}>
                  <Ionicons
                    name={n <= reviewRating ? 'star' : 'star-outline'}
                    size={36}
                    color="#F59E0B"
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalRatingText}>
              {reviewRating === 5 ? 'Tuyệt vời!' :
               reviewRating === 4 ? 'Rất tốt' :
               reviewRating === 3 ? 'Bình thường' :
               reviewRating === 2 ? 'Cần cải thiện' : 'Không hài lòng'}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Nhận xét của bạn (tuỳ chọn)..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={reviewComment}
              onChangeText={setReviewComment}
            />

            <TouchableOpacity style={styles.modalSubmit} onPress={handleSubmitReview}>
              <Text style={styles.modalSubmitText}>Gửi đánh giá</Text>
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
  tutorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  tutorAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  tutorName: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  tutorSubject: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
  },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoLabel: { fontSize: 13, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111' },
  infoDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  progressCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  progressTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  progressValue: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  progressBar: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 4 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#111', marginBottom: 12 },
  emptySessions: {
    alignItems: 'center', backgroundColor: '#fff', borderRadius: 16,
    paddingVertical: 40, paddingHorizontal: 20,
  },
  emptySessionsTitle: { fontSize: 15, fontWeight: 'bold', color: '#111', marginTop: 12 },
  emptySessionsDesc: {
    fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 6, lineHeight: 19,
  },
  sessionCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  sessionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  sessionNumber: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  sessionNumberText: { fontSize: 16, fontWeight: 'bold' },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  sessionMetaText: { fontSize: 12, fontWeight: '500' },
  sessionActions: { flexDirection: 'row', gap: 6 },
  sessionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  sessionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  modalSub: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
  modalRatingText: {
    fontSize: 14, fontWeight: '600', color: '#F59E0B',
    textAlign: 'center', marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14,
    fontSize: 14, color: '#111', minHeight: 80, textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16,
  },
  modalSubmit: {
    backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center',
  },
  modalSubmitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
