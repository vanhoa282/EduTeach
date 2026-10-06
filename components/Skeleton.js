import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

export function SkeletonBlock({ width, height, borderRadius = 8, style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function TutorCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBlock width={60} height={60} borderRadius={30} />
      <View style={styles.info}>
        <SkeletonBlock width="70%" height={14} />
        <SkeletonBlock width="50%" height={12} style={{ marginTop: 8 }} />
        <SkeletonBlock width="40%" height={10} style={{ marginTop: 8 }} />
      </View>
      <View style={styles.priceBox}>
        <SkeletonBlock width={50} height={20} />
        <SkeletonBlock width={30} height={10} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function CourseCardSkeleton() {
  return (
    <View style={styles.courseCard}>
      <View style={styles.courseHeader}>
        <SkeletonBlock width={44} height={44} borderRadius={22} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <SkeletonBlock width="60%" height={14} />
          <SkeletonBlock width="40%" height={12} style={{ marginTop: 6 }} />
        </View>
        <SkeletonBlock width={70} height={22} borderRadius={20} />
      </View>
      <SkeletonBlock width="100%" height={1} style={{ marginVertical: 14 }} />
      <SkeletonBlock width="50%" height={12} />
      <SkeletonBlock width="100%" height={1} style={{ marginVertical: 12 }} />
      <SkeletonBlock width="40%" height={18} />
    </View>
  );
}

export function SessionCardSkeleton() {
  return (
    <View style={styles.sessionCard}>
      <SkeletonBlock width={44} height={44} borderRadius={12} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <SkeletonBlock width="50%" height={14} />
        <SkeletonBlock width="35%" height={12} style={{ marginTop: 6 }} />
      </View>
      <SkeletonBlock width={60} height={22} borderRadius={20} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  info: { flex: 1, marginLeft: 12 },
  priceBox: { alignItems: 'flex-end' },
  courseCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  courseHeader: { flexDirection: 'row', alignItems: 'center' },
  sessionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
});
