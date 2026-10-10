import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_SESSION_KEY } from '../lib/auth/serverLogin';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { payTutorForSession } from '../lib/wallet';
import { createNotification } from '../lib/notif';
import { createDispute } from '../lib/disputes';
import { getMySlots } from '../lib/tutorSchedule';
import { listFreeSlots } from '../lib/booking/availability';
import {
  sameWeekdaySlots,
  slotKey,
  vnPartsFromIso,
  formatSlotPreview,
} from '../lib/booking/schedule';

const STATUS_CFG = {
  pending_payment: { label: 'Chờ thanh toán', color: '#F59E0B', bg: '#FFFBEB' },
  active: { label: 'Đang học', color: '#2563EB', bg: '#EFF6FF' },
  completed: { label: 'Hoàn thành', color: '#10B981', bg: '#F0FDF4' },
  cancelled: { label: 'Đã huỷ', color: '#EF4444', bg: '#FEF2F2' },
  disputed: { label: 'Khiếu nại', color: '#DC2626', bg: '#FEE2E2' },
};

// Quyền thao tác theo thời gian thực của buổi học
function getSessionTimeState(session) {
  const startRaw = session?.scheduled_start || session?.scheduled_at;
  const endRaw = session?.scheduled_end;

  if (!startRaw) {
    return {
      canDispute: false,
      canConfirm: false,
      reason: 'Buổi học chưa được xếp lịch',
    };
  }

  const start = new Date(startRaw);

  if (Number.isNaN(start.getTime())) {
    return {
      canDispute: false,
      canConfirm: false,
      reason: 'Thời gian buổi học không hợp lệ',
    };
  }

  // Tương thích session cũ: mặc định buổi học kéo dài 2 giờ
  const end = endRaw
    ? new Date(endRaw)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  if (Number.isNaN(end.getTime()) || end <= start) {
    return {
      canDispute: false,
      canConfirm: false,
      reason: 'Thời gian buổi học không hợp lệ',
    };
  }

  const now = new Date();

  return {
    canDispute: now >= start,
    canConfirm: now >= end,
    start,
    end,
  };
}

// Cửa sổ vào lớp: mở 15 phút trước giờ học, đóng 30 phút sau khi kết thúc.
function getJoinWindow(session) {
  const timeState = getSessionTimeState(session);
  if (!timeState.start) {
    return { open: false, hint: 'Buổi học chưa được xếp lịch' };
  }

  const start = timeState.start;
  const end = timeState.end;
  const now = Date.now();
  const opensAt = start.getTime() - 15 * 60 * 1000;
  const closesAt = end.getTime() + 30 * 60 * 1000;

  if (now < opensAt) {
    return {
      open: false,
      hint: `Mở vào lớp từ ${new Date(opensAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}`,
    };
  }
  if (now > closesAt) {
    return { open: false, hint: 'Buổi học đã kết thúc' };
  }
  return { open: true, hint: '' };
}

const SESSION_STATUS = {
  pending: { label: 'Chưa học', color: '#9CA3AF', bg: '#F3F4F6', icon: 'ellipse-outline' },
  confirmed: { label: 'Đã học', color: '#10B981', bg: '#F0FDF4', icon: 'checkmark-circle' },
  disputed: { label: 'Khiếu nại', color: '#DC2626', bg: '#FEE2E2', icon: 'alert-circle' },
  auto_passed: { label: 'Tự động duyệt', color: '#F59E0B', bg: '#FFFBEB', icon: 'time' },
  cancelled: { label: 'Đã huỷ', color: '#6B7280', bg: '#F3F4F6', icon: 'close-circle' },
};

