import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { colors, font, fontSize, spacing } from '@/src/theme';

export default function Splash() {
  const router = useRouter();
  const { ready } = useAuth();
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const decided = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [opacity, rotate, scale]);

  useEffect(() => {
    if (!ready || decided.current) return;
    decided.current = true;
    const t = setTimeout(async () => {
      router.replace( '/(tabs)');
    }, 1400);
    return () => clearTimeout(t);
  }, [ready, router]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] });

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <View style={styles.mark}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Feather name="sun" size={52} color={colors.onBrand} />
          </Animated.View>
        </View>
      </Animated.View>
      <Animated.Text style={[styles.title, { opacity }]}>SUNSU</Animated.Text>
      <Animated.Text style={[styles.tagline, { opacity }]}>Nature, Dehydrated. Goodness, Preserved.</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 108, height: 108, borderRadius: 54, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.extrabold, fontSize: 40, letterSpacing: 4, color: colors.onSurface, marginTop: spacing.xl },
  tagline: { fontFamily: font.medium, fontSize: fontSize.base, color: colors.muted, marginTop: spacing.sm },
});
