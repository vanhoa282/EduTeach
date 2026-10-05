import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveAnnouncements } from '../lib/announce';

const TYPE_CFG = {
  info: { bg: '#EFF6FF', border: '#BFDBFE', icon: 'information-circle', color: '#2563EB', label: 'Thông tin' },
  success: { bg: '#F0FDF4', border: '#BBF7D0', icon: 'checkmark-circle', color: '#10B981', label: 'Thành công' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', icon: 'warning', color: '#F59E0B', label: 'Cảnh báo' },
  danger: { bg: '#FEF2F2', border: '#FECACA', icon: 'alert-circle', color: '#EF4444', label: 'Khẩn' },
};

const DISMISS_KEY = '@eduteach_dismissed_announcements';

export default function AnnouncementBanner() {
  const [items, setItems] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [detail, setDetail] = useState(null);

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

  const openDetail = (item) => {
    setDetail(item);
  };

  if (items.length === 0 && !detail) return null;

  return (
    <>
      <View style={styles.container}>
        {items.map(a => {
          const cfg = TYPE_CFG[a.type] || TYPE_CFG.info;
          return (
            <TouchableOpacity
              key={a.id}
              style={[styles.banner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
              onPress={() => openDetail(a)}
              activeOpacity={0.75}
            >
              <Ionicons name={cfg.icon} size={20} color={cfg.color} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.title, { color: cfg.color }]} numberOfLines={1}>
                  {a.title}
                </Text>
                {a.content && (
                  <Text style={styles.content} numberOfLines={2}>{a.content}</Text>
                )}
                <Text style={[styles.tapHint, { color: cfg.color }]}>
                  Bấm để xem chi tiết
                </Text>
              </View>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); handleDismiss(a.id); }}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Detail Modal */}
      <Modal
        visible={!!detail}
        transparent
        animationType="fade"
        onRequestClose={() => setDetail(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDetail(null)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            {detail && (
              <>
                <View style={styles.modalHeader}>
                  {(() => {
                    const cfg = TYPE_CFG[detail.type] || TYPE_CFG.info;
                    return (
                      <>
                        <View style={[styles.modalIconBox, { backgroundColor: cfg.bg }]}>
                          <Ionicons name={cfg.icon} size={26} color={cfg.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                            <Text style={[styles.typeText, { color: cfg.color }]}>{cfg.label}</Text>
                          </View>
                          <Text style={styles.modalTime}>
                            {new Date(detail.created_at).toLocaleString('vi-VN')}
                          </Text>
                        </View>
                      </>
                    );
                  })()}
                  <TouchableOpacity
                    onPress={() => setDetail(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTitle}>{detail.title}</Text>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalContent}>
                    {detail.content || 'Không có nội dung chi tiết.'}
                  </Text>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalBtn}
                    onPress={() => {
                      handleDismiss(detail.id);
                      setDetail(null);
                    }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#6B7280" />
                    <Text style={styles.modalBtnText}>Đã hiểu</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
  tapHint: { fontSize: 11, fontWeight: '600', marginTop: 6, opacity: 0.8 },
  closeBtn: { padding: 4, marginLeft: 6 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    width: '100%', maxHeight: '80%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginBottom: 16,
  },
  modalIconBox: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  typeBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 8,
  },
  typeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  modalTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20, fontWeight: 'bold', color: '#111',
    lineHeight: 28, marginBottom: 12,
  },
  modalScroll: { maxHeight: 300 },
  modalContent: {
    fontSize: 15, color: '#4B5563', lineHeight: 24,
  },
  modalActions: {
    marginTop: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  modalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6',
  },
  modalBtnText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
});
