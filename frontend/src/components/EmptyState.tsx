import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, font, fontSize, spacing } from '@/src/theme';
import { Button } from './Button';

export function EmptyState({
  icon = 'inbox',
  title,
  subtitle,
  ctaTitle,
  onPress,
  testID,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  ctaTitle?: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.iconWrap}>
        <Feather name={icon} size={34} color={colors.brand} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {ctaTitle && onPress && (
        <View style={{ marginTop: spacing.lg }}>
          <Button title={ctaTitle} onPress={onPress} fullWidth={false} testID={testID ? `${testID}-cta` : undefined} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontFamily: font.bold, fontSize: fontSize.xl, color: colors.onSurface, textAlign: 'center' },
  subtitle: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.muted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 21 },
});
