import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { colors, font, fontSize, radius, spacing, rupee } from '@/src/theme';
import { useAdmin } from '@/src/context/AdminContext';
import { adminApi, AdminApiError } from '@/src/api/admin';
import { Order } from '@/src/types';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Skeleton } from '@/src/components/Skeleton';
import { Button } from '@/src/components/Button';
import { useToast } from '@/src/context/ToastContext';

const FLOW = ['Order Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];

export default function AdminOrderDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, ready } = useAdmin();
  const { show } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { if (ready && !token) router.replace('/admin'); }, [ready, token, router]);

  const load = async () => {
    setLoading(true);
    try {
      const o = await adminApi.get<Order>(`/admin/orders/${id}`);
      setOrder(o);
      setTracking(o.tracking_number || '');
    } catch {}
    setLoading(false);
  };
  useFocusEffect(useCallback(() => { if (token) load(); }, [token, id]));

  const updateStatus = async (status: string) => {
    setSaving(status);
    try {
      const updated = await adminApi.put<Order>(`/admin/orders/${id}/status`, { status, tracking_number: tracking || undefined });
      setOrder(updated);
      show(`Status updated to ${status}`, 'success');
    } catch (e) {
      show(e instanceof AdminApiError ? e.message : 'Update failed', 'error');
    } finally {
      setSaving(null);
    }
  };

  const saveTracking = async () => {
    if (!order) return;
    setSaving('tracking');
    try {
      const updated = await adminApi.put<Order>(`/admin/orders/${id}/status`, { status: order.status, tracking_number: tracking });
      setOrder(updated);
      show('Tracking number saved', 'success');
    } catch (e) {
      show('Could not save tracking', 'error');
    } finally {
      setSaving(null);
    }
  };

  if (loading || !order) {
    return (
      <View style={styles.wrap}>
        <ScreenHeader title="Order" onBack={() => router.replace('/admin/orders')} />
        <View style={styles.inner}><Skeleton height={200} round={radius.md} /></View>
      </View>
    );
  }

  const currentIdx = FLOW.indexOf(order.status);
  const isTerminal = order.status === 'Cancelled' || order.status === 'Refunded';
  const nextStatus = currentIdx >= 0 && currentIdx < FLOW.length - 1 ? FLOW[currentIdx + 1] : null;

  return (
    <View style={styles.wrap}>
      <ScreenHeader title={`#${order.order_number}`} subtitle={order.status} onBack={() => router.replace('/admin/orders')} />
      <ScrollView contentContainerStyle={styles.inner}>
        {/* Status management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update Order Status</Text>
          <Text style={styles.hint}>Customers see these updates live on their Track Order screen.</Text>
          {!isTerminal && nextStatus && (
            <Button
              title={`Advance to "${nextStatus}"`}
              icon="arrow-right-circle"
              onPress={() => updateStatus(nextStatus)}
              loading={saving === nextStatus}
              style={{ marginTop: spacing.md }}
              testID="admin-advance-status"
            />
          )}
          <View style={styles.statusGrid}>
            {FLOW.map((s, i) => {
              const done = i <= currentIdx && !isTerminal;
              const active = i === currentIdx && !isTerminal;
              return (
                <Pressable
                  key={s}
                  style={[styles.statusChip, active && styles.statusActive, done && styles.statusDone]}
                  onPress={() => updateStatus(s)}
                  disabled={saving !== null}
                  testID={`admin-status-${s}`}
                >
                  {done && <Feather name="check" size={12} color={colors.onBrand} />}
                  <Text style={[styles.statusText, (done || active) && { color: colors.onBrand }]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.terminalRow}>
            <Button title="Cancel Order" variant="secondary" size="sm" onPress={() => updateStatus('Cancelled')} loading={saving === 'Cancelled'} style={{ flex: 1 }} testID="admin-cancel" />
            <Button title="Mark Refunded" variant="secondary" size="sm" onPress={() => updateStatus('Refunded')} loading={saving === 'Refunded'} style={{ flex: 1 }} testID="admin-refund" />
          </View>
        </View>

        {/* Tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tracking Number</Text>
          <View style={styles.trackRow}>
            <TextInput style={styles.input} value={tracking} onChangeText={setTracking} placeholder="e.g. SUNSU-DEL-12345" placeholderTextColor={colors.muted} testID="admin-tracking-input" />
            <Button title="Save" size="sm" fullWidth={false} onPress={saveTracking} loading={saving === 'tracking'} testID="admin-tracking-save" />
          </View>
        </View>

        {/* Customer & address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer & Delivery</Text>
          <Text style={styles.name}>{order.address.full_name}</Text>
          <Text style={styles.addr}>{order.address.mobile}</Text>
          <Text style={styles.addr}>{order.address.house}, {order.address.street}{order.address.area ? `, ${order.address.area}` : ''}</Text>
          <Text style={styles.addr}>{order.address.city}, {order.address.state} - {order.address.pincode}</Text>
          {!!order.estimated_delivery && <Text style={styles.eta}>Est. delivery: {order.estimated_delivery}</Text>}
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
          <View style={styles.billDivider} />
          <Row label="Subtotal" value={rupee(order.subtotal)} />
          {order.coupon_discount > 0 && <Row label={`Coupon (${order.coupon_code})`} value={`- ${rupee(order.coupon_discount)}`} />}
          <Row label="Shipping" value={order.shipping === 0 ? 'FREE' : rupee(order.shipping)} />
          <Row label="Total" value={rupee(order.total)} bold />
          <View style={styles.payRow}>
            <Text style={styles.payMethod}>{order.payment_method === 'cod' ? 'Cash on Delivery' : 'Prepaid'}</Text>
            <Text style={[styles.payStatus, { color: order.payment_status === 'paid' ? colors.success : colors.warning }]}>{order.payment_status.toUpperCase()}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { fontFamily: font.bold, color: colors.onSurface }]}>{label}</Text>
      <Text style={[styles.rowValue, bold && { fontFamily: font.extrabold, fontSize: fontSize.lg }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  inner: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.xxxl },
  section: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { fontFamily: font.bold, fontSize: fontSize.lg, color: colors.onSurface },
  hint: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  statusActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  statusDone: { backgroundColor: colors.success, borderColor: colors.success },
  statusText: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.onSurfaceMuted },
  terminalRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  trackRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.md },
  input: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 46, fontFamily: font.medium, fontSize: fontSize.base, color: colors.onSurface },
  name: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface, marginTop: spacing.sm },
  addr: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.onSurfaceMuted, marginTop: 2 },
  eta: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.brand, marginTop: spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  itemImg: { width: 46, height: 46, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  itemName: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  itemMeta: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  itemPrice: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  billDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  rowLabel: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.onSurfaceMuted },
  rowValue: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurface },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  payMethod: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurface },
  payStatus: { fontFamily: font.bold, fontSize: fontSize.sm },
});
