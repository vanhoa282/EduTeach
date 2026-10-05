import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TABS = [
  { key: 'home', label: 'Trang chủ', icon: 'home', iconOutline: 'home-outline' },
  { key: 'courses', label: 'Khóa học', icon: 'book', iconOutline: 'book-outline' },
  { key: 'notifications', label: 'Tin nhắn', icon: 'chatbubbles', iconOutline: 'chatbubbles-outline' },
  { key: 'profile', label: 'Tài khoản', icon: 'person', iconOutline: 'person-outline' },
];

export default function BottomNav({ activeTab, onChange, unreadCount = 0 }) {
  return (
    <View style={styles.nav}>
      {TABS.map(tab => {
        const active = tab.key === activeTab;
        const showBadge = tab.key === 'notifications' && unreadCount > 0;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
          >
            <View>
              <Ionicons
                name={active ? tab.icon : tab.iconOutline}
                size={24}
                color={active ? '#2563EB' : '#9CA3AF'}
              />
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    paddingTop: 8, paddingBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  label: { fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: '500' },
  labelActive: { color: '#2563EB', fontWeight: '700' },
  badge: {
    position: 'absolute', top: -6, right: -10,
    backgroundColor: '#EF4444', minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5, borderWidth: 2, borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});
