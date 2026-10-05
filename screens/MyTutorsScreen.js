import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getMyTutors } from '../lib/myTutors';
import { getOrCreateConversation } from '../lib/chat';
import { supabase } from '../lib/supabase';

export default function MyTutorsScreen({ user, onBack, onOpenChat, onSelectTutor }) {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    const data = await getMyTutors(user.id);
    setTutors(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleChat = async (tutor) => {
    if (tutor.conversationId) {
      const { data: conv } = await supabase
        .from('conversations')
        .select(`
          *,
          student:users!conversations_student_id_fkey (id, full_name, phone),
          tutor:users!conversations_tutor_id_fkey (id, full_name, phone)
        `)
        .eq('id', tutor.conversationId)
        .maybeSingle();
      if (conv && onOpenChat) onOpenChat(conv);
      return;
    }

    const res = await getOrCreateConversation(user.id, tutor.id);
    if (res.conversation) {
      const { data: conv } = await supabase
        .from('conversations')
        .select(`
          *,
          student:users!conversations_student_id_fkey (id, full_name, phone),
          tutor:users!conversations_tutor_id_fkey (id, full_name, phone)
        `)
        .eq('id', res.conversation.id)
        .maybeSingle();
      if (conv && onOpenChat) onOpenChat(conv);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#111" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Gia sư của tôi</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#2563EB" />
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
        <Text style={styles.topBarTitle}>Gia sư của tôi</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Danh sách gia sư</Text>
        <Text style={styles.subtitle}>
          {tutors.length} gia sư bạn đang hoặc đã từng học
        </Text>

        {tutors.length === 0 && (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="people-outline" size={48} color="#2563EB" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có gia sư nào</Text>
            <Text style={styles.emptyDesc}>
              Đăng ký khóa học đầu tiên để kết nối với gia sư
            </Text>
          </View>
        )}

        {tutors.map(t => (
          <View key={t.id} style={styles.card}>
            <TouchableOpacity
              style={styles.cardTop}
              onPress={() => onSelectTutor && onSelectTutor(t)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: t.avatar }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{t.name}</Text>
                <View style={styles.subjectsRow}>
                  {t.subjects.slice(0, 2).map((sub, i) => (
                    <View key={i} style={styles.subjectTag}>
                      <Text style={styles.subjectTagText}>{sub}</Text>
                    </View>
                  ))}
                  {t.subjects.length > 2 && (
                    <Text style={styles.moreText}>+{t.subjects.length - 2}</Text>
                  )}
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="book-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.statText}>
                      {t.doneCount}/{t.totalSessions} buổi
                    </Text>
                  </View>
                  <View style={styles.statDot} />
                  <View style={styles.statItem}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.statText}>
                      {(t.price / 1000).toFixed(0)}k/buổi
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => handleChat(t)}
                activeOpacity={0.7}
              >
                <View>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#2563EB" />
                  {t.unread > 0 && (
                    <View style={styles.chatBadge}>
                      <Text style={styles.chatBadgeText}>
                        {t.unread > 9 ? '9+' : t.unread}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.chatBtnText}>
                  {t.unread > 0 ? `${t.unread} tin mới` : 'Nhắn tin'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => onSelectTutor && onSelectTutor(t)}
                activeOpacity={0.7}
              >
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
  title: { fontSize: 22, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 20 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIconBox: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  emptyDesc: {
    fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 30,
    lineHeight: 19,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E5E7EB' },
  name: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  subjectsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  subjectTag: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
  },
  subjectTagText: { fontSize: 11, color: '#2563EB', fontWeight: '600' },
  moreText: { fontSize: 11, color: '#9CA3AF', alignSelf: 'center' },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: '#6B7280' },
  statDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#D1D5DB' },
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
