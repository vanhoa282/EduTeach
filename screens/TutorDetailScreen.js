import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TutorDetailScreen({ tutor, onBack, onBook }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Chi tiết gia sư</Text>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name="heart-outline" size={22} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.profileBox}>
          <Image source={{ uri: tutor.avatar }} style={styles.avatar} />
          <Text style={styles.name}>{tutor.name}</Text>
          <Text style={styles.subject}>{tutor.subject}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={styles.statTop}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.statValue}> {tutor.rating}</Text>
              </View>
              <Text style={styles.statLabel}>{tutor.reviews} đánh giá</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{tutor.experience}</Text>
              <Text style={styles.statLabel}>Kinh nghiệm</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{(tutor.price / 1000).toFixed(0)}k</Text>
              <Text style={styles.statLabel}>Mỗi buổi</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giới thiệu</Text>
          <Text style={styles.sectionText}>
            Gia sư nhiệt tình, có {tutor.experience} kinh nghiệm giảng dạy môn {tutor.subject}.
            Phương pháp dạy dễ hiểu, tận tâm với học sinh, giúp học sinh tiến bộ rõ rệt
            sau mỗi buổi học.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chuyên môn</Text>
          <View style={styles.tagsRow}>
            {['Luyện thi', 'Cơ bản', 'Nâng cao', 'Online'].map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lịch dạy</Text>
          <View style={styles.scheduleBox}>
            <Ionicons name="time-outline" size={18} color="#2563EB" />
            <Text style={styles.scheduleText}>T2 - T6: 18h - 21h</Text>
          </View>
          <View style={styles.scheduleBox}>
            <Ionicons name="time-outline" size={18} color="#2563EB" />
            <Text style={styles.scheduleText}>T7 - CN: 8h - 17h</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.priceSmallLabel}>Giá mỗi buổi</Text>
          <Text style={styles.priceBig}>{tutor.price.toLocaleString('vi-VN')}đ</Text>
        </View>
        <TouchableOpacity style={styles.bookBtn} onPress={() => onBook && onBook(tutor)}>
          <Text style={styles.bookBtnText}>Đăng ký học</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  content: { paddingBottom: 20 },
  profileBox: {
    alignItems: 'center', backgroundColor: '#fff',
    paddingVertical: 28, paddingHorizontal: 20,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 100, height: 100, borderRadius: 50, marginBottom: 12,
    backgroundColor: '#E5E7EB',
  },
  name: { fontSize: 22, fontWeight: 'bold', color: '#111', marginBottom: 4 },
  subject: { fontSize: 14, color: '#666', marginBottom: 20 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 16, paddingVertical: 14,
    paddingHorizontal: 20, width: '100%',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statTop: { flexDirection: 'row', alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  divider: { width: 1, height: 28, backgroundColor: '#E5E7EB' },
  section: {
    backgroundColor: '#fff', marginTop: 12, paddingHorizontal: 20, paddingVertical: 18,
    marginHorizontal: 16, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginBottom: 10 },
  sectionText: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  scheduleBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
  },
  scheduleText: { fontSize: 14, color: '#4B5563' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 8,
  },
  priceSmallLabel: { fontSize: 12, color: '#9CA3AF' },
  priceBig: { fontSize: 20, fontWeight: 'bold', color: '#2563EB' },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2563EB', paddingHorizontal: 22, paddingVertical: 14,
    borderRadius: 12,
  },
  bookBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
