import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, font, fontSize, radius, spacing, rupee } from '@/src/theme';
import { useFetch } from '@/src/hooks/useFetch';
import { api, ApiError } from '@/src/api/client';
import { Order } from '@/src/types';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Skeleton } from '@/src/components/Skeleton';
import { Button } from '@/src/components/Button';
import { useToast } from '@/src/context/ToastContext';
import { useState } from 'react';

export default function OrderTracking() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, loading, error, reload, setData } = useFetch<Order>(`/orders/${id}`, true, [id]);
  const { show } = useToast();
  const [cancelling, setCancelling] = useState(false);

  const cancel = async () => {
    setCancelling(true);
    try {
      const updated = await api.post<Order>(`/orders/${id}/cancel`, {}, true);
      setData(updated);
      show('Order cancelled', 'info');
    } catch (e) {
      show(e instanceof ApiError ? e.message : 'Could not cancel', 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.wrap}>
        <ScreenHeader title="Order Details" />
        <View style={{ padding: spacing.lg }}><Skeleton height={200} round={radius.md} /></View>
      </View>
    );
  }
  if (error || !order) {
    return (
      <View style={styles.wrap}>
        <ScreenHeader title="Order Details" />
        <View style={{ padding: spacing.xl, alignItems: 'center' }}>
          <Text style={styles.err}>{error || 'Order not found'}</Text>
          <Button title="Retry" onPress={reload} fullWidth={false} style={{ marginTop: spacing.lg }} />
        </View>
      </View>
    );
  }

  const flow = order.status_flow || ['Order Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
  const cancelled = order.status === 'Cancelled';
  const currentIdx = flow.indexOf(order.status);
  const canCancel = !cancelled && ![  'Delivered'].includes(order.status);

  return (
    <View style={styles.wrap}>
      <ScreenHeader title={`#${order.order_number}`} subtitle={order.status} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{cancelled ? 'Order Cancelled' : 'Order Status'}</Text>
          {!!order.estimated_delivery && !cancelled && (
            <Text style={styles.eta}>Estimated delivery by {order.estimated_delivery}</Text>
          )}
          {cancelled ? (
            <View style={styles.cancelledBox}>
              <Feather name="x-circle" size={20} color={colors.error} />
              <Text style={styles.cancelledText}>This order was cancelled.</Text>
            </View>
          ) : (
            <View style={{ marginTop: spacing.md }}>
              {flow.map((step, i) => {
                const done = i <= currentIdx;
                const active = i === currentIdx;
                return (
                  <View key={step} style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.node, done && styles.nodeDone, active && styles.nodeActive]}>
                        {done && <Feather name="check" size={12} color={colors.onBrand} />}
                      </View>
                      {i < flow.length - 1 && <View style={[styles.line, done && i < currentIdx && styles.lineDone]} />}
                    </View>
                    <View style={styles.timelineBody}>
                      <Text style={[styles.stepLabel, done && { color: colors.onSurface, fontFamily: font.bold }]}>{step}</Text>
                      {active && <Text style={styles.stepNow}>In progress</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          {!!order.tracking_number && <Text style={styles.tracking}>Tracking #: {order.tracking_number}</Text>}
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
          {order.items.map((it, i) => (
            <View key={i} style={styles.itemRow}>
              <Image source={{ uri: it.image }} style={styles.itemImg} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                <Text style={styles.itemMeta}>{it.weight} • Qty {it.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{rupee(it.price * it.quantity)}</Text>
            </View>
          ))}
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Text style={styles.addrName}>{order.address.full_name}</Text>
          <Text style={styles.addrText}>{order.address.house}, {order.address.street}{order.address.area ? `, ${order.address.area}` : ''}</Text>
          <Text style={styles.addrText}>{order.address.city}, {order.address.state} - {order.address.pincode}</Text>
          <Text style={styles.addrText}>Mobile: {order.address.mobile}</Text>
        </View>

        {/* Bill */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <Row label="Subtotal" value={rupee(order.subtotal)} />
          {order.coupon_discount > 0 && <Row label={`Coupon (${order.coupon_code})`} value={`- ${rupee(order.coupon_discount)}`} green />}
          <Row label="Shipping" value={order.shipping === 0 ? 'FREE' : rupee(order.shipping)} />
          <View style={styles.billDivider} />
          <Row label="Total" value={rupee(order.total)} bold />
          <View style={styles.payRow}>
            <Text style={styles.payMethod}>{order.payment_method === 'cod' ? 'Cash on Delivery' : 'Prepaid'}</Text>
            <Text style={[styles.payStatus, { color: order.payment_status === 'paid' ? colors.success : colors.warning }]}>{order.payment_status.toUpperCase()}</Text>
          </View>
        </View>

        {canCancel && <Button title="Cancel Order" variant="secondary" onPress={cancel} loading={cancelling} testID="cancel-order" style={{ marginTop: spacing.sm }} />}
        <Button title="Continue Shopping" variant="tertiary" onPress={() => router.push('/(tabs)/shop')} style={{ marginTop: spacing.sm }} />
      </ScrollView>
    </View>
  );
}

function Row({ label, value, green, bold }: { label: string; value: string; green?: boolean; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { fontFamily: font.bold, color: colors.onSurface, fontSize: fontSize.lg }]}>{label}</Text>
      <Text style={[styles.rowValue, green && { color: colors.success }, bold && { fontFamily: font.extrabold, fontSize: fontSize.lg }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  err: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurface },
  section: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { fontFamily: font.bold, fontSize: fontSize.lg, color: colors.onSurface, marginBottom: spacing.sm },
  eta: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.brand },
  cancelledBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  cancelledText: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.error },
  timelineRow: { flexDirection: 'row' },
  timelineLeft: { alignItems: 'center', width: 30 },
  node: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: colors.brand, borderColor: colors.brand },
  nodeActive: { borderColor: colors.brand, backgroundColor: colors.brand },
  line: { width: 2, flex: 1, backgroundColor: colors.border, minHeight: 26 },
  lineDone: { backgroundColor: colors.brand },
  timelineBody: { flex: 1, paddingBottom: spacing.lg, paddingLeft: spacing.md },
  stepLabel: { fontFamily: font.medium, fontSize: fontSize.base, color: colors.muted },
  stepNow: { fontFamily: font.semibold, fontSize: fontSize.xs, color: colors.brand, marginTop: 2 },
  tracking: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.onSurfaceMuted, marginTop: spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  itemImg: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  itemName: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  itemMeta: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  itemPrice: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  addrName: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  addrText: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.onSurfaceMuted, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  rowLabel: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.onSurfaceMuted },
  rowValue: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurface },
  billDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.sm },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  payMethod: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurface },
  payStatus: { fontFamily: font.bold, fontSize: fontSize.sm },
});