export default function CourseDetailScreen({ courseId, onBack, onJoinClass }) {
  const [course, setCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // ===== DISPUTE / KHIẾU NẠI =====
  const [disputeModal, setDisputeModal] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  // ===== HUỶ BUỔI / ĐỔI GIỜ =====
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [reschedModal, setReschedModal] = useState(null);
  const [reschedSlots, setReschedSlots] = useState([]);
  const [reschedError, setReschedError] = useState('');
  const [reschedLoading, setReschedLoading] = useState(false);
  const [reschedSubmitting, setReschedSubmitting] = useState(false);

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
    const timeState = getSessionTimeState(session);

    if (!timeState.canConfirm) {
      return Alert.alert(
        'Chưa thể xác nhận',
        timeState.reason ||
          `Bạn chỉ có thể xác nhận sau khi buổi học kết thúc lúc ${timeState.end.toLocaleString('vi-VN')}.`
      );
    }

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
    // Đọc lại DB ngay trước khi xác nhận, không tin dữ liệu UI cũ
    const { data: freshSession, error: freshError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session.id)
      .maybeSingle();

    if (freshError || !freshSession) {
      return Alert.alert('Lỗi', freshError?.message || 'Không tìm thấy buổi học.');
    }

    if (freshSession.status !== 'pending') {
      await load();
      return Alert.alert('Không thể xác nhận', 'Trạng thái buổi học đã thay đổi.');
    }

    const timeState = getSessionTimeState(freshSession);

    if (!timeState.canConfirm) {
      return Alert.alert(
        'Chưa thể xác nhận',
        timeState.reason ||
          `Bạn chỉ có thể xác nhận sau khi buổi học kết thúc lúc ${timeState.end.toLocaleString('vi-VN')}.`
      );
    }

    const { data: updated, error } = await supabase
      .from('sessions')
      .update({
        status: 'confirmed',
        customer_confirmed_at: new Date().toISOString(),
      })
      .eq('id', freshSession.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (error) return Alert.alert('Lỗi', error.message);

    if (!updated) {
      await load();
      return Alert.alert(
        'Không thể xác nhận',
        'Buổi học vừa được thay đổi. Vui lòng thử lại.'
      );
    }

    const payRes = await payTutorForSession(session.id);
    if (payRes.error) console.error('Pay tutor error:', payRes.error);

    setReviewModal(session);
    setReviewRating(5);
    setReviewComment('');
    load();
  };

  const handleSubmitReview = async () => {
    if (!reviewModal) return;

    // Không cho đánh giá nếu khiếu nại của buổi học
    // đã bị Admin bác bỏ và buổi được auto-confirm.
    const { data: rejectedDispute, error: disputeCheckError } = await supabase
      .from('disputes')
      .select('id')
      .eq('session_id', reviewModal.id)
      .eq('status', 'rejected')
      .limit(1)
      .maybeSingle();

    if (disputeCheckError) {
      console.error(
        'Check rejected dispute before review:',
        disputeCheckError
      );

      return Alert.alert(
        'Lỗi',
        'Không thể kiểm tra trạng thái khiếu nại. Vui lòng thử lại.'
      );
    }

    if (rejectedDispute) {
      setReviewModal(null);

      return Alert.alert(
        'Không thể đánh giá',
        'Buổi học này được tự động xác nhận sau khi khiếu nại bị bác bỏ nên không thể đánh giá.'
      );
    }

    const { error } = await supabase
      .from('session_reviews')
      .insert({
        session_id: reviewModal.id,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });

    if (error) return Alert.alert('Lỗi', error.message);

    // ✅ THÔNG BÁO CHO GIA SƯ
    if (course?.tutor?.id) {
      const stars = '⭐'.repeat(reviewRating);
      await createNotification({
        userId: course.tutor.id,
        title: `${stars} Học sinh đã đánh giá buổi học`,
        body: `Buổi ${reviewModal.session_number} môn ${course.subject}: ${reviewRating}/5 sao${reviewComment.trim() ? ` - "${reviewComment.trim().substring(0, 60)}"` : ''}`,
        type: 'session',
        refId: reviewModal.id,
      });
    }

    setReviewModal(null);
    Alert.alert('Cảm ơn!', 'Đánh giá của bạn đã được ghi nhận.');
  };

  const handleDispute = async (session) => {
    const timeState = getSessionTimeState(session);

    if (!timeState.canDispute) {
      return Alert.alert(
        'Chưa thể khiếu nại',
        timeState.reason ||
          `Khiếu nại chỉ mở từ lúc buổi học bắt đầu: ${timeState.start.toLocaleString('vi-VN')}.`
      );
    }

    const { data: existing, error } = await supabase
      .from('disputes')
      .select('id, status')
      .eq('session_id', session.id)
      .eq('raised_by', course.student_id)
      .eq('status', 'open')
      .maybeSingle();

    if (error) {
      return Alert.alert('Lỗi', error.message);
    }

    if (existing) {
      return Alert.alert(
        'Đang chờ xử lý',
        'Buổi học này đã có khiếu nại đang chờ Admin xử lý.'
      );
    }

    setDisputeReason('');
    setDisputeModal(session);
  };

  const handleSubmitDispute = async () => {
    if (!disputeModal || disputeSubmitting) return;

    const reason = disputeReason.trim();

    if (reason.length < 10) {
      return Alert.alert(
        'Chưa đủ thông tin',
        'Vui lòng mô tả lý do khiếu nại ít nhất 10 ký tự.'
      );
    }

    setDisputeSubmitting(true);

    const res = await createDispute({
      sessionId: disputeModal.id,
      raisedBy: course.student_id,
      reason,
      sessionNumber: disputeModal.session_number,
      subject: course.subject,
    });

    setDisputeSubmitting(false);

    if (res.error) {
      return Alert.alert('Không thể gửi', res.error);
    }

    setDisputeModal(null);
    setDisputeReason('');

    await load();

    Alert.alert(
      'Đã gửi khiếu nại',
      'Khiếu nại của bạn đã được gửi đến Admin. Trạng thái xử lý sẽ được thông báo cho bạn.'
    );
  };

  // ===== HUỶ BUỔI TRƯỚC 24H =====
  const handleCancelSession = (session) => {
    const timeState = getSessionTimeState(session);

    if (!timeState.start) {
      return Alert.alert('Không thể huỷ', 'Buổi học chưa được xếp lịch.');
    }

    const hoursLeft = (timeState.start.getTime() - Date.now()) / 3600000;

    if (hoursLeft < 24) {
      return Alert.alert(
        'Quá hạn huỷ buổi',
        'Chỉ được huỷ buổi trước giờ học ít nhất 24 giờ. Cần hỗ trợ gấp, hãy liên hệ Admin.'
      );
    }

    Alert.alert(
      'Huỷ buổi học',
      `Buổi ${session.session_number} · ${timeState.start.toLocaleString('vi-VN')}\nSau khi huỷ, gia sư sẽ được thông báo và khung giờ được trả về lịch trống.`,
      [
        { text: 'Giữ buổi', style: 'cancel' },
        { text: 'Huỷ buổi', style: 'destructive', onPress: () => doCancelSession(session) },
      ]
    );
  };

  const doCancelSession = async (session) => {
    if (cancelSubmitting) return;
    setCancelSubmitting(true);

    const token = await AsyncStorage.getItem(AUTH_SESSION_KEY);
    const { data, error } = await supabase.rpc('eduteach_cancel_session', {
      p_session_id: session.id,
      p_user_id: course?.student_id,
    }, token ? { headers: { 'x-eduteach-session': token } } : {});

    setCancelSubmitting(false);

    if (error) {
      if (
        error.code === 'PGRST202' ||
        /Could not find the function/i.test(error.message || '')
      ) {
        return Alert.alert(
          'Cần cập nhật SQL',
          'Chức năng huỷ buổi cần chạy file supabase/sql/03_classroom_cancel_reschedule.sql trên Supabase SQL Editor.'
        );
      }
      return Alert.alert('Không thể huỷ buổi', error.message);
    }

    if (!data?.ok) {
      await load();
      return Alert.alert('Không thể huỷ buổi', data?.message || 'Buổi học vừa thay đổi trạng thái.');
    }

    if (course?.tutor?.id) {
      await createNotification({
        userId: course.tutor.id,
        title: 'Học sinh đã huỷ một buổi học',
        body: `Buổi ${session.session_number} môn ${course.subject} đã được huỷ trước 24 giờ. Khung giờ đã được trả về lịch trống.`,
        type: 'session',
        refId: session.id,
      });
    }

    Alert.alert('Đã huỷ buổi', 'Buổi học đã được huỷ và gia sư sẽ được thông báo.');
    await load();
  };

  // ===== ĐỔI GIỜ BUỔI (giữ nguyên các buổi khác) =====
  const handleResched = async (session) => {
    const timeState = getSessionTimeState(session);

    if (!timeState.start) {
      return Alert.alert('Không thể đổi giờ', 'Buổi học chưa được xếp lịch.');
    }

    if (timeState.start.getTime() - Date.now() < 24 * 3600000) {
      return Alert.alert(
        'Quá hạn đổi giờ',
        'Chỉ đổi giờ buổi trước giờ học ít nhất 24 giờ.'
      );
    }

    setReschedModal(session);
    setReschedSlots([]);
    setReschedError('');
    setReschedLoading(true);

    try {
      const tutorSlots = await getMySlots(course?.tutor_id);
      const hasHours = Object.values(tutorSlots || {}).some(
        hours => Array.isArray(hours) && hours.length > 0
      );

      if (!hasHours) {
        setReschedSlots([]);
        setReschedError('Gia sư chưa mở lịch rảnh nên không có khung giờ thay thế.');
        return;
      }

      const free = await listFreeSlots(course.tutor_id, tutorSlots, new Date());
      const current = {
        start_at: session.scheduled_start || session.scheduled_at,
        end_at: session.scheduled_end,
      };
      const parts = vnPartsFromIso(current.start_at);
      const others = sessions.filter(
        s => s.id !== session.id && s.status !== 'cancelled'
      );

      const options = sameWeekdaySlots(
        free,
        parts?.weekday ?? -1,
        [slotKey(current)],
        others
          .filter(s => s.scheduled_start)
          .map(s => ({ start_at: s.scheduled_start, end_at: s.scheduled_end }))
      );

      setReschedSlots(options);
    } catch (e) {
      setReschedSlots([]);
      setReschedError(e?.message || 'Không tải được danh sách khung giờ trống.');
    } finally {
      setReschedLoading(false);
    }
  };

  const applyResched = async (newSlot) => {
    if (!reschedModal || reschedSubmitting) return;
    setReschedSubmitting(true);

    const token = await AsyncStorage.getItem(AUTH_SESSION_KEY);
    const { data, error } = await supabase.rpc('eduteach_reschedule_session', {
      p_session_id: reschedModal.id,
      p_user_id: course?.student_id,
      p_new_start: newSlot.start_at,
      p_new_end: newSlot.end_at,
    }, token ? { headers: { 'x-eduteach-session': token } } : {});

    setReschedSubmitting(false);

    if (error) {
      if (
        error.code === 'PGRST202' ||
        /Could not find the function/i.test(error.message || '')
      ) {
        return Alert.alert(
          'Cần cập nhật SQL',
          'Chức năng đổi giờ cần chạy file supabase/sql/03_classroom_cancel_reschedule.sql trên Supabase SQL Editor.'
        );
      }
      return Alert.alert('Không thể đổi giờ', error.message);
    }

    if (!data?.ok) {
      setReschedModal(null);
      await load();
      return Alert.alert('Không thể đổi giờ', data?.message || 'Buổi học vừa thay đổi.');
    }

    if (course?.tutor?.id) {
      await createNotification({
        userId: course.tutor.id,
        title: 'Học sinh đổi giờ buổi học',
        body: `Buổi ${reschedModal.session_number} môn ${course.subject} chuyển sang ${formatSlotPreview(newSlot)}.`,
        type: 'session',
        refId: reschedModal.id,
      });
    }

    setReschedModal(null);
    Alert.alert('Đã đổi giờ', `Buổi học chuyển sang: ${formatSlotPreview(newSlot)}`);
    await load();
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
                    {s.scheduled_start && (
                      <Text style={styles.sessionTimeText}>
                        {new Date(s.scheduled_start).toLocaleString('vi-VN', {
                          weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </Text>
                    )}
                  </View>
                </View>

                {s.status === 'pending' && course.status === 'active' && (() => {
                  const timeState = getSessionTimeState(s);
                  const joinWin = getJoinWindow(s);

                  return (
                    <View style={styles.sessionActionCol}>
                      <View style={styles.sessionActions}>
                        <TouchableOpacity
                          style={[
                            styles.sessionBtn,
                            { backgroundColor: '#2563EB' },
                            !joinWin.open && { opacity: 0.4 },
                          ]}
                          disabled={!joinWin.open}
                          onPress={() => onJoinClass({ ...s, course })}
                        >
                          <Ionicons name="videocam" size={14} color="#fff" />
                          <Text style={styles.sessionBtnText}>
                            {joinWin.open ? 'Vào lớp' : 'Chưa mở'}
                          </Text>
                        </TouchableOpacity>

                        {!timeState.canDispute && (
                          <>
                            <TouchableOpacity
                              style={[styles.sessionBtn, { backgroundColor: '#FFFBEB' }]}
                              onPress={() => handleResched(s)}
                            >
                              <Ionicons name="swap-horizontal" size={14} color="#F59E0B" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.sessionBtn, { backgroundColor: '#FEF2F2' }]}
                              onPress={() => handleCancelSession(s)}
                              disabled={cancelSubmitting}
                            >
                              {cancelSubmitting ? (
                                <ActivityIndicator size="small" color="#EF4444" />
                              ) : (
                                <Ionicons name="trash-outline" size={14} color="#EF4444" />
                              )}
                            </TouchableOpacity>
                          </>
                        )}

                        <TouchableOpacity
                          style={[
                            styles.sessionBtn,
                            { backgroundColor: '#FEF2F2' },
                            !timeState.canDispute && { opacity: 0.4 },
                          ]}
                          onPress={() => handleDispute(s)}
                        >
                          <Ionicons
                            name={timeState.canDispute ? 'alert-circle-outline' : 'lock-closed-outline'}
                            size={14}
                            color="#EF4444"
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.sessionBtn,
                            { backgroundColor: '#10B981' },
                            !timeState.canConfirm && { opacity: 0.4 },
                          ]}
                          onPress={() => handleConfirmSession(s)}
                        >
                          <Ionicons
                            name={timeState.canConfirm ? 'checkmark' : 'lock-closed-outline'}
                            size={14}
                            color="#fff"
                          />
                          <Text style={styles.sessionBtnText}>Xác nhận</Text>
                        </TouchableOpacity>
                      </View>

                      {!joinWin.open && !!joinWin.hint && (
                        <Text style={styles.joinHint}>{joinWin.hint}</Text>
                      )}
                    </View>
                  );
                })()}
              </View>
            );
          })
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal
        visible={!!disputeModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!disputeSubmitting) {
            setDisputeModal(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  Khiếu nại buổi học
                </Text>

                <Text style={styles.modalSub}>
                  Buổi {disputeModal?.session_number} · {course.subject}
                </Text>
              </View>

              <TouchableOpacity
                disabled={disputeSubmitting}
                onPress={() => setDisputeModal(null)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.disputeWarning}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#DC2626"
              />

              <Text style={styles.disputeWarningText}>
                Buổi học sẽ tạm dừng xác nhận trong thời gian Admin xử lý.
              </Text>
            </View>

            <Text style={styles.disputeLabel}>
              Lý do khiếu nại
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                { minHeight: 120 }
              ]}
              placeholder="Ví dụ: Gia sư không tham gia buổi học theo lịch đã hẹn..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={1000}
              value={disputeReason}
              onChangeText={setDisputeReason}
              editable={!disputeSubmitting}
            />

            <Text style={styles.disputeCounter}>
              {disputeReason.trim().length}/1000
            </Text>

            <TouchableOpacity
              style={[
                styles.disputeSubmit,
                (
                  disputeReason.trim().length < 10 ||
                  disputeSubmitting
                ) && styles.disputeSubmitDisabled
              ]}
              onPress={handleSubmitDispute}
              disabled={
                disputeReason.trim().length < 10 ||
                disputeSubmitting
              }
            >
              {disputeSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="paper-plane-outline"
                    size={18}
                    color="#fff"
                  />

                  <Text style={styles.modalSubmitText}>
                    Gửi khiếu nại
                  </Text>
                </>
              )}
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

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

      <Modal
        visible={!!reschedModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!reschedSubmitting) setReschedModal(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reschedBox}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  Đổi giờ buổi {reschedModal?.session_number}
                </Text>
                <Text style={styles.modalSub}>
                  Buổi hiện tại: {reschedModal?.scheduled_start
                    ? formatSlotPreview({ start_at: reschedModal.scheduled_start })
                    : ''}
                </Text>
              </View>
              <TouchableOpacity
                disabled={reschedSubmitting}
                onPress={() => setReschedModal(null)}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.reschedHint}>
              Chọn khung giờ trống khác cùng thứ với buổi đang đổi (theo lịch rảnh của gia sư). Các buổi còn lại được giữ nguyên.
            </Text>

            {reschedLoading ? (
              <View style={styles.reschedLoading}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.reschedLoadingText}>Đang tải khung giờ trống...</Text>
              </View>
            ) : reschedSlots.length === 0 ? (
              <View style={styles.reschedEmpty}>
                <Ionicons name="calendar-outline" size={36} color="#D1D5DB" />
                <Text style={styles.reschedEmptyText}>
                  {reschedError || 'Không còn khung giờ trống nào cùng thứ này trong 90 ngày tới.'}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.reschedList}
                showsVerticalScrollIndicator={false}
              >
                {reschedSlots.slice(0, 40).map(slot => (
                  <TouchableOpacity
                    key={slotKey(slot)}
                    style={styles.reschedOption}
                    disabled={reschedSubmitting}
                    onPress={() => applyResched(slot)}
                  >
                    <Ionicons name="time-outline" size={16} color="#2563EB" />
                    <Text style={styles.reschedOptionText}>
                      {formatSlotPreview(slot)}
                    </Text>
                    {reschedSubmitting && (
                      <ActivityIndicator size="small" color="#2563EB" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
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
  sessionTimeText: { fontSize: 11, color: '#6B7280', marginTop: 3 },
  sessionActionCol: { alignItems: 'flex-end', gap: 4 },
  sessionActions: {
    flexDirection: 'row', gap: 6, flexWrap: 'wrap',
    justifyContent: 'flex-end', maxWidth: 210,
  },
  sessionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  sessionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  joinHint: { fontSize: 11, color: '#F59E0B', textAlign: 'right', maxWidth: 210 },
  reschedBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 32, maxHeight: '75%',
  },
  reschedHint: {
    fontSize: 13, color: '#475569', lineHeight: 19,
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12,
    marginTop: 10, marginBottom: 6,
  },
  reschedLoading: { alignItems: 'center', paddingVertical: 32 },
  reschedLoadingText: { fontSize: 13, color: '#6B7280', marginTop: 10 },
  reschedEmpty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16 },
  reschedEmptyText: {
    fontSize: 13, color: '#9CA3AF', textAlign: 'center',
    marginTop: 10, lineHeight: 19,
  },
  reschedList: { flexGrow: 0, marginTop: 4 },
  reschedOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  reschedOptionText: { fontSize: 14, color: '#111827', fontWeight: '500', flex: 1 },
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
  modalSubmitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  disputeWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },

  disputeWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 19,
  },

  disputeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },

  disputeCounter: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: -10,
    marginBottom: 14,
  },

  disputeSubmit: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  disputeSubmitDisabled: {
    opacity: 0.45,
  },
});
