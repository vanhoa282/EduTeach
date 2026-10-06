import { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BTN_SIZE = 56;

export default function AIFloatingButton({ onPress }) {
  const pan = useRef(new Animated.ValueXY({
    x: SCREEN_W - BTN_SIZE - 16,
    y: SCREEN_H - BTN_SIZE - 140,
  })).current;
  const [dragging, setDragging] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
        setDragging(true);
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        setDragging(false);
        const currentX = pan.x._value;
        const stickX = currentX < SCREEN_W / 2 ? 16 : SCREEN_W - BTN_SIZE - 16;
        const clampedY = Math.max(80, Math.min(pan.y._value, SCREEN_H - BTN_SIZE - 140));
        Animated.spring(pan, {
          toValue: { x: stickX, y: clampedY },
          useNativeDriver: false,
          friction: 6,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.container, { transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity style={styles.btn} onPress={() => !dragging && onPress?.()} activeOpacity={0.8}>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={26} color="#fff" />
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', zIndex: 9999, elevation: 9999 },
  btn: {
    width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  aiBadge: {
    position: 'absolute', bottom: -6, right: -10,
    backgroundColor: '#F59E0B', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6,
  },
  aiBadgeText: { fontSize: 8, color: '#fff', fontWeight: 'bold' },
});
