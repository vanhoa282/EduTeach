import { View, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import AdminBottomNav from '../components/AdminBottomNav';
import DashboardScreen from './admin/DashboardScreen';
import UsersScreen from './admin/UsersScreen';
import AdminTutorsScreen from './admin/AdminTutorsScreen';
import CreateTutorScreen from './admin/CreateTutorScreen';
import AdminProfileScreen from './admin/AdminProfileScreen';
import OrdersScreen from './admin/OrdersScreen';
import WithdrawsScreen from './admin/WithdrawsScreen';
import AnnouncementsScreen from './admin/AnnouncementsScreen';
import CommissionScreen from './admin/CommissionScreen';
import SystemSettingsScreen from './admin/SystemSettingsScreen';
import DisputesScreen from './admin/DisputesScreen';
import ESMSConfigScreen from './admin/ESMSConfigScreen';
import DeepSeekConfigScreen from './admin/DeepSeekConfigScreen';
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

  if (subScreen === 'create-tutor') {
    return <CreateTutorScreen user={user} onBack={() => { setSubScreen(null); setActiveTab('tutors'); }} onCreated={() => { setSubScreen(null); setActiveTab('tutors'); }} />;
  }
  if (subScreen === 'commission') return <CommissionScreen onBack={() => setSubScreen(null)} />;
  if (subScreen === 'settings') return <SystemSettingsScreen onBack={() => setSubScreen(null)} />;
  if (subScreen === 'disputes') return <DisputesScreen onBack={() => setSubScreen(null)} />;
  if (subScreen === 'esms-config') return <ESMSConfigScreen user={user} onBack={() => setSubScreen(null)} />;
  if (subScreen === 'deepseek-config') return <DeepSeekConfigScreen user={user} onBack={() => setSubScreen(null)} />;
  if (subScreen === 'edit-profile') return <EditProfileScreen user={user} onBack={() => setSubScreen(null)} onSaved={(u) => { setUser(u); setSubScreen(null); }} />;
  if (subScreen === 'change-password') return <ChangePasswordScreen user={user} onBack={() => setSubScreen(null)} />;
  if (subScreen === 'bank') return <BankScreen user={user} onBack={() => setSubScreen(null)} />;
  if (subScreen === 'support') return <SupportScreen onBack={() => setSubScreen(null)} />;
  if (subScreen === 'announcements') {
    return (
      <View style={styles.container}>
        <View style={styles.content}><AnnouncementsScreen user={user} /></View>
        <AdminBottomNav activeTab="dashboard" onChange={(t) => { setSubScreen(null); setActiveTab(t); }} ordersCount={ordersCount} withdrawsCount={withdrawsCount} />
      </View>
    );
  }
  if (subScreen === 'profile') {
    return (
      <View style={styles.container}>
        <View style={styles.content}><AdminProfileScreen user={user} onLogout={onLogout} onOpenScreen={setSubScreen} /></View>
        <AdminBottomNav activeTab="dashboard" onChange={(t) => { setSubScreen(null); setActiveTab(t); }} ordersCount={ordersCount} withdrawsCount={withdrawsCount} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'dashboard' && <DashboardScreen user={user} onBack={onBack} onOpenProfile={() => setSubScreen('profile')} onOpenScreen={setSubScreen} />}
        {activeTab === 'orders' && <OrdersScreen />}
        {activeTab === 'withdraws' && <WithdrawsScreen />}
        {activeTab === 'tutors' && <AdminTutorsScreen onOpenCreate={() => setSubScreen('create-tutor')} />}
        {activeTab === 'users' && <UsersScreen />}
      </View>
      <AdminBottomNav activeTab={activeTab} onChange={setActiveTab} ordersCount={ordersCount} withdrawsCount={withdrawsCount} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1 },
});
