import { View, StyleSheet, AppState } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import TutorBottomNav from '../components/TutorBottomNav';
import ScheduleScreen from './tutor/ScheduleScreen';
import StudentsScreen from './tutor/StudentsScreen';
import StudentDetailScreen from './tutor/StudentDetailScreen';
import ReviewStudentScreen from './tutor/ReviewStudentScreen';
import WalletScreen from './tutor/WalletScreen';
import WithdrawScreen from './tutor/WithdrawScreen';
import TutorProfileScreen from './tutor/TutorProfileScreen';
import TutorEditProfileScreen from './tutor/TutorEditProfileScreen';
import MyReviewsScreen from './tutor/MyReviewsScreen';
import SetScheduleScreen from './tutor/SetScheduleScreen';
import RevenueScreen from './tutor/RevenueScreen';
import NotificationsScreen from './NotificationsScreen';
import NotificationDetailScreen from './NotificationDetailScreen';
import ChatListScreen from './chat/ChatListScreen';
import ChatDetailScreen from './chat/ChatDetailScreen';
import EditProfileScreen from './profile/EditProfileScreen';
import ChangePasswordScreen from './profile/ChangePasswordScreen';
import BankScreen from './profile/BankScreen';
import SupportScreen from './profile/SupportScreen';
import TermsScreen from './profile/TermsScreen';
import AIFloatingButton from '../components/AIFloatingButton';
import AIChatBox from '../components/AIChatBox';
import { getWallet } from '../lib/wallet';
import { getNotifUnreadCount } from '../lib/notif';
import { getUnreadCount, getOrCreateConversation } from '../lib/chat';
import { supabase } from '../lib/supabase';

export default function TutorMainTabs({ user: initialUser, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState('schedule');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [balance, setBalance] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [activeConv, setActiveConv] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reviewStudent, setReviewStudent] = useState(null);
  const [subScreen, setSubScreen] = useState(null);
  const [showAI, setShowAI] = useState(false);
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
    if (!activeConv && !selectedStudent) loadCounts();
  }, [activeConv, activeTab, selectedStudent]);

  if (subScreen === 'edit-profile') return <EditProfileScreen user={user} onBack={() => setSubScreen(null)} onSaved={(u) => { setUser(u); setSubScreen(null); }} />;
  if (subScreen === 'tutor-profile') return <TutorEditProfileScreen user={user} onBack={() => setSubScreen(null)} onSaved={() => setSubScreen(null)} />;
  if (subScreen === 'set-schedule') return <SetScheduleScreen user={user} onBack={() => setSubScreen(null)} onSaved={() => setSubScreen(null)} />;
  if (subScreen === 'revenue') return <RevenueScreen user={user} onBack={() => setSubScreen(null)} />;
  if (subScreen === 'my-reviews') return <MyReviewsScreen user={user} onBack={() => setSubScreen(null)} />;
  if (subScreen === 'bank') return <BankScreen user={user} onBack={() => setSubScreen(null)} />;
  if (subScreen === 'change-password') return <ChangePasswordScreen user={user} onBack={() => setSubScreen(null)} />;
  if (subScreen === 'support') return <SupportScreen onBack={() => setSubScreen(null)} />;
  if (subScreen === 'terms') return <TermsScreen onBack={() => setSubScreen(null)} />;

  if (reviewStudent) return <ReviewStudentScreen user={user} student={reviewStudent} onBack={() => setReviewStudent(null)} />;
  if (activeConv) return <ChatDetailScreen user={user} conversation={activeConv} onBack={() => { setActiveConv(null); loadCounts(); }} />;

  if (selectedStudent) {
    return <StudentDetailScreen user={user} student={selectedStudent} onBack={() => setSelectedStudent(null)} onReview={(s) => setReviewStudent(s)} onOpenChat={async (s) => {
      if (s.conversationId) {
        const { data: conv } = await supabase.from('conversations').select(`*, student:users!conversations_student_id_fkey (id, full_name, phone), tutor:users!conversations_tutor_id_fkey (id, full_name, phone)`).eq('id', s.conversationId).maybeSingle();
        if (conv) { setSelectedStudent(null); setActiveConv(conv); }
        return;
      }
      const res = await getOrCreateConversation(s.id, user.id);
      if (res.conversation) {
        const { data: conv } = await supabase.from('conversations').select(`*, student:users!conversations_student_id_fkey (id, full_name, phone), tutor:users!conversations_tutor_id_fkey (id, full_name, phone)`).eq('id', res.conversation.id).maybeSingle();
        if (conv) { setSelectedStudent(null); setActiveConv(conv); }
      }
    }} />;
  }

  if (selectedNotif) return <NotificationDetailScreen notification={selectedNotif} onBack={() => { setSelectedNotif(null); loadCounts(); }} onAction={(action) => { setSelectedNotif(null); if (action.screen === 'courses') setActiveTab('schedule'); else if (action.screen === 'wallet') setActiveTab('wallet'); loadCounts(); }} />;
  if (showWithdraw) return <WithdrawScreen user={user} balance={balance} onBack={() => setShowWithdraw(false)} onSuccess={() => { setShowWithdraw(false); setRefreshKey(k => k + 1); setActiveTab('wallet'); }} />;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'schedule' && <ScheduleScreen user={user} />}
        {activeTab === 'students' && <StudentsScreen user={user} onOpenChat={setActiveConv} onOpenStudent={setSelectedStudent} />}
        {activeTab === 'messages' && <ChatListScreen user={user} onOpenChat={setActiveConv} />}
        {activeTab === 'notifications' && <NotificationsScreen user={user} onRefresh={loadCounts} onOpenNotif={setSelectedNotif} />}
        {activeTab === 'wallet' && <WalletScreen key={refreshKey} user={user} onOpenWithdraw={() => setShowWithdraw(true)} />}
        {activeTab === 'profile' && <TutorProfileScreen user={user} onLogout={onLogout} onOpenScreen={setSubScreen} />}
      </View>
      <TutorBottomNav activeTab={activeTab} onChange={setActiveTab} unreadMsgs={unreadMsgs} unreadNotifs={unreadNotifs} />
      <AIFloatingButton onPress={() => setShowAI(true)} />
      <AIChatBox visible={showAI} onClose={() => setShowAI(false)} user={user} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1 },
});
