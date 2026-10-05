import { View, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import AdminBottomNav from '../components/AdminBottomNav';
import DashboardScreen from './admin/DashboardScreen';
import UsersScreen from './admin/UsersScreen';
import AdminProfileScreen from './admin/AdminProfileScreen';
import OrdersScreen from './admin/OrdersScreen';
import WithdrawsScreen from './admin/WithdrawsScreen';
import AnnouncementsScreen from './admin/AnnouncementsScreen';
import EditProfileScreen from './profile/EditProfileScreen';
import ChangePasswordScreen from './profile/ChangePasswordScreen';
import BankScreen from './profile/BankScreen';
import SupportScreen from './profile/SupportScreen';
import { adminGetPendingOrders } from '../lib/auth';
import { adminGetWithdraws } from '../lib/wallet';

export default function AdminMainTabs({ user: initialUser, onLogout, onBack }) {
  const [user, setUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [ordersCount, setOrdersCount] = useState(0);
  const [withdrawsCount, setWithdrawsCount] = useState(0);
  const [subScreen, setSubScreen] = useState(null);

  const loadCounts = async () => {
    const [o, w] = await Promise.all([adminGetPendingOrders(), adminGetWithdraws()]);
    setOrdersCount(o.orders?.length || 0);
    setWithdrawsCount((w.withdraws || []).filter(x => x.status === 'pending').length);
  };

  useEffect(() => { loadCounts(); }, [activeTab]);

  // Sub-screens từ AdminProfile
  if (subScreen === 'edit-profile') {
    return (
      <EditProfileScreen
        user={user}
        onBack={() => setSubScreen(null)}
        onSaved={(u) => { setUser(u); setSubScreen(null); }}
      />
    );
  }
  if (subScreen === 'change-password') {
    return <ChangePasswordScreen user={user} onBack={() => setSubScreen(null)} />;
  }
  if (subScreen === 'bank') {
    return <BankScreen user={user} onBack={() => setSubScreen(null)} />;
  }
  if (subScreen === 'support') {
    return <SupportScreen onBack={() => setSubScreen(null)} />;
  }

  // Announcements là sub-screen đặc biệt
  if (subScreen === 'announcements') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <AnnouncementsScreen user={user} />
        </View>
        <AdminBottomNav
          activeTab="profile"
          onChange={(t) => { setSubScreen(null); setActiveTab(t); }}
          ordersCount={ordersCount}
          withdrawsCount={withdrawsCount}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'dashboard' && <DashboardScreen user={user} onBack={onBack} />}
        {activeTab === 'orders' && <OrdersScreen />}
        {activeTab === 'withdraws' && <WithdrawsScreen />}
        {activeTab === 'users' && <UsersScreen />}
        {activeTab === 'profile' && (
          <AdminProfileScreen
            user={user}
            onLogout={onLogout}
            onOpenScreen={setSubScreen}
          />
        )}
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
