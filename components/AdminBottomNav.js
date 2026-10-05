import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TABS = [
  { key: 'dashboard', label: 'Tổng quan', icon: 'grid', iconOutline: 'grid-outline' },
  { key: 'orders', label: 'Đơn hàng', icon: 'card', iconOutline: 'card-outline' },
  { key: 'withdraws', label: 'Rút tiền', icon: 'arrow-up-circle', iconOutline: 'arrow-up-circle-outline' },
  { key: 'users', label: 'Users', icon: 'people', iconOutline: 'people-outline' },
];

export default function AdminBottomNav({ activeTab, onChange, ordersCount = 0, withdrawsCount = 0 }) {
  const counts = { orders: ordersCount, withdraws: withdrawsCount };
  return (
    <View style={styles.nav}>
      {TABS.map(tab => {
        const active = tab.key === activeTab;
        const badgeCount = counts[tab.key] || 0;
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
                color={active ? '#7C3AED' : '#9CA3AF'}
              />
              {badgeCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badgeCount}</Text>
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
  label: { fontSize: 10, color: '#9CA3AF', marginTop: 4, fontWeight: '500' },
  labelActive: { color: '#7C3AED', fontWeight: '700' },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: '#EF4444', minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
});
