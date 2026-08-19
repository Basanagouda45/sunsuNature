import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors, font, fontSize, radius, spacing, rupee } from '@/src/theme';
import { useFetch } from '@/src/hooks/useFetch';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Skeleton } from '@/src/components/Skeleton';
import { useToast } from '@/src/context/ToastContext';

type Coupon = { code: string; description?: string; discount_type: string; discount_value: number; min_order: number; max_discount?: number };

export default function Coupons() {
  const { data, loading } = useFetch<Coupon[]>('/coupons', false);
  const { show } = useToast();

  const copy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    show(`Copied ${code}`, 'success');
  };

  return (
    <View style={styles.wrap}>
      <ScreenHeader title="Coupons & Offers" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <Text style={styles.intro}>Apply these codes at checkout to save on your order.</Text>
        {loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} height={110} round={radius.md} style={{ marginBottom: spacing.md }} />)
        ) : (
          (data || []).map((c) => (
            <View key={c.code} style={styles.card} testID={`coupon-${c.code}`}>
              <View style={styles.left}>
                <Feather name="tag" size={22} color={colors.brand} />
              </View>
              <View style={styles.body}>
                <View style={styles.codeRow}>
                  <Text style={styles.code}>{c.code}</Text>
                  <Pressable onPress={() => copy(c.code)} style={styles.copyBtn} testID={`copy-${c.code}`}>
                    <Feather name="copy" size={13} color={colors.brand} />
                    <Text style={styles.copyText}>Copy</Text>
                  </Pressable>
                </View>
                <Text style={styles.desc}>{c.description}</Text>
                {c.min_order > 0 && <Text style={styles.min}>Min. order {rupee(c.min_order)}</Text>}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  intro: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.muted, marginBottom: spacing.lg },
  card: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, overflow: 'hidden' },
  left: { width: 60, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, padding: spacing.md },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  code: { fontFamily: font.extrabold, fontSize: fontSize.lg, color: colors.onSurface, letterSpacing: 1 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.brand, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  copyText: { fontFamily: font.bold, fontSize: fontSize.xs, color: colors.brand },
  desc: { fontFamily: font.medium, fontSize: fontSize.base, color: colors.onSurfaceMuted, marginTop: 4 },
  min: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.muted, marginTop: 4 },
});
