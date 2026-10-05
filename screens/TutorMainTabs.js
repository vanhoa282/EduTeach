import { View, StyleSheet } from 'react-native';
import { useState } from 'react';
import TutorBottomNav from '../components/TutorBottomNav';
import ScheduleScreen from './tutor/ScheduleScreen';
import StudentsScreen from './tutor/StudentsScreen';
import WalletScreen from './tutor/WalletScreen';
import TutorProfileScreen from './tutor/TutorProfileScreen';

export default function TutorMainTabs({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('schedule');

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'schedule' && <ScheduleScreen user={user} />}
        {activeTab === 'students' && <StudentsScreen />}
        {activeTab === 'wallet' && <WalletScreen />}
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
