import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { colors, font, fontSize, radius, shadow, spacing, rupee } from '@/src/theme';
import { useCart } from '@/src/context/CartContext';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { ApiError } from '@/src/api/client';
import { QuantityStepper } from '@/src/components/QuantityStepper';
import { EmptyState } from '@/src/components/EmptyState';
import { Button } from '@/src/components/Button';

export default function Cart() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, totals, updateQty, removeItem, applyCoupon, removeCoupon, refresh } = useCart();
  const { user, token } = useAuth();
  const { show } = useToast();
  const [coupon, setCoupon] = useState('');
  const [applying, setApplying] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (token) refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]),
  );

  const onApply = async () => {
    if (!token) {
      show('Please log in to apply coupons', 'info');
      router.push('/auth');
      return;
    }
    if (!coupon.trim()) return;
    setApplying(true);
    try {
      await applyCoupon(coupon.trim());
      show('Coupon applied!', 'success');
      setCoupon('');
    } catch (e) {
      show(e instanceof ApiError ? e.message : 'Invalid coupon', 'error');
    } finally {
      setApplying(false);
    }
  };

  const onCheckout = () => {
    if (!token) {
      router.push({ pathname: '/auth', params: { redirect: '/checkout' } });
      return;
    }
    router.push('/checkout');
  };

  const hasOutOfStock = items.some((i) => !i.in_stock);

  if (items.length === 0) {
    return (
      <View style={styles.wrap}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Text style={styles.title}>Cart</Text>
        </View>
        <EmptyState
          icon="shopping-bag"
          title={'Your cart is waiting for\nsomething delicious.'}
          subtitle="Explore our premium powders and blends."
          ctaTitle="Explore Products"
          onPress={() => router.push('/(tabs)/shop')}
          testID="cart-empty"
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>Cart</Text>
        <Text style={styles.count}>{totals.item_count} item{totals.item_count !== 1 ? 's' : ''}</Text>
      </View>

      <KeyboardAwareScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 180 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bottomOffset={24}>
        {/* Free shipping progress */}
        {totals.subtotal < totals.free_shipping_threshold && totals.subtotal > 0 && (
          <View style={styles.shipHint}>
            <Feather name="truck" size={16} color={colors.brand} />
            <Text style={styles.shipHintText}>
              Add {rupee(totals.free_shipping_threshold - totals.subtotal)} more for FREE shipping
            </Text>
          </View>
        )}

        {items.map((item) => (
          <View key={`${item.product_id}-${item.variant_id}`} style={styles.item} testID={`cart-item-${item.slug}`}>
            <Image source={{ uri: item.image }} style={styles.itemImg} contentFit="cover" />
            <View style={styles.itemBody}>
              <View style={styles.itemTop}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Pressable onPress={() => removeItem(item.product_id, item.variant_id)} hitSlop={8} testID={`cart-remove-${item.slug}`}>
                  <Feather name="trash-2" size={16} color={colors.muted} />
                </Pressable>
              </View>
              <Text style={styles.itemWeight}>{item.weight}</Text>
              {!item.in_stock && <Text style={styles.oos}>Out of stock — remove to checkout</Text>}
              <View style={styles.itemBottom}>
                <View style={styles.priceRow}>
                  <Text style={styles.itemPrice}>{rupee(item.price)}</Text>
                  {item.mrp > item.price && <Text style={styles.itemMrp}>{rupee(item.mrp)}</Text>}
                </View>
                <QuantityStepper
                  value={item.quantity}
                  min={1}
                  max={item.available_stock || 10}
                  size="sm"
                  onChange={(v) => updateQty(item.product_id, item.variant_id, v)}
                  testID={`cart-qty-${item.slug}`}
                />
              </View>
            </View>
          </View>
        ))}

        {/* Coupon */}
        <View style={styles.couponBox}>
          {totals.coupon_code ? (
            <View style={styles.couponApplied}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Feather name="check-circle" size={18} color={colors.success} />
                <Text style={styles.couponAppliedText}>{totals.coupon_code} applied</Text>
              </View>
              <Pressable onPress={removeCoupon} testID="coupon-remove">
                <Text style={styles.removeCoupon}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.couponInputRow}>
              <Feather name="tag" size={18} color={colors.brand} />
              <TextInput
                style={styles.couponInput}
                placeholder="Enter coupon code"
                placeholderTextColor={colors.muted}
                value={coupon}
                onChangeText={(t) => setCoupon(t.toUpperCase())}
                autoCapitalize="characters"
                testID="coupon-input"
              />
              <Button title="Apply" size="sm" fullWidth={false} loading={applying} onPress={onApply} testID="coupon-apply" />
            </View>
          )}
          <Pressable onPress={() => router.push('/coupons')} style={styles.viewCoupons} testID="view-coupons">
            <Text style={styles.viewCouponsText}>View available offers</Text>
            <Feather name="chevron-right" size={16} color={colors.brand} />
          </Pressable>
        </View>

        {/* Bill */}
        <View style={styles.bill}>
          <Text style={styles.billTitle}>Bill Details</Text>
          <Row label="Item total (MRP)" value={rupee(totals.mrp_total)} />
          {totals.product_discount > 0 && <Row label="Product discount" value={`- ${rupee(totals.product_discount)}`} green />}
          {totals.coupon_discount > 0 && <Row label={`Coupon (${totals.coupon_code})`} value={`- ${rupee(totals.coupon_discount)}`} green />}
          <Row label="Shipping" value={totals.shipping === 0 ? 'FREE' : rupee(totals.shipping)} green={totals.shipping === 0} />
          <View style={styles.billDivider} />
          <Row label="Grand Total" value={rupee(totals.total)} bold />
        </View>
      </KeyboardAwareScrollView>

      {/* Sticky checkout */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerTotal}>{rupee(totals.total)}</Text>
        </View>
        <Button
          title="Proceed to Checkout"
          onPress={onCheckout}
          disabled={hasOutOfStock}
          fullWidth={false}
          style={{ flex: 1, marginLeft: spacing.lg }}
          icon="arrow-right"
          testID="checkout-button"
        />
      </View>
    </View>
  );
}

