import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { tutors, categories } from '../data/tutors';

export default function HomeScreen({ phone, onSelectTutor }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Xin chào 👋</Text>
            <Text style={styles.phone}>{phone || 'bạn'}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color="#111" />
          </TouchableOpacity>
        </View>

        <Text style={styles.hero}>Tìm gia sư phù hợp{'\n'}cho con bạn</Text>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm môn, lớp, gia sư..."
            placeholderTextColor="#9CA3AF"
          />
          <Ionicons name="options-outline" size={20} color="#2563EB" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Danh mục</Text>
          <Text style={styles.sectionMore}>Xem tất cả</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
          {categories.map(cat => (
            <TouchableOpacity key={cat.id} style={styles.categoryCard}>
              <View style={[styles.categoryIconBox, { backgroundColor: cat.bg }]}>
                <Ionicons name={cat.icon} size={26} color={cat.color} />
              </View>
              <Text style={styles.categoryName}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Gia sư nổi bật</Text>
          <Text style={styles.sectionMore}>Xem tất cả</Text>
        </View>
        {tutors.map(tutor => (
          <TouchableOpacity
            key={tutor.id}
            style={styles.tutorCard}
            activeOpacity={0.7}
            onPress={() => onSelectTutor && onSelectTutor(tutor)}
          >
            <Image source={{ uri: tutor.avatar }} style={styles.tutorAvatar} />
            <View style={styles.tutorInfo}>
              <Text style={styles.tutorName}>{tutor.name}</Text>
              <Text style={styles.tutorSubject}>{tutor.subject} · {tutor.experience}</Text>
              <View style={styles.tutorMeta}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.tutorRating}> {tutor.rating}</Text>
                <Text style={styles.tutorReviews}>({tutor.reviews} đánh giá)</Text>
              </View>
            </View>
            <View style={styles.tutorPriceBox}>
              <Text style={styles.tutorPrice}>{(tutor.price / 1000).toFixed(0)}k</Text>
              <Text style={styles.tutorPriceUnit}>/buổi</Text>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 14, color: '#666' },
  phone: { fontSize: 18, fontWeight: 'bold', color: '#111', marginTop: 2 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  hero: { fontSize: 26, fontWeight: 'bold', color: '#111', lineHeight: 34, marginBottom: 20 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  sectionMore: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  categoriesContent: { paddingRight: 20, marginBottom: 24 },
  categoryCard: { alignItems: 'center', marginRight: 14, width: 68 },
  categoryIconBox: {
    width: 60, height: 60, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  categoryName: { fontSize: 12, color: '#374151', fontWeight: '600' },
  tutorCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 12, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  tutorAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 12, backgroundColor: '#E5E7EB' },
  tutorInfo: { flex: 1 },
  tutorName: { fontSize: 15, fontWeight: 'bold', color: '#111', marginBottom: 2 },
  tutorSubject: { fontSize: 13, color: '#666', marginBottom: 4 },
  tutorMeta: { flexDirection: 'row', alignItems: 'center' },
  tutorRating: { fontSize: 13, color: '#F59E0B', fontWeight: '600' },
  tutorReviews: { fontSize: 12, color: '#9CA3AF', marginLeft: 4 },
  tutorPriceBox: { alignItems: 'flex-end' },
  tutorPrice: { fontSize: 18, fontWeight: 'bold', color: '#2563EB' },
  tutorPriceUnit: { fontSize: 11, color: '#9CA3AF' },
});
