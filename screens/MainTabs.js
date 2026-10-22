import { View, StyleSheet, AppState } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import BottomNav from '../components/BottomNav';
import HomeScreen from './HomeScreen';
import AllTutorsScreen from './AllTutorsScreen';
import CoursesScreen from './CoursesScreen';
import NotificationsScreen from './NotificationsScreen';
import NotificationDetailScreen from './NotificationDetailScreen';
import ProfileScreen from './ProfileScreen';
import TutorDetailScreen from './TutorDetailScreen';
import BookingScreen from './BookingScreen';
import PaymentScreen from './PaymentScreen';
import CourseDetailScreen from './CourseDetailScreen';
import ClassroomScreen from './ClassroomScreen';
import ChatListScreen from './chat/ChatListScreen';
import ChatDetailScreen from './chat/ChatDetailScreen';
import MyTutorsScreen from './MyTutorsScreen';
import WishlistScreen from './WishlistScreen';
import AdminMainTabs from './AdminMainTabs';
import EditProfileScreen from './profile/EditProfileScreen';
import ChangePasswordScreen from './profile/ChangePasswordScreen';
import BankScreen from './profile/BankScreen';
import SupportScreen from './profile/SupportScreen';
import TermsScreen from './profile/TermsScreen';
import AIFloatingButton from '../components/AIFloatingButton';
import AIChatBox from '../components/AIChatBox';
import { getOrCreateConversation, getUnreadCount } from '../lib/chat';
import { getNotifUnreadCount } from '../lib/notif';
import { supabase } from '../lib/supabase';

