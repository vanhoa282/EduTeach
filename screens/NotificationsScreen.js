import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getMyNotifications, markNotifRead, markAllNotifRead } from '../lib/notif';

const TYPE_CFG = {
  system: { icon: 'information-circle', color: '#3B82F6', bg: '#EFF6FF' },
  order: { icon: 'card', color: '#10B981', bg: '#F0FDF4' },
  course: { icon: 'book', color: '#8B5CF6', bg: '#F5F3FF' },
  session: { icon: 'calendar', color: '#F59E0B', bg: '#FFFBEB' },
  withdraw: { icon: 'cash', color: '#EF4444', bg: '#FEF2F2' },
  message: { icon: 'chatbubble', color: '#06B6D4', bg: '#ECFEFF' },
};

export default function NotificationsScreen({ user, onRefresh, onOpenNotif }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    const data = await getMyNotifications(user.id);
    setNotifs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const onRefreshPull = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    if (onRefresh) onRefresh();
  };

  const handleTap = async (n) => {
    if (!n.read_at) {
      await markNotifRead(n.id);
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
      if (onRefresh) onRefresh();
    }
    if (onOpenNotif) onOpenNotif(n);
  };

  const handleReadAll = async () => {
    await markAllNotifRead(user.id);
    load();
    if (onRefresh) onRefresh();
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

  const unread = notifs.filter(n => !n.read_at).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshPull} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Thông báo</Text>
            <Text style={styles.subtitle}>
              {notifs.length} thông báo{unread > 0 ? ` · ${unread} chưa đọc` : ''}
            </Text>
          </View>
          {unread > 0 && (
            <TouchableOpacity style={styles.readAllBtn} onPress={handleReadAll}>
              <Ionicons name="checkmark-done" size={16} color="#2563EB" />
              <Text style={styles.readAllText}>Đã đọc hết</Text>
            </TouchableOpacity>
          )}
        </View>

        {notifs.length === 0 && (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="notifications-outline" size={48} color="#F59E0B" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
            <Text style={styles.emptyDesc}>Khi có buổi học hoặc tin mới, bạn sẽ thấy ở đây</Text>
          </View>
        )}

        {notifs.map(n => {
          const cfg = TYPE_CFG[n.type] || TYPE_CFG.system;
          const isUnread = !n.read_at;
          const time = new Date(n.created_at);
          const now = new Date();
          const isToday = time.toDateString() === now.toDateString();
          const timeStr = isToday
            ? time.getHours().toString().padStart(2, '0') + ':' +
              time.getMinutes().toString().padStart(2, '0')
            : time.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

          return (
            <TouchableOpacity
              key={n.id}
              style={[styles.card, isUnread && styles.cardUnread]}
              onPress={() => handleTap(n)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={22} color={cfg.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardHeader}>
                  <Text
                    style={[styles.cardTitle, isUnread && styles.cardTitleUnread]}
                    numberOfLines={1}
                  >
                    {n.title}
                  </Text>
                  {isUnread && <View style={styles.dot} />}
                </View>
                {n.body && (
                  <Text style={styles.cardBody} numberOfLines={2}>{n.body}</Text>
                )}
                <View style={styles.cardFooter}>
                  <Text style={styles.cardTime}>{timeStr}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
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
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  readAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#EFF6FF',
  },
  readAllText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIconBox: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFFBEB',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 30 },
  card: {
    flexDirection: 'row', gap: 12, backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardUnread: { backgroundColor: '#F0F7FF', borderWidth: 1, borderColor: '#DBEAFE' },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111', flex: 1 },
  cardTitleUnread: { fontWeight: 'bold' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginLeft: 6 },
  cardBody: { fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 18 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 6,
  },
  cardTime: { fontSize: 11, color: '#9CA3AF' },
});
