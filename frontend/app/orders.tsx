import { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, font, fontSize, radius, spacing, rupee } from '@/src/theme';
import { useFetch } from '@/src/hooks/useFetch';
import { Order } from '@/src/types';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { EmptyState } from '@/src/components/EmptyState';
import { Skeleton } from '@/src/components/Skeleton';

const STATUS_COLOR: Record<string, string> = {
  'Order Placed': colors.info, Confirmed: colors.info, Packed: colors.warning,
  Shipped: colors.warning, 'Out for Delivery': colors.brand, Delivered: colors.success,
  Cancelled: colors.error, Refunded: colors.muted,
};

export default function Orders() {
  const router = useRouter();
  const { data, loading, error, reload } = useFetch<Order[]>('/orders', true);

  useFocusEffect(useCallback(() => { reload(); }, []));

  return (
    <View style={styles.wrap}>
      <ScreenHeader title="My Orders" />
      {loading ? (
        <View style={{ padding: spacing.lg }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} height={120} round={radius.md} style={{ marginBottom: spacing.md }} />)}
        </View>
      ) : error ? (
        <EmptyState icon="wifi-off" title="Couldn't load orders" subtitle={error} ctaTitle="Retry" onPress={reload} />
      ) : (data?.length || 0) === 0 ? (
        <EmptyState icon="package" title="No orders yet" subtitle="Your orders will appear here once you place them." ctaTitle="Start Shopping" onPress={() => router.push('/(tabs)/shop')} testID="orders-empty" />
      ) : (
        <FlatList
          data={data || []}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/order/${item.id}`)} testID={`order-${item.order_number}`}>
              <View style={styles.cardHead}>
                <View>
                  <Text style={styles.orderNum}>#{item.order_number}</Text>
                  <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] || colors.muted) + '22' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] || colors.muted }]}>{item.status}</Text>
                </View>
              </View>
              <View style={styles.thumbs}>
                {item.items.slice(0, 4).map((it, i) => (
                  <Image key={i} source={{ uri: it.image }} style={styles.thumb} contentFit="cover" />
                ))}
                {item.items.length > 4 && <View style={styles.more}><Text style={styles.moreText}>+{item.items.length - 4}</Text></View>}
              </View>
              <View style={styles.cardFoot}>
                <Text style={styles.total}>{rupee(item.total)}</Text>
                <View style={styles.trackBtn}><Text style={styles.trackText}>Track Order</Text><Feather name="chevron-right" size={16} color={colors.brand} /></View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNum: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  date: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  badgeText: { fontFamily: font.bold, fontSize: fontSize.xs },
  thumbs: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  thumb: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  more: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.onSurfaceMuted },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  total: { fontFamily: font.extrabold, fontSize: fontSize.lg, color: colors.onSurface },
  trackBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trackText: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.brand },
});
