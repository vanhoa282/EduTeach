import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getMySlots, saveMySlots, DAYS, HOURS } from '../../lib/tutorSchedule';

export default function SetScheduleScreen({ user, onBack, onSaved }) {
  const [slots, setSlots] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await getMySlots(user.id);
      setSlots(data || {});
      setLoading(false);
    })();
  }, [user.id]);

  const toggleSlot = (dayKey, hour) => {
    setSlots(prev => {
      const current = prev[dayKey] || [];
      const has = current.includes(hour);
      const next = has ? current.filter(h => h !== hour) : [...current, hour];
      const copy = { ...prev };
      if (next.length === 0) delete copy[dayKey];
      else copy[dayKey] = next;
      return copy;
    });
  };

  const isSlotOn = (dayKey, hour) => (slots[dayKey] || []).includes(hour);

  const toggleDay = (dayKey) => {
    setSlots(prev => {
      const current = prev[dayKey] || [];
      const allOn = HOURS.every(h => current.includes(h));
      const copy = { ...prev };
      if (allOn) delete copy[dayKey];
      else copy[dayKey] = [...HOURS];
      return copy;
    });
  };

  const clearAll = () => {
    Alert.alert('Xoá hết', 'Bạn chắc chắn muốn xoá toàn bộ lịch rảnh?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: () => setSlots({}) },
    ]);
  };

  const handleSave = async () => {
    if (Object.keys(slots).length === 0) {
      return Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 1 khung giờ');
    }
    setSaving(true);
    const res = await saveMySlots(user.id, slots);
    setSaving(false);
    if (res.error) return Alert.alert('Lỗi', res.error);
    Alert.alert('Đã lưu', 'Lịch rảnh của bạn đã được cập nhật', [
      { text: 'OK', onPress: onSaved },
    ]);
  };

  const totalSlots = Object.values(slots).reduce((sum, arr) => sum + arr.length, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#8B5CF6" />
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
        <Text style={styles.topBarTitle}>Lịch rảnh của tôi</Text>
        <TouchableOpacity onPress={clearAll} style={styles.backBtn}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Ionicons name="bulb-outline" size={20} color="#8B5CF6" />
          <Text style={styles.infoText}>
            Chọn khung giờ bạn rảnh để dạy. Học sinh sẽ thấy lịch này khi đặt lớp. Bấm vào ô để bật/tắt.
          </Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryNum}>{totalSlots}</Text>
          <Text style={styles.summaryLabel}>khung giờ đã chọn</Text>
        </View>

        {/* Header row */}
        <View style={styles.tableHeader}>
          <View style={styles.dayColHeader}>
            <Text style={styles.dayColHeaderText}>Giờ</Text>
          </View>
          {DAYS.map(d => (
            <TouchableOpacity
              key={d.key}
              style={styles.dayColHeaderBtn}
              onPress={() => toggleDay(d.key)}
            >
              <Text style={styles.dayColHeaderBtnText}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Slot grid */}
        {HOURS.map(hour => (
          <View key={hour} style={styles.row}>
            <View style={styles.hourCol}>
              <Text style={styles.hourText}>{hour}h</Text>
            </View>
            {DAYS.map(d => {
              const on = isSlotOn(d.key, hour);
              return (
                <TouchableOpacity
                  key={d.key + hour}
                  style={[styles.slot, on && styles.slotOn]}
                  onPress={() => toggleSlot(d.key, hour)}
                  activeOpacity={0.7}
                >
                  {on && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={styles.legendBox}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox2, { backgroundColor: '#EFF6FF' }]} />
            <Text style={styles.legendText}>Rảnh</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox2, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.legendText}>Đã chọn</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveText}>Lưu lịch rảnh</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  content: { padding: 16 },
  infoBox: {
    flexDirection: 'row', gap: 10, backgroundColor: '#F5F3FF',
    borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  infoText: { flex: 1, fontSize: 13, color: '#5B21B6', lineHeight: 19 },
  summaryBox: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center',
    gap: 8, marginBottom: 16,
  },
  summaryNum: { fontSize: 32, fontWeight: 'bold', color: '#8B5CF6' },
  summaryLabel: { fontSize: 13, color: '#6B7280' },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 4, paddingHorizontal: 2,
  },
  dayColHeader: {
    width: 40, alignItems: 'center',
  },
  dayColHeaderText: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  dayColHeaderBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 6,
  },
  dayColHeaderBtnText: { fontSize: 11, color: '#374151', fontWeight: '700' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 4, paddingHorizontal: 2,
  },
  hourCol: {
    width: 40, alignItems: 'center',
  },
  hourText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  slot: {
    flex: 1, aspectRatio: 1, marginHorizontal: 2,
    backgroundColor: '#fff', borderRadius: 6,
    borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  slotOn: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  legendBox: {
    flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBox2: { width: 16, height: 16, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#6B7280' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#8B5CF6', paddingVertical: 16, borderRadius: 12,
  },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
