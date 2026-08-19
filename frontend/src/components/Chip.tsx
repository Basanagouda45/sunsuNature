import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, font, fontSize, radius, spacing } from '@/src/theme';

export function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.chip, active ? styles.active : styles.inactive]}
    >
      <Text style={[styles.text, { color: active ? colors.onBrand : colors.onSurfaceMuted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 1,
  },
  active: { backgroundColor: colors.brand, borderColor: colors.brand },
  inactive: { backgroundColor: colors.card, borderColor: colors.border },
  text: { fontFamily: font.semibold, fontSize: fontSize.base },
});
