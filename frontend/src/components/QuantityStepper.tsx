import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, font, fontSize, radius, spacing } from '@/src/theme';

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  size = 'md',
  testID,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  testID?: string;
}) {
  const dim = size === 'sm' ? 30 : 38;
  const fs = size === 'sm' ? fontSize.base : fontSize.lg;

  const change = (next: number) => {
    if (next < min || next > max) return;
    Haptics.selectionAsync();
    onChange(next);
  };

  return (
    <View style={[styles.wrap, { height: dim }]} testID={testID}>
      <Pressable
        style={[styles.btn, { width: dim, height: dim }]}
        onPress={() => change(value - 1)}
        disabled={value <= min}
        testID={testID ? `${testID}-dec` : undefined}
      >
        <Feather name="minus" size={16} color={value <= min ? colors.muted : colors.brand} />
      </Pressable>
      <Text style={[styles.val, { fontSize: fs }]} testID={testID ? `${testID}-value` : undefined}>
        {value}
      </Text>
      <Pressable
        style={[styles.btn, { width: dim, height: dim }]}
        onPress={() => change(value + 1)}
        disabled={value >= max}
        testID={testID ? `${testID}-inc` : undefined}
      >
        <Feather name="plus" size={16} color={value >= max ? colors.muted : colors.brand} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: { alignItems: 'center', justifyContent: 'center' },
  val: { fontFamily: font.bold, color: colors.onSurface, minWidth: 26, textAlign: 'center' },
});
