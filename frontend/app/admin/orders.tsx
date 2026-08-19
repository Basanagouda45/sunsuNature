import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, font, fontSize, radius, spacing, rupee } from '@/src/theme';
import { useAdmin } from '@/src/context/AdminContext';
import { adminApi } from '@/src/api/admin';
import { Order } from '@/src/types';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Chip } from '@/src/components/Chip';
import { Skeleton } from '@/src/components/Skeleton';
import { EmptyState } from '@/src/components/EmptyState';

const FILTERS = ['All', 'Order Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
const STATUS_COLOR: Record<string, string> = {
  'Order Placed': colors.info, Confirmed: colors.info, Packed: colors.warning,
  Shipped: colors.warning, 'Out for Delivery': colors.brand, Delivered: colors.success,
  Cancelled: colors.error, Refunded: colors.muted,
};

export default function AdminOrders() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, ready } = useAdmin();
  const [filter, setFilter] = useState('All');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (ready && !token) router.replace('/admin'); }, [ready, token, router]);

  const load = async () => {
    setLoading(true);
    try {
      const q = filter === 'All' ? '' : `?status=${encodeURIComponent(filter)}`;
      setOrders(await adminApi.get<Order[]>(`/admin/orders${q}`));
    } catch {}
    setLoading(false);
  };
  useFocusEffect(useCallback(() => { if (token) load(); }, [token, filter]));

  return (
    <View style={styles.wrap}>
      <ScreenHeader title="Orders" onBack={() => router.replace('/admin/dashboard')} />
      <View style={styles.chipWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {FILTERS.map((f) => (
            <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} testID={`admin-filter-${f}`} />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.inner}>
          {[0, 1, 2].map((i) => <Skeleton key={i} height={110} round={radius.md} style={{ marginBottom: spacing.md }} />)}
        </View>
      ) : orders.length === 0 ? (
        <EmptyState icon="inbox" title="No orders" subtitle={`No ${filter === 'All' ? '' : filter + ' '}orders yet.`} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.inner}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/admin/order/${item.id}`)} testID={`admin-order-${item.order_number}`}>
              <View style={styles.cardHead}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={styles.orderNum}>#{item.order_number}</Text>
                  {item.status === 'Order Placed' && <View style={styles.newBadge}><Text style={styles.newText}>NEW</Text></View>}
                </View>
                <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] || colors.muted) + '22' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] || colors.muted }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.customer}>{item.address?.full_name} • {item.address?.mobile}</Text>
              <Text style={styles.meta}>{item.items.length} item(s) • {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              <View style={styles.cardFoot}>
                <Text style={styles.total}>{rupee(item.total)}</Text>
                <Text style={styles.pay}>{item.payment_method === 'cod' ? 'COD' : 'Prepaid'} • {item.payment_status}</Text>
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
  chipWrap: { backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  chipRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: spacing.md, alignSelf: 'center' },
  inner: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNum: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  newBadge: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  newText: { fontFamily: font.bold, fontSize: 9, color: colors.onAccent, letterSpacing: 0.5 },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { fontFamily: font.bold, fontSize: fontSize.xs },
  customer: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurface, marginTop: spacing.sm },
  meta: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  total: { fontFamily: font.extrabold, fontSize: fontSize.lg, color: colors.onSurface },
  pay: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.onSurfaceMuted, textTransform: 'capitalize' },
});