function Row({ label, value, green, bold }: { label: string; value: string; green?: boolean; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { fontFamily: font.bold, fontSize: fontSize.lg, color: colors.onSurface }]}>{label}</Text>
      <Text style={[styles.rowValue, green && { color: colors.success }, bold && { fontFamily: font.extrabold, fontSize: fontSize.lg }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  title: { fontFamily: font.extrabold, fontSize: fontSize['2xl'], color: colors.onSurface },
  count: { fontFamily: font.medium, fontSize: fontSize.base, color: colors.muted },
  shipHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.brandSoft, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.md },
  shipHintText: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.brand },
  item: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, marginBottom: spacing.md, ...shadow.soft },
  itemImg: { width: 76, height: 76, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  itemBody: { flex: 1, marginLeft: spacing.md, justifyContent: 'space-between' },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemName: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface, flex: 1, marginRight: spacing.sm },
  itemWeight: { fontFamily: font.medium, fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  oos: { fontFamily: font.semibold, fontSize: fontSize.xs, color: colors.error, marginTop: 2 },
  itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  itemPrice: { fontFamily: font.extrabold, fontSize: fontSize.lg, color: colors.onSurface },
  itemMrp: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted, textDecorationLine: 'line-through' },
  couponBox: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.sm },
  couponInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  couponInput: { flex: 1, fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurface, paddingVertical: spacing.sm },
  couponApplied: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  couponAppliedText: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  removeCoupon: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.error },
  viewCoupons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  viewCouponsText: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.brand },
  bill: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginTop: spacing.md },
  billTitle: { fontFamily: font.bold, fontSize: fontSize.lg, color: colors.onSurface, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  rowLabel: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.onSurfaceMuted },
  rowValue: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurface },
  billDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.sm },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md, ...shadow.float },
  footerLabel: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.muted },
  footerTotal: { fontFamily: font.extrabold, fontSize: fontSize.xl, color: colors.onSurface },
});
