import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, font, fontSize } from '@/src/theme';

export function SunLogo({ size = 22, color = colors.brand, dark = false }: { size?: number; color?: string; dark?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={[styles.mark, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, backgroundColor: dark ? colors.onInverse : colors.brandSoft }]}>
        <Feather name="sun" size={size - 4} color={dark ? colors.brand : colors.brand} />
      </View>
      <Text style={[styles.word, { fontSize: size + 2, color: dark ? colors.onInverse : colors.onSurface }]}>SUNSU</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { alignItems: 'center', justifyContent: 'center' },
  word: { fontFamily: font.extrabold, letterSpacing: 1.5 },
});
