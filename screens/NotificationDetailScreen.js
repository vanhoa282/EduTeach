import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const TYPE_CFG = {
  system: { icon: 'information-circle', color: '#3B82F6', bg: '#EFF6FF', label: 'Hệ thống' },
  order: { icon: 'card', color: '#10B981', bg: '#F0FDF4', label: 'Đơn hàng' },
  course: { icon: 'book', color: '#8B5CF6', bg: '#F5F3FF', label: 'Khóa học' },
  session: { icon: 'calendar', color: '#F59E0B', bg: '#FFFBEB', label: 'Buổi học' },
  withdraw: { icon: 'cash', color: '#EF4444', bg: '#FEF2F2', label: 'Rút tiền' },
  message: { icon: 'chatbubble', color: '#06B6D4', bg: '#ECFEFF', label: 'Tin nhắn' },
};

export default function NotificationDetailScreen({ notification, onBack, onAction }) {
  const cfg = TYPE_CFG[notification.type] || TYPE_CFG.system;
  const time = new Date(notification.created_at);
  const timeStr =
    time.getDate().toString().padStart(2, '0') + '/' +
    (time.getMonth() + 1).toString().padStart(2, '0') + '/' +
    time.getFullYear() + ' ' +
    time.getHours().toString().padStart(2, '0') + ':' +
    time.getMinutes().toString().padStart(2, '0');

  const handleAction = () => {
    if (!onAction) return;
    // Tuỳ type mà điều hướng
    if (notification.type === 'course' || notification.type === 'session') {
      onAction({ screen: 'courses' });
    } else if (notification.type === 'order') {
      onAction({ screen: 'courses' });
    } else if (notification.type === 'withdraw') {
      onAction({ screen: 'wallet' });
    } else {
      onAction({ screen: 'back' });
    }
  };

  const getActionLabel = () => {
    if (notification.type === 'course' || notification.type === 'session') {
      return 'Xem khóa học';
    }
    if (notification.type === 'order') {
      return 'Xem đơn hàng';
    }
    if (notification.type === 'withdraw') {
      return 'Xem ví';
    }
    return null;
  };

  const actionLabel = getActionLabel();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Chi tiết thông báo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={48} color={cfg.color} />
          </View>
          <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.typeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.time}>{timeStr}</Text>

        <View style={styles.divider} />

        {notification.body && (
          <Text style={styles.body}>{notification.body}</Text>
        )}

        {!notification.body && (
          <Text style={styles.bodyEmpty}>Không có nội dung chi tiết.</Text>
        )}

        {actionLabel && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleAction} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>{actionLabel}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={{ height: 30 }} />
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
  content: { padding: 24, alignItems: 'center' },
  iconContainer: { alignItems: 'center', marginTop: 20, marginBottom: 24 },
  iconBox: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  typeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  title: {
    fontSize: 22, fontWeight: 'bold', color: '#111',
    textAlign: 'center', lineHeight: 30, marginBottom: 8,
  },
  time: { fontSize: 13, color: '#9CA3AF', marginBottom: 24 },
  divider: {
    width: '100%', height: 1, backgroundColor: '#F3F4F6', marginBottom: 24,
  },
  body: {
    fontSize: 15, color: '#4B5563', lineHeight: 24,
    textAlign: 'center', paddingHorizontal: 10,
  },
  bodyEmpty: {
    fontSize: 14, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center',
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563EB', paddingHorizontal: 32, paddingVertical: 16,
    borderRadius: 12, marginTop: 40, width: '100%',
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
