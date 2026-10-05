import { View, StyleSheet, AppState } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import TutorBottomNav from '../components/TutorBottomNav';
import ScheduleScreen from './tutor/ScheduleScreen';
import StudentsScreen from './tutor/StudentsScreen';
import WalletScreen from './tutor/WalletScreen';
import WithdrawScreen from './tutor/WithdrawScreen';
import TutorProfileScreen from './tutor/TutorProfileScreen';
import ChatListScreen from './chat/ChatListScreen';
import ChatDetailScreen from './chat/ChatDetailScreen';
import { getWallet } from '../lib/wallet';
import { getUnreadCount } from '../lib/chat';
import { supabase } from '../lib/supabase';

export default function TutorMainTabs({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [balance, setBalance] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeConv, setActiveConv] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const appState = useRef(AppState.currentState);

  const loadBalance = async () => {
    if (!user?.id) return;
    const { wallet } = await getWallet(user.id);
    setBalance(wallet?.balance_available || 0);
  };

  const loadUnread = async () => {
    if (!user?.id) return;
    const count = await getUnreadCount(user.id);
    setUnreadCount(count);
  };

  useEffect(() => {
    loadBalance();
    loadUnread();

    const channel = supabase
      .channel('tutor-unread-' + user?.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, loadUnread)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, loadUnread)
      .subscribe();

    const poll = setInterval(loadUnread, 30000);

    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        loadUnread();
      }
      appState.current = nextState;
    });

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      sub.remove();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!activeConv) loadUnread();
  }, [activeConv, activeTab]);

  if (activeConv) {
    return (
      <ChatDetailScreen
        user={user}
        conversation={activeConv}
        onBack={() => { setActiveConv(null); loadUnread(); }}
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
        {activeTab === 'students' && <StudentsScreen user={user} />}
        {activeTab === 'messages' && <ChatListScreen user={user} onOpenChat={setActiveConv} />}
        {activeTab === 'wallet' && (
          <WalletScreen
            key={refreshKey}
            user={user}
            onOpenWithdraw={() => setShowWithdraw(true)}
          />
        )}
        {activeTab === 'profile' && <TutorProfileScreen user={user} onLogout={onLogout} />}
      </View>
      <TutorBottomNav activeTab={activeTab} onChange={setActiveTab} unreadCount={unreadCount} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1 },
});
