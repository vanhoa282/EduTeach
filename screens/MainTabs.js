import { View, StyleSheet } from 'react-native';
import { useState } from 'react';
import BottomNav from '../components/BottomNav';
import HomeScreen from './HomeScreen';
import CoursesScreen from './CoursesScreen';
import NotificationsScreen from './NotificationsScreen';
import ProfileScreen from './ProfileScreen';
import TutorDetailScreen from './TutorDetailScreen';
import BookingScreen from './BookingScreen';
import PaymentScreen from './PaymentScreen';
import AdminMainTabs from './AdminMainTabs';

export default function MainTabs({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [bookingTutor, setBookingTutor] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [courses, setCourses] = useState([]);
  const [showAdmin, setShowAdmin] = useState(false);

  // Admin mode
  if (showAdmin && user?.role === 'admin') {
    return <AdminMainTabs user={user} onBack={() => setShowAdmin(false)} onLogout={onLogout} />;
  }

  if (paymentInfo) {
    return (
      <PaymentScreen
        tutor={paymentInfo.tutor}
        booking={paymentInfo.booking}
        onBack={() => setPaymentInfo(null)}
        onSuccess={() => {
          const newCourse = {
            id: Date.now().toString(),
            tutorName: paymentInfo.tutor.name,
            subject: paymentInfo.tutor.subject,
            totalSessions: paymentInfo.booking.sessions,
            completedSessions: 0,
            schedule: 'T2, T4, T6 · 18h - 20h',
            total: paymentInfo.booking.total,
            status: 'pending',
          };
          setCourses([newCourse, ...courses]);
          setPaymentInfo(null);
          setBookingTutor(null);
          setSelectedTutor(null);
          setActiveTab('courses');
        }}
      />
    );
  }

  if (bookingTutor) {
    return (
      <BookingScreen
        tutor={bookingTutor}
        onBack={() => setBookingTutor(null)}
        onSuccess={(booking) => setPaymentInfo({ tutor: bookingTutor, booking })}
      />
    );
  }

  if (selectedTutor) {
    return (
      <TutorDetailScreen
        tutor={selectedTutor}
        onBack={() => setSelectedTutor(null)}
        onBook={(tutor) => setBookingTutor(tutor)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'home' && <HomeScreen phone={user?.phone} onSelectTutor={setSelectedTutor} />}
        {activeTab === 'courses' && (
          <CoursesScreen courses={courses} onFindTutor={() => setActiveTab('home')} />
        )}
        {activeTab === 'notifications' && <NotificationsScreen />}
        {activeTab === 'profile' && (
          <ProfileScreen
            user={user}
            onLogout={onLogout}
            onOpenAdmin={() => setShowAdmin(true)}
          />
        )}
      </View>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1 },
});
