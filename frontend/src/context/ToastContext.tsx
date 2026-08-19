import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, fontSize, radius, spacing, shadow } from '@/src/theme';

type ToastType = 'success' | 'error' | 'info';
type ToastCtx = { show: (msg: string, type?: ToastType) => void };

const Ctx = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const timer = useRef<any>(null);

  const show = useCallback((message: string, t: ToastType = 'success') => {
    setMsg(message);
    setType(t);
    if (timer.current) clearTimeout(timer.current);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }),
    ]).start();
    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 220, useNativeDriver: true }),
      ]).start();
    }, 2600);
  }, [opacity, translateY]);

  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
  const bg = type === 'success' ? colors.brand : type === 'error' ? colors.error : colors.onSurface;

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.wrap,
          { top: insets.top + spacing.sm, opacity, transform: [{ translateY }] },
        ]}
      >
        {!!msg && (
          <View style={[styles.toast, { backgroundColor: bg }]} testID="app-toast">
            <Feather name={icon as any} size={18} color="#fff" />
            <Text style={styles.text}>{msg}</Text>
          </View>
        )}
      </Animated.View>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, zIndex: 9999, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    maxWidth: 460,
    ...shadow.float,
  },
  text: { color: '#fff', fontFamily: font.semibold, fontSize: fontSize.base, flexShrink: 1 },
});
