import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius } from '@/src/theme';

export function Skeleton({ width, height, style, round }: { width?: number | string; height?: number; style?: ViewStyle; round?: number }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, backgroundColor: colors.surfaceTertiary, borderRadius: round ?? radius.sm, opacity },
        style,
      ]}
    />
  );
}

export function ProductCardSkeleton({ width }: { width: number }) {
  return (
    <View style={[styles.card, { width }]}>
      <Skeleton height={width * 0.9} round={radius.md} />
      <Skeleton height={14} width={'80%'} style={{ marginTop: 10 }} />
      <Skeleton height={12} width={'60%'} style={{ marginTop: 8 }} />
      <Skeleton height={18} width={'45%'} style={{ marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 8, borderWidth: 1, borderColor: colors.border },
});
