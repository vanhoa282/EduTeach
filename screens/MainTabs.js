import { View, StyleSheet, AppState } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import BottomNav from '../components/BottomNav';
import HomeScreen from './HomeScreen';
import CoursesScreen from './CoursesScreen';
import ProfileScreen from './ProfileScreen';
import TutorDetailScreen from './TutorDetailScreen';
import BookingScreen from './BookingScreen';
import PaymentScreen from './PaymentScreen';
import CourseDetailScreen from './CourseDetailScreen';
import ChatListScreen from './chat/ChatListScreen';
import ChatDetailScreen from './chat/ChatDetailScreen';
import AdminMainTabs from './AdminMainTabs';
import { getOrCreateConversation, getUnreadCount } from '../lib/chat';
import { supabase } from '../lib/supabase';

export default function MainTabs({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [bookingTutor, setBookingTutor] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeConv, setActiveConv] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const appState = useRef(AppState.currentState);

  // Load unread count
  const loadUnread = async () => {
    if (!user?.id) return;
    const count = await getUnreadCount(user.id);
    setUnreadCount(count);
  };

  useEffect(() => {
    loadUnread();

    // Realtime subscribe to messages → update unread count
    const channel = supabase
      .channel('main-unread-' + user?.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => {
        loadUnread();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      }, () => {
        loadUnread();
      })
      .subscribe();

    // Poll mỗi 30s dự phòng
    const poll = setInterval(loadUnread, 30000);

    // Khi app quay lại foreground → refresh
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

  // Refresh unread khi đóng chat hoặc đổi tab
  useEffect(() => {
    if (!activeConv) loadUnread();
  }, [activeConv, activeTab]);

  if (showAdmin && user?.role === 'admin') {
    return <AdminMainTabs user={user} onBack={() => setShowAdmin(false)} onLogout={onLogout} />;
  }

  if (activeConv) {
    return (
      <ChatDetailScreen
        user={user}
        conversation={activeConv}
        onBack={() => { setActiveConv(null); loadUnread(); }}
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
        {activeTab === 'home' && <HomeScreen user={user} onSelectTutor={setSelectedTutor} />}
        {activeTab === 'courses' && (
          <CoursesScreen
            key={refreshKey}
            user={user}
            onFindTutor={() => setActiveTab('home')}
            onSelectCourse={setSelectedCourseId}
          />
        )}
        {activeTab === 'notifications' && <ChatListScreen user={user} onOpenChat={setActiveConv} />}
        {activeTab === 'profile' && (
          <ProfileScreen
            user={user}
            onLogout={onLogout}
            onOpenAdmin={() => setShowAdmin(true)}
          />
        )}
      </View>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} unreadCount={unreadCount} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1 },
});
