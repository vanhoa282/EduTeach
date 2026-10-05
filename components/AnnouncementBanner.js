import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveAnnouncements } from '../lib/announce';

const TYPE_CFG = {
  info: { bg: '#EFF6FF', border: '#BFDBFE', icon: 'information-circle', color: '#2563EB' },
  success: { bg: '#F0FDF4', border: '#BBF7D0', icon: 'checkmark-circle', color: '#10B981' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', icon: 'warning', color: '#F59E0B' },
  danger: { bg: '#FEF2F2', border: '#FECACA', icon: 'alert-circle', color: '#EF4444' },
};

const DISMISS_KEY = '@eduteach_dismissed_announcements';

export default function AnnouncementBanner() {
  const [items, setItems] = useState([]);
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(DISMISS_KEY);
      const dis = stored ? JSON.parse(stored) : [];
      setDismissed(dis);

      const list = await getActiveAnnouncements(5);
      setItems(list.filter(a => !dis.includes(a.id)));
    })();
  }, []);

  const handleDismiss = async (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    setItems(prev => prev.filter(a => a.id !== id));
    await AsyncStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  };

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      {items.map(a => {
        const cfg = TYPE_CFG[a.type] || TYPE_CFG.info;
        return (
          <View
            key={a.id}
            style={[styles.banner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
          >
            <Ionicons name={cfg.icon} size={20} color={cfg.color} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.title, { color: cfg.color }]} numberOfLines={1}>
                {a.title}
              </Text>
              {a.content && (
                <Text style={styles.content} numberOfLines={2}>{a.content}</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => handleDismiss(a.id)} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, gap: 8 },
  banner: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: 12, padding: 12, borderWidth: 1,
  },
  title: { fontSize: 14, fontWeight: 'bold' },
  content: { fontSize: 12, color: '#4B5563', marginTop: 2, lineHeight: 17 },
  closeBtn: { padding: 4, marginLeft: 6 },
});
