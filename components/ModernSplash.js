import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ModernSplash() {
  const scale = useRef(new Animated.Value(0.78)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
    ]).start();

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 550,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1735" />

      <Animated.View style={[
        styles.content,
        { opacity, transform: [{ scale }] }
      ]}>
        <View style={styles.logo}>
          <Ionicons name="book-outline" size={48} color="#FFFFFF" />
        </View>

        <Text style={styles.brand}>
          Edu<Text style={styles.accent}>Teach</Text>
        </Text>

        <Text style={styles.subtitle}>
          Kết nối tri thức - Kiến tạo tương lai
        </Text>
      </Animated.View>

      <Animated.View style={[styles.loading, { opacity: pulse }]}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </Animated.View>

      <Text style={styles.footer}>EDUTEACH PLATFORM</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1735',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 104,
    height: 104,
    borderRadius: 30,
    backgroundColor: '#183A79',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    borderWidth: 1,
    borderColor: '#365B99',
    elevation: 12,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  accent: {
    color: '#65B5FF',
  },
  subtitle: {
    color: '#B5C7E5',
    fontSize: 13,
    marginTop: 12,
  },
  loading: {
    position: 'absolute',
    bottom: 95,
    flexDirection: 'row',
    gap: 9,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#60A5FA',
  },
  footer: {
    position: 'absolute',
    bottom: 35,
    color: '#60769D',
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '600',
  },
});
