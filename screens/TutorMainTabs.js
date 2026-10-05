import { View, StyleSheet, AppState } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import TutorBottomNav from '../components/TutorBottomNav';
import ScheduleScreen from './tutor/ScheduleScreen';
import StudentsScreen from './tutor/StudentsScreen';
import WalletScreen from './tutor/WalletScreen';
import WithdrawScreen from './tutor/WithdrawScreen';
import TutorProfileScreen from './tutor/TutorProfileScreen';
import NotificationsScreen from './NotificationsScreen';
import NotificationDetailScreen from './NotificationDetailScreen';
import ChatListScreen from './chat/ChatListScreen';
import ChatDetailScreen from './chat/ChatDetailScreen';
import { getWallet } from '../lib/wallet';
import { getNotifUnreadCount } from '../lib/notif';
import { getUnreadCount } from '../lib/chat';
import { supabase } from '../lib/supabase';

export default function TutorMainTabs({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [balance, setBalance] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [activeConv, setActiveConv] = useState(null);
  const appState = useRef(AppState.currentState);

  const loadBalance = async () => {
    if (!user?.id) return;
    const { wallet } = await getWallet(user.id);
    setBalance(wallet?.balance_available || 0);
  };

  const loadCounts = async () => {
    if (!user?.id) return;
    const [m, n] = await Promise.all([
      getUnreadCount(user.id),
      getNotifUnreadCount(user.id),
    ]);
    setUnreadMsgs(m);
    setUnreadNotifs(n);
  };

  useEffect(() => {
    loadBalance();
    loadCounts();

    const channel = supabase
      .channel('tutor-counts-' + user?.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, loadCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, loadCounts)
      .subscribe();

    const poll = setInterval(loadCounts, 30000);

    const sub = AppState.addEventListener('change', (s) => {
      if (appState.current.match(/inactive|background/) && s === 'active') loadCounts();
      appState.current = s;
    });

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      sub.remove();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!activeConv) loadCounts();
  }, [activeConv, activeTab]);

  if (activeConv) {
    return (
      <ChatDetailScreen
        user={user}
        conversation={activeConv}
        onBack={() => { setActiveConv(null); loadCounts(); }}
      />
    );
  }

  if (selectedNotif) {
    return (
      <NotificationDetailScreen
        notification={selectedNotif}
        onBack={() => { setSelectedNotif(null); loadCounts(); }}
        onAction={(action) => {
          setSelectedNotif(null);
          if (action.screen === 'courses') setActiveTab('schedule');
          else if (action.screen === 'wallet') setActiveTab('wallet');
          loadCounts();
        }}
      />
    );
  }

  if (showWithdraw) {
    return (
      <WithdrawScreen
        user={user}
        balance={balance}
        onBack={() => setShowWithdraw(false)}
        onSuccess={() => {
          setShowWithdraw(false);
          setRefreshKey(k => k + 1);
          setActiveTab('wallet');
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'schedule' && <ScheduleScreen user={user} />}
        {activeTab === 'students' && (
          <StudentsScreen user={user} onOpenChat={setActiveConv} />
        )}
        {activeTab === 'messages' && <ChatListScreen user={user} onOpenChat={setActiveConv} />}
        {activeTab === 'notifications' && (
          <NotificationsScreen
            user={user}
            onRefresh={loadCounts}
            onOpenNotif={setSelectedNotif}
          />
        )}
        {activeTab === 'wallet' && (
          <WalletScreen
            key={refreshKey}
            user={user}
            onOpenWithdraw={() => setShowWithdraw(true)}
          />
        )}
        {activeTab === 'profile' && <TutorProfileScreen user={user} onLogout={onLogout} />}
      </View>
      <TutorBottomNav
        activeTab={activeTab}
        onChange={setActiveTab}
        unreadMsgs={unreadMsgs}
        unreadNotifs={unreadNotifs}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1 },
});
