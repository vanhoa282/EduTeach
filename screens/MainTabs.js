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
import CourseDetailScreen from './CourseDetailScreen';
import AdminMainTabs from './AdminMainTabs';

export default function MainTabs({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [bookingTutor, setBookingTutor] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (showAdmin && user?.role === 'admin') {
    return <AdminMainTabs user={user} onBack={() => setShowAdmin(false)} onLogout={onLogout} />;
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
        tutor={selectedTutor}
        onBack={() => setSelectedTutor(null)}
        onBook={(tutor) => setBookingTutor(tutor)}
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