export default function MainTabs({ user: initialUser, onLogout, pendingDeepLink, onDeepLinkConsumed }) {
  const [user, setUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [bookingTutor, setBookingTutor] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [allTutorsFilter, setAllTutorsFilter] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [profileScreen, setProfileScreen] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeConv, setActiveConv] = useState(null);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [showAI, setShowAI] = useState(false);
  const appState = useRef(AppState.currentState);

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
    loadCounts();
    const channel = supabase
      .channel('main-counts-' + user?.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, loadCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, loadCounts)
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

  // Deep-link từ push — phải mở ĐÚNG màn hình, đúng item.
  // Thứ tự: setActiveTab + setSelectedCourseId/setActiveConv TRƯỚC onDeepLinkConsumed.
  useEffect(() => {
    if (!pendingDeepLink || !onDeepLinkConsumed) return;
    const d = pendingDeepLink;

    // Reset overlay layer để deep-link không bị che bởi detail screen cũ
    const resetOverlays = () => {
      setProfileScreen(null);
      setShowAdmin(false);
      setAllTutorsFilter(null);
      setSelectedTutor(null);
      setBookingTutor(null);
      setPaymentInfo(null);
      setSelectedNotif(null);
      // Không reset activeConv/selectedCourseId/activeSession — chính là target
    };

    if (d.type === 'session_reminder' && d.courseId) {
      resetOverlays();
      // Đặt tab trước, course sau — đảm bảo render đúng Courses tab + detail
      setActiveTab('courses');
      setSelectedCourseId(d.courseId);
      // Đảm bảo pendingDeepLink clear sau khi state đã apply (1 tick)
      setTimeout(() => onDeepLinkConsumed(), 0);
      return;
    }

    if (d.type === 'message' && d.conversationId) {
      resetOverlays();
      // Student tab chat là 'messages' — cần set tab trước để ChatList mount
      setActiveTab('messages');
      (async () => {
        try {
          const { data: conv } = await supabase
            .from('conversations')
            .select('*, student:users!conversations_student_id_fkey (id, full_name, phone), tutor:users!conversations_tutor_id_fkey (id, full_name, phone)')
            .eq('id', d.conversationId)
            .maybeSingle();
          if (conv) setActiveConv(conv);
          else setActiveConv({ id: d.conversationId });
        } catch (e) {
          setActiveConv({ id: d.conversationId });
        }
        setTimeout(() => onDeepLinkConsumed(), 0);
      })();
      return;
    }

    if (d.type === 'order' && d.orderId) {
      resetOverlays();
      setActiveTab('courses');
      setSelectedCourseId(d.courseId || d.orderId);
      setTimeout(() => onDeepLinkConsumed(), 0);
      return;
    }

    // Fallback: unknown type
    setTimeout(() => onDeepLinkConsumed(), 0);
  }, [pendingDeepLink]);

  if (profileScreen === 'wishlist') {
    return <WishlistScreen user={user} onBack={() => setProfileScreen(null)} onSelectTutor={(t) => { setProfileScreen(null); setSelectedTutor(t); }} />;
  }
  if (profileScreen === 'my-tutors') {
    return <MyTutorsScreen user={user} onBack={() => setProfileScreen(null)} onOpenChat={(conv) => { setProfileScreen(null); setActiveConv(conv); }} onSelectTutor={(t) => { setProfileScreen(null); setSelectedTutor({ id: t.id, name: t.name, avatar: t.avatar, subject: t.subjects?.[0] || 'Chưa rõ', experience: 'Đang dạy', rating: 5.0, reviews: 0, price: t.price, bio: '' }); }} />;
  }
  if (profileScreen === 'edit-profile') {
    return <EditProfileScreen user={user} onBack={() => setProfileScreen(null)} onSaved={(u) => { setUser(u); setProfileScreen(null); }} />;
  }
  if (profileScreen === 'change-password') return <ChangePasswordScreen user={user} onBack={() => setProfileScreen(null)} />;
  if (profileScreen === 'bank') return <BankScreen user={user} onBack={() => setProfileScreen(null)} />;
  if (profileScreen === 'support') return <SupportScreen onBack={() => setProfileScreen(null)} />;
  if (profileScreen === 'terms') return <TermsScreen onBack={() => setProfileScreen(null)} />;

  if (showAdmin && user?.role === 'admin') {
    return <AdminMainTabs user={user} onBack={() => setShowAdmin(false)} onLogout={onLogout} />;
  }
  if (activeConv) {
    return <ChatDetailScreen user={user} conversation={activeConv} onBack={() => { setActiveConv(null); loadCounts(); }} />;
  }
  if (selectedNotif) {
    return <NotificationDetailScreen notification={selectedNotif} onBack={() => { setSelectedNotif(null); loadCounts(); }} onAction={(action) => { setSelectedNotif(null); if (action.screen === 'courses') setActiveTab('courses'); loadCounts(); }} />;
  }
  if (allTutorsFilter) {
    return <AllTutorsScreen user={user} initialCategory={allTutorsFilter.category} initialSearch={allTutorsFilter.search} onBack={() => setAllTutorsFilter(null)} onSelectTutor={(t) => { setAllTutorsFilter(null); setSelectedTutor(t); }} />;
  }
  // QUAN TRỌNG: phòng học phải được kiểm tra TRƯỚC selectedCourseId —
  // nếu không, khi HS bấm "Vào lớp" (setActiveSession) thì CourseDetail vẫn đè lên
  // và màn hình không chuyển (bug "bấm không phản hồi").
  if (activeSession) {
    return <ClassroomScreen user={user} session={activeSession} onBack={() => setActiveSession(null)} />;
  }
  if (selectedCourseId) {
    return <CourseDetailScreen courseId={selectedCourseId} onBack={() => { setSelectedCourseId(null); setRefreshKey(k => k + 1); }} onJoinClass={(session) => setActiveSession(session)} />;
  }
  if (paymentInfo) {
    return <PaymentScreen user={user} tutor={paymentInfo.tutor} booking={paymentInfo.booking} onBack={() => setPaymentInfo(null)} onSuccess={() => { setPaymentInfo(null); setBookingTutor(null); setSelectedTutor(null); setActiveTab('courses'); setRefreshKey(k => k + 1); }} />;
  }
  if (bookingTutor) {
    return <BookingScreen user={user} tutor={bookingTutor} onBack={() => setBookingTutor(null)} onSuccess={(booking) => setPaymentInfo({ tutor: bookingTutor, booking })} />;
  }
  if (selectedTutor) {
    return <TutorDetailScreen user={user} tutor={selectedTutor} onBack={() => setSelectedTutor(null)} onBook={(tutor) => setBookingTutor(tutor)} onChat={async (tutor) => { const res = await getOrCreateConversation(user.id, tutor.id); if (res.conversation) { setSelectedTutor(null); setActiveConv(res.conversation); } }} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'home' && <HomeScreen user={user} onSelectTutor={setSelectedTutor} onOpenAllTutors={setAllTutorsFilter} />}
        {activeTab === 'courses' && <CoursesScreen key={refreshKey} user={user} onFindTutor={() => setActiveTab('home')} onSelectCourse={setSelectedCourseId} />}
        {activeTab === 'notifications' && <NotificationsScreen user={user} onRefresh={loadCounts} onOpenNotif={setSelectedNotif} />}
        {activeTab === 'messages' && <ChatListScreen user={user} onOpenChat={setActiveConv} />}
        {activeTab === 'profile' && <ProfileScreen user={user} onLogout={onLogout} onOpenAdmin={() => setShowAdmin(true)} onOpenScreen={setProfileScreen} />}
      </View>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} unreadMsgs={unreadMsgs} unreadNotifs={unreadNotifs} />
      <AIFloatingButton onPress={() => setShowAI(true)} />
      <AIChatBox visible={showAI} onClose={() => setShowAI(false)} user={user} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1 },
});
