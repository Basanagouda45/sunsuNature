import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, font, fontSize } from '@/src/theme';

export function Stars({ rating, size = 13, showValue = true, count }: { rating: number; size?: number; showValue?: boolean; count?: number }) {
  return (
    <View style={styles.row}>
      <Feather name="star" size={size} color={colors.star} style={{ marginTop: -1 }} />
      {showValue && <Text style={[styles.val, { fontSize: size }]}>{rating.toFixed(1)}</Text>}
      {typeof count === 'number' && <Text style={[styles.count, { fontSize: size - 1 }]}>({count})</Text>}
    </View>
  );
}

export function StarRow({ value, size = 26, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Feather
          key={i}
          name="star"
          size={size}
          color={i <= value ? colors.star : colors.border}
          onPress={onChange ? () => onChange(i) : undefined}
          suppressHighlighting
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  starRow: { flexDirection: 'row', gap: 8 },
  val: { fontFamily: font.semibold, color: colors.onSurface },
  count: { fontFamily: font.regular, color: colors.muted },
});
