import { View, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import AdminBottomNav from '../components/AdminBottomNav';
import DashboardScreen from './admin/DashboardScreen';
import UsersScreen from './admin/UsersScreen';
import AdminProfileScreen from './admin/AdminProfileScreen';
import OrdersScreen from './admin/OrdersScreen';
import WithdrawsScreen from './admin/WithdrawsScreen';
import { adminGetPendingOrders } from '../lib/auth';
import { adminGetWithdraws } from '../lib/wallet';

export default function AdminMainTabs({ user, onLogout, onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [ordersCount, setOrdersCount] = useState(0);
  const [withdrawsCount, setWithdrawsCount] = useState(0);

  const loadCounts = async () => {
    const [o, w] = await Promise.all([adminGetPendingOrders(), adminGetWithdraws()]);
    setOrdersCount(o.orders?.length || 0);
    setWithdrawsCount((w.withdraws || []).filter(x => x.status === 'pending').length);
  };

  useEffect(() => { loadCounts(); }, [activeTab]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'dashboard' && <DashboardScreen user={user} onBack={onBack} />}
        {activeTab === 'orders' && <OrdersScreen />}
        {activeTab === 'withdraws' && <WithdrawsScreen />}
        {activeTab === 'users' && <UsersScreen />}
        {activeTab === 'profile' && <AdminProfileScreen user={user} onLogout={onLogout} />}
      </View>
      <AdminBottomNav
        activeTab={activeTab}
        onChange={setActiveTab}
        ordersCount={ordersCount}
        withdrawsCount={withdrawsCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1 },
});
