import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, font, fontSize, radius, spacing, rupee } from '@/src/theme';
import { useFetch } from '@/src/hooks/useFetch';
import { Order } from '@/src/types';
import { Button } from '@/src/components/Button';
import { Skeleton } from '@/src/components/Skeleton';

export default function OrderConfirmation() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, loading } = useFetch<Order>(`/orders/${id}`, true, [id]);
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (order) Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  }, [order, scale]);

  if (loading || !order) {
    return (
      <View style={[styles.wrap, { paddingTop: insets.top + 60 }]}>
        <Skeleton height={120} width={120} round={60} style={{ alignSelf: 'center' }} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.xxl, paddingBottom: spacing.xxxl, paddingHorizontal: spacing.lg }}>
        <Animated.View style={[styles.checkWrap, { transform: [{ scale }] }]}>
          <View style={styles.check}><Feather name="check" size={44} color={colors.onBrand} /></View>
        </Animated.View>
        <Text style={styles.title}>Order Placed Successfully!</Text>
        <Text style={styles.sub}>Thank you for shopping with SUNSU. We’re preparing your goodness.</Text>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Order Number</Text>
            <Text style={styles.value}>#{order.order_number}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Estimated Delivery</Text>
            <Text style={styles.value}>{order.estimated_delivery}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Payment</Text>
            <Text style={styles.value}>{order.payment_method === 'cod' ? 'Cash on Delivery' : 'Prepaid'}</Text>
          </View>
          <View style={[styles.cardRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider, paddingTop: spacing.md }]}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.total}>{rupee(order.total)}</Text>
          </View>
        </View>

        <View style={styles.deliverCard}>
          <Feather name="map-pin" size={16} color={colors.brand} />
          <Text style={styles.deliverText}>Delivering to {order.address.full_name}, {order.address.city} - {order.address.pincode}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title="Track Order" onPress={() => router.replace(`/order/${order.id}`)} testID="confirm-track" />
        <Button title="Continue Shopping" variant="secondary" onPress={() => router.replace('/(tabs)')} testID="confirm-continue" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  checkWrap: { alignItems: 'center', marginBottom: spacing.xl },
  check: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.extrabold, fontSize: fontSize['3xl'], color: colors.onSurface, textAlign: 'center' },
  sub: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.muted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 21, paddingHorizontal: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginTop: spacing.xl, gap: spacing.md },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.muted },
  value: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  totalLabel: { fontFamily: font.bold, fontSize: fontSize.lg, color: colors.onSurface },
  total: { fontFamily: font.extrabold, fontSize: fontSize.xl, color: colors.brand },
  deliverCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.brandSoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  deliverText: { flex: 1, fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.brand },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surface },
});
