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

export default function MainTabs({ phone, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [bookingTutor, setBookingTutor] = useState(null);
  const [bookingInfo, setBookingInfo] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [courses, setCourses] = useState([]);

  // Bước 1: Thanh toán
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
          setBookingInfo(null);
          setBookingTutor(null);
          setSelectedTutor(null);
          setActiveTab('courses');
        }}
      />
    );
  }

  // Bước 2: Đăng ký
  if (bookingTutor) {
    return (
      <BookingScreen
        tutor={bookingTutor}
        onBack={() => setBookingTutor(null)}
        onSuccess={(booking) => {
          setPaymentInfo({ tutor: bookingTutor, booking });
        }}
      />
    );
  }

  // Bước 3: Chi tiết gia sư
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
        {activeTab === 'home' && <HomeScreen phone={phone} onSelectTutor={setSelectedTutor} />}
        {activeTab === 'courses' && (
          <CoursesScreen courses={courses} onFindTutor={() => setActiveTab('home')} />
        )}
        {activeTab === 'notifications' && <NotificationsScreen />}
        {activeTab === 'profile' && <ProfileScreen phone={phone} onLogout={onLogout} />}
      </View>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1 },
});
