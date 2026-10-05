import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getMyConversations } from '../../lib/chat';

const COLORS = ['#3B82F6', '#8B5CF6', '#EF4444', '#06B6D4', '#10B981', '#F59E0B', '#EC4899'];

export default function ChatListScreen({ user, onOpenChat }) {
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    const data = await getMyConversations(user.id);
    setConvs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
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

  const totalUnread = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Tin nhắn</Text>
        <Text style={styles.subtitle}>
          {convs.length} cuộc trò chuyện
          {totalUnread > 0 && <Text style={{ color: '#EF4444', fontWeight: 'bold' }}> · {totalUnread} chưa đọc</Text>}
        </Text>

        {convs.length === 0 && (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="chatbubbles-outline" size={48} color="#2563EB" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có tin nhắn</Text>
            <Text style={styles.emptyDesc}>
              Bắt đầu trò chuyện với gia sư bằng cách bấm "Nhắn tin" trong trang chi tiết
            </Text>
          </View>
        )}

        {convs.map((c, idx) => {
          const isMe = c.student_id === user.id;
          const other = isMe ? c.tutor : c.student;
          const lastAt = c.last_message_at ? new Date(c.last_message_at) : null;
          const now = new Date();
          const isToday = lastAt && lastAt.toDateString() === now.toDateString();
          const timeStr = lastAt
            ? isToday
              ? lastAt.getHours().toString().padStart(2, '0') + ':' +
                lastAt.getMinutes().toString().padStart(2, '0')
              : lastAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
            : '';

          const bgColor = COLORS[idx % COLORS.length];
          const initial = (other?.full_name || 'U').charAt(0).toUpperCase();
          const hasUnread = (c.unread_count || 0) > 0;

          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.convCard, hasUnread && styles.convCardUnread]}
              onPress={() => onOpenChat(c)}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: bgColor }]}>
                <Text style={styles.avatarText}>{initial}</Text>
                {hasUnread && <View style={styles.onlineDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.convHeader}>
                  <Text
                    style={[styles.convName, hasUnread && styles.convNameUnread]}
                    numberOfLines={1}
                  >
                    {other?.full_name || 'Người dùng'}
                  </Text>
                  <Text style={[styles.convTime, hasUnread && styles.convTimeUnread]}>
                    {timeStr}
                  </Text>
                </View>
                <View style={styles.convFooter}>
                  <Text
                    style={[styles.convLast, hasUnread && styles.convLastUnread]}
                    numberOfLines={1}
                  >
                    {c.last_message || 'Bắt đầu cuộc trò chuyện'}
                  </Text>
                  {hasUnread && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {c.unread_count > 99 ? '99+' : c.unread_count}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

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
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIconBox: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  emptyDesc: {
    fontSize: 13, color: '#9CA3AF', textAlign: 'center',
    paddingHorizontal: 30, lineHeight: 19,
  },
  convCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  convCardUnread: {
    backgroundColor: '#F0F7FF',
    borderWidth: 1, borderColor: '#DBEAFE',
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  onlineDot: {
    position: 'absolute', top: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff',
  },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, fontWeight: '600', color: '#111', flex: 1 },
  convNameUnread: { fontWeight: 'bold', color: '#0F172A' },
  convTime: { fontSize: 11, color: '#9CA3AF', marginLeft: 8 },
  convTimeUnread: { color: '#2563EB', fontWeight: '600' },
  convFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 4, gap: 8,
  },
  convLast: { fontSize: 13, color: '#6B7280', flex: 1 },
  convLastUnread: { color: '#111', fontWeight: '600' },
  unreadBadge: {
    backgroundColor: '#EF4444', minWidth: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7,
  },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
});
