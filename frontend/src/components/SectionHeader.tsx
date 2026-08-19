import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, font, fontSize, spacing } from '@/src/theme';

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  testID,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8} testID={testID}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: { fontFamily: font.bold, fontSize: fontSize.xl, color: colors.onSurface },
  action: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.brand },
});
