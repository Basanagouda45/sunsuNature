import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/src/theme';

export function ScreenHeader({
  title,
  right,
  onBack,
  subtitle,
  testID,
}: {
  title: string;
  right?: React.ReactNode;
  onBack?: () => void;
  subtitle?: string;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.sm }]} testID={testID}>
      <Pressable
        style={styles.back}
        onPress={() => (onBack ? onBack() : router.back())}
        hitSlop={10}
        testID="header-back-button"
      >
        <Feather name="chevron-left" size={24} color={colors.onSurface} />
      </Pressable>
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1, alignItems: 'flex-start', paddingHorizontal: spacing.xs },
  title: { fontFamily: font.bold, fontSize: fontSize.xl, color: colors.onSurface },
  subtitle: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted, marginTop: 1 },
  right: { minWidth: 40, alignItems: 'flex-end', justifyContent: 'center' },
});
