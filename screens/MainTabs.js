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
import ChatListScreen from './chat/ChatListScreen';
import ChatDetailScreen from './chat/ChatDetailScreen';
import AdminMainTabs from './AdminMainTabs';
import { getOrCreateConversation, getUnreadCount } from '../lib/chat';
import { getNotifUnreadCount } from '../lib/notif';
import { supabase } from '../lib/supabase';

export default function MainTabs({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [bookingTutor, setBookingTutor] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [allTutorsFilter, setAllTutorsFilter] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeConv, setActiveConv] = useState(null);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
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

  useEffect(() => {
    if (!activeConv) loadCounts();
  }, [activeConv, activeTab]);

  if (showAdmin && user?.role === 'admin') {
    return <AdminMainTabs user={user} onBack={() => setShowAdmin(false)} onLogout={onLogout} />;
  }

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
          if (action.screen === 'courses') setActiveTab('courses');
          else if (action.screen === 'wallet') setActiveTab('profile');
          loadCounts();
        }}
      />
    );
  }

  if (allTutorsFilter) {
    return (
      <AllTutorsScreen
        user={user}
        initialCategory={allTutorsFilter.category}
        initialSearch={allTutorsFilter.search}
        onBack={() => setAllTutorsFilter(null)}
        onSelectTutor={(t) => {
          setAllTutorsFilter(null);
          setSelectedTutor(t);
        }}
      />
    );
  }

  if (selectedCourseId) {
    return (
      <CourseDetailScreen
        courseId={selectedCourseId}
        onBack={() => { setSelectedCourseId(null); setRefreshKey(k => k + 1); }}
      />
    );
  }

  if (paymentInfo) {
    return (
      <PaymentScreen
        user={user}
        tutor={paymentInfo.tutor}
        booking={paymentInfo.booking}
        onBack={() => setPaymentInfo(null)}
        onSuccess={() => {
          setPaymentInfo(null);
          setBookingTutor(null);
          setSelectedTutor(null);
          setActiveTab('courses');
          setRefreshKey(k => k + 1);
        }}
      />
    );
  }

  if (bookingTutor) {
    return (
      <BookingScreen
        user={user}
        tutor={bookingTutor}
        onBack={() => setBookingTutor(null)}
        onSuccess={(booking) => setPaymentInfo({ tutor: bookingTutor, booking })}
      />
    );
  }

  if (selectedTutor) {
    return (
      <TutorDetailScreen
        user={user}
        tutor={selectedTutor}
        onBack={() => setSelectedTutor(null)}
        onBook={(tutor) => setBookingTutor(tutor)}
        onChat={async (tutor) => {
          const res = await getOrCreateConversation(user.id, tutor.id);
          if (res.conversation) {
            setSelectedTutor(null);
            setActiveConv(res.conversation);
          }
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'home' && (
          <HomeScreen
            user={user}
            onSelectTutor={setSelectedTutor}
            onOpenAllTutors={setAllTutorsFilter}
          />
        )}
        {activeTab === 'courses' && (
          <CoursesScreen
            key={refreshKey}
            user={user}
            onFindTutor={() => setActiveTab('home')}
            onSelectCourse={setSelectedCourseId}
          />
        )}
        {activeTab === 'notifications' && (
          <NotificationsScreen
            user={user}
            onRefresh={loadCounts}
            onOpenNotif={setSelectedNotif}
          />
        )}
        {activeTab === 'messages' && <ChatListScreen user={user} onOpenChat={setActiveConv} />}
        {activeTab === 'profile' && (
          <ProfileScreen
            user={user}
            onLogout={onLogout}
            onOpenAdmin={() => setShowAdmin(true)}
          />
        )}
      </View>
      <BottomNav
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
