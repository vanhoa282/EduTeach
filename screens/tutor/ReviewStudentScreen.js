import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getTutorSessionsForStudent, submitStudentReview, getSessionReviewByRole } from '../../lib/reviews';

export default function ReviewStudentScreen({ user, student, onBack }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewedSessions, setReviewedSessions] = useState({});

  const load = async () => {
    const list = await getTutorSessionsForStudent(user.id, student.id);
    setSessions(list);

    // Check session nào đã đánh giá
    const reviewed = {};
    for (const s of list) {
      const r = await getSessionReviewByRole(s.id, 'tutor');
      if (r) reviewed[s.id] = r;
    }
    setReviewedSessions(reviewed);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!selectedSession) return Alert.alert('Lỗi', 'Chọn buổi học để đánh giá');
    setSubmitting(true);
    const res = await submitStudentReview({
      sessionId: selectedSession.id,
      reviewerId: user.id,
      rating,
      comment,
    });
    setSubmitting(false);
    if (res.error) return Alert.alert('Lỗi', res.error);

    Alert.alert('Cảm ơn!', 'Đánh giá của bạn đã được ghi nhận.');
    setSelectedSession(null);
    setRating(5);
    setComment('');
    load();
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

  const availableSessions = sessions.filter(s => !reviewedSessions[s.id]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Đánh giá học sinh</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Student card */}
        <View style={styles.studentCard}>
          <Image source={{ uri: student.avatar }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.studentPhone}>{student.phone}</Text>
          </View>
        </View>

        {availableSessions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Đã đánh giá hết</Text>
            <Text style={styles.emptyDesc}>
              {sessions.length === 0
                ? 'Chưa có buổi học nào để đánh giá'
                : 'Bạn đã đánh giá tất cả buổi học'}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Chọn buổi học để đánh giá</Text>

            {availableSessions.map(s => {
              const dt = s.scheduled_at ? new Date(s.scheduled_at) : null;
              const dateStr = dt
                ? dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '---';
              const selected = selectedSession?.id === s.id;

              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.sessionCard, selected && styles.sessionCardActive]}
                  onPress={() => setSelectedSession(s)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.sessionNum, selected && { backgroundColor: '#8B5CF6' }]}>
                    <Text style={[styles.sessionNumText, selected && { color: '#fff' }]}>
                      {s.session_number}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionSubject}>{s.course?.subject || 'Buổi học'}</Text>
                    <Text style={styles.sessionDate}>{dateStr}</Text>
                  </View>
                  {selected && (
                    <Ionicons name="checkmark-circle" size={24} color="#8B5CF6" />
                  )}
                </TouchableOpacity>
              );
            })}

            {selectedSession && (
              <>
                <Text style={styles.sectionTitle}>Đánh giá</Text>

                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity key={n} onPress={() => setRating(n)}>
                      <Ionicons
                        name={n <= rating ? 'star' : 'star-outline'}
                        size={40}
                        color="#F59E0B"
                        style={{ marginHorizontal: 4 }}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.ratingLabel}>
                  {rating === 5 ? 'Học sinh rất tốt' :
                   rating === 4 ? 'Học sinh tốt' :
                   rating === 3 ? 'Bình thường' :
                   rating === 2 ? 'Cần cải thiện' : 'Không hợp tác'}
                </Text>

                <TextInput
                  style={styles.textarea}
                  placeholder="Nhận xét về học sinh (tuỳ chọn)..."
                  placeholderTextColor="#9CA3AF"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={3}
                  maxLength={300}
                />
                <Text style={styles.charCount}>{comment.length}/300</Text>
              </>
            )}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {selectedSession && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitText}>Gửi đánh giá</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  studentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E5E7EB' },
  studentName: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  studentPhone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#111', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#111', marginBottom: 12, marginTop: 8 },
  sessionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 2, borderColor: '#E5E7EB',
  },
  sessionCardActive: { borderColor: '#8B5CF6', backgroundColor: '#F5F3FF' },
  sessionNum: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  sessionNumText: { fontSize: 18, fontWeight: 'bold', color: '#6B7280' },
  sessionSubject: { fontSize: 14, fontWeight: '600', color: '#111' },
  sessionDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  starsRow: {
    flexDirection: 'row', justifyContent: 'center', marginBottom: 12, marginTop: 8,
  },
  ratingLabel: {
    fontSize: 14, fontWeight: '600', color: '#F59E0B',
    textAlign: 'center', marginBottom: 20,
  },
  textarea: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    fontSize: 14, color: '#111', minHeight: 80, textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#8B5CF6', paddingVertical: 16, borderRadius: 12,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
