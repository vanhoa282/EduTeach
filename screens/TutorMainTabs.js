import { View, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import TutorBottomNav from '../components/TutorBottomNav';
import ScheduleScreen from './tutor/ScheduleScreen';
import StudentsScreen from './tutor/StudentsScreen';
import WalletScreen from './tutor/WalletScreen';
import WithdrawScreen from './tutor/WithdrawScreen';
import TutorProfileScreen from './tutor/TutorProfileScreen';
import { getWallet } from '../lib/wallet';

export default function TutorMainTabs({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [balance, setBalance] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadBalance = async () => {
    if (!user?.id) return;
    const { wallet } = await getWallet(user.id);
    setBalance(wallet?.balance_available || 0);
  };

  useEffect(() => { loadBalance(); }, [user?.id, refreshKey]);

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
        {activeTab === 'wallet' && (
          <WalletScreen
            key={refreshKey}
            user={user}
            onOpenWithdraw={() => setShowWithdraw(true)}
          />
        )}
        {activeTab === 'profile' && <TutorProfileScreen user={user} onLogout={onLogout} />}
      </View>
      <TutorBottomNav activeTab={activeTab} onChange={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1 },
});
