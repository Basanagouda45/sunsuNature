import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { colors, font, fontSize, radius, spacing } from '@/src/theme';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'accent';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  testID?: string;
  style?: ViewStyle;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  fullWidth = true,
  size = 'md',
  testID,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  const pad = size === 'lg' ? spacing.lg : size === 'sm' ? spacing.sm : spacing.md;
  const fs = size === 'lg' ? fontSize.lg : size === 'sm' ? fontSize.base : fontSize.md;

  const palette =
    variant === 'primary'
      ? { bg: colors.brand, fg: colors.onBrand, border: 'transparent' }
      : variant === 'accent'
      ? { bg: colors.accent, fg: colors.onAccent, border: 'transparent' }
      : variant === 'secondary'
      ? { bg: 'transparent', fg: colors.brand, border: colors.brand }
      : { bg: 'transparent', fg: colors.brand, border: 'transparent' };

  return (
    <Pressable
      testID={testID}
      onPress={() => {
        if (isDisabled) return;
        Haptics.selectionAsync();
        onPress?.();
      }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          paddingVertical: pad,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.9 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: variant === 'tertiary' ? spacing.xs : spacing.xl,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {icon && <Feather name={icon} size={fs + 2} color={palette.fg} />}
          <Text style={[styles.text, { color: palette.fg, fontSize: fs }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { fontFamily: font.bold },
});
