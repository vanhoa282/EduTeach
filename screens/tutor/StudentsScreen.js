import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getOrCreateConversation } from '../../lib/chat';

export default function StudentsScreen({ user, onOpenChat }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    if (!user?.id) return;

    // Lấy danh sách HS đã đăng ký khóa học với gia sư này
    const { data, error } = await supabase
      .from('courses')
      .select(`
        id, subject, total_sessions, status,
        student:users!courses_student_id_fkey (id, full_name, phone, avatar_url)
      `)
      .eq('tutor_id', user.id)
      .in('status', ['active', 'completed']);

    if (error) {
      console.error('load students error:', error);
      setLoading(false);
      return;
    }

    // Group theo student — 1 HS có thể học nhiều môn
    const map = {};
    (data || []).forEach(c => {
      const s = c.student;
      if (!s) return;
      if (!map[s.id]) {
        map[s.id] = {
          id: s.id,
          name: s.full_name || 'Học sinh',
          phone: s.phone,
          avatar: s.avatar_url || `https://i.pravatar.cc/150?u=${s.id}`,
          subjects: [],
          sessionsLeft: 0,
          courseIds: [],
        };
      }
      map[s.id].subjects.push(c.subject);
      map[s.id].sessionsLeft += c.total_sessions || 0;
      map[s.id].courseIds.push(c.id);
    });

    const studentList = Object.values(map);

    // Đếm unread per student
    const withUnread = await Promise.all(studentList.map(async (s) => {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('tutor_id', user.id)
        .eq('student_id', s.id)
        .maybeSingle();

      if (!conv) return { ...s, unread: 0, conversationId: null };

      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .is('read_at', null)
        .neq('sender_id', user.id);

      return { ...s, unread: count || 0, conversationId: conv.id };
    }));

    setStudents(withUnread);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleChat = async (student) => {
    if (!user?.id) return;

    // Nếu đã có conversation → mở luôn
    if (student.conversationId) {
      const { data: conv } = await supabase
        .from('conversations')
        .select(`
          *,
          student:users!conversations_student_id_fkey (id, full_name, phone),
          tutor:users!conversations_tutor_id_fkey (id, full_name, phone)
        `)
        .eq('id', student.conversationId)
        .maybeSingle();
      if (conv && onOpenChat) onOpenChat(conv);
      return;
    }

    // Chưa có → tạo mới
    const res = await getOrCreateConversation(student.id, user.id);
    if (res.conversation && onOpenChat) {
      const { data: conv } = await supabase
        .from('conversations')
        .select(`
          *,
          student:users!conversations_student_id_fkey (id, full_name, phone),
          tutor:users!conversations_tutor_id_fkey (id, full_name, phone)
        `)
        .eq('id', res.conversation.id)
        .maybeSingle();
      if (conv) onOpenChat(conv);
    }
  };

  const filtered = students.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q) ||
      s.subjects.some(sub => sub.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Học sinh của tôi</Text>
        <Text style={styles.subtitle}>{students.length} học sinh đang theo học</Text>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm học sinh..."
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

        {filtered.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>
              {students.length === 0 ? 'Chưa có học sinh' : 'Không tìm thấy'}
            </Text>
            <Text style={styles.emptyDesc}>
              {students.length === 0
                ? 'Khi HS đăng ký khóa học, họ sẽ xuất hiện ở đây'
                : 'Thử tìm với từ khoá khác'}
            </Text>
          </View>
        )}

        {filtered.map(s => (
          <View key={s.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Image source={{ uri: s.avatar }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.name}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="call-outline" size={12} color="#9CA3AF" />
                  <Text style={styles.metaText}>{s.phone}</Text>
                </View>
                <View style={styles.subjectsRow}>
                  {s.subjects.slice(0, 2).map((sub, i) => (
                    <View key={i} style={styles.subjectTag}>
                      <Text style={styles.subjectTagText}>{sub}</Text>
                    </View>
                  ))}
                  {s.subjects.length > 2 && (
                    <Text style={styles.moreText}>+{s.subjects.length - 2}</Text>
                  )}
                </View>
              </View>
              <View style={styles.sessionsBox}>
                <Text style={styles.sessionsNum}>{s.sessionsLeft}</Text>
                <Text style={styles.sessionsLabel}>buổi</Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => handleChat(s)}
                activeOpacity={0.7}
              >
                <View>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#2563EB" />
                  {s.unread > 0 && (
                    <View style={styles.chatBadge}>
                      <Text style={styles.chatBadgeText}>
                        {s.unread > 9 ? '9+' : s.unread}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.chatBtnText}>
                  {s.unread > 0 ? `${s.unread} tin mới` : 'Nhắn tin'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.detailBtn} activeOpacity={0.7}>
                <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
                <Text style={styles.detailBtnText}>Chi tiết</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 20 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E5E7EB' },
  name: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText: { fontSize: 12, color: '#9CA3AF' },
  subjectsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  subjectTag: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
  },
  subjectTagText: { fontSize: 11, color: '#2563EB', fontWeight: '600' },
  moreText: { fontSize: 11, color: '#9CA3AF', alignSelf: 'center' },
  sessionsBox: { alignItems: 'flex-end' },
  sessionsNum: { fontSize: 20, fontWeight: 'bold', color: '#2563EB' },
  sessionsLabel: { fontSize: 11, color: '#9CA3AF' },
  actionsRow: {
    flexDirection: 'row', gap: 8, marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  chatBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#EFF6FF', paddingVertical: 10, borderRadius: 10,
  },
  chatBtnText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  chatBadge: {
    position: 'absolute', top: -6, right: -10,
    backgroundColor: '#EF4444', minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#EFF6FF',
  },
  chatBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  detailBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#F3F4F6', paddingVertical: 10, borderRadius: 10,
  },
  detailBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
});
