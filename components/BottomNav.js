import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TABS = [
  { key: 'home', label: 'Trang chủ', icon: 'home', iconOutline: 'home-outline' },
  { key: 'courses', label: 'Khóa học', icon: 'book', iconOutline: 'book-outline' },
  { key: 'notifications', label: 'Thông báo', icon: 'notifications', iconOutline: 'notifications-outline' },
  { key: 'profile', label: 'Tài khoản', icon: 'person', iconOutline: 'person-outline' },
];

export default function BottomNav({ activeTab, onChange }) {
  return (
    <View style={styles.nav}>
      {TABS.map(tab => {
        const active = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={active ? tab.icon : tab.iconOutline}
              size={24}
              color={active ? '#2563EB' : '#9CA3AF'}
            />
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  label: { fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: '500' },
  labelActive: { color: '#2563EB', fontWeight: '700' },
});
