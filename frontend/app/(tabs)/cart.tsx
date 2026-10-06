import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, useWindowDimensions } from 'react-native';
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
import Footer from './footer';

export default function Cart() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

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
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <EmptyState
            icon="shopping-bag"
            title={'Your cart is waiting for\nsomething delicious.'}
            subtitle="Explore our premium powders and blends."
            ctaTitle="Explore Products"
            onPress={() => router.push('/(tabs)/shop')}
            testID="cart-empty"
          />
          <Footer />
        </ScrollView>
      </View>
    );
  }

  const totalSavings = totals.product_discount + totals.coupon_discount;

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerInner}>
          <Text style={styles.title}>Cart</Text>
          <Text style={styles.count}>{totals.item_count} item{totals.item_count !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      <KeyboardAwareScrollView 
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled" 
        bottomOffset={24}
      >
        <View style={[styles.container, isDesktop && styles.containerDesktop]}>
          
          {/* LEFT COLUMN: Items & Coupons */}
          <View style={[styles.leftCol, isDesktop && styles.leftColDesktop]}>
            {/* Free shipping progress */}
            {totals.subtotal < totals.free_shipping_threshold && totals.subtotal > 0 && (
              <View style={styles.shipHint}>
                <Feather name="truck" size={16} color={colors.brand} />
                <Text style={styles.shipHintText}>
                  Add {rupee(totals.free_shipping_threshold - totals.subtotal)} more for FREE shipping
                </Text>
              </View>
            )}

            {/* Main items card mimicking reference layout */}
            <View style={styles.itemsCard}>
              {items.map((item, index) => (
                <View 
                  key={`${item.product_id}-${item.variant_id}`} 
                  style={[styles.item, index < items.length - 1 && styles.itemBorder]} 
                  testID={`cart-item-${item.slug}`}
                >
                  <Image source={{ uri: item.image }} style={styles.itemImg} contentFit="cover" />
                  <View style={styles.itemBody}>
                    <View style={styles.itemTop}>
                      <View style={{ flex: 1, marginRight: spacing.sm }}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.itemWeight}>{item.weight}</Text>
                      </View>
                      <View style={styles.priceCol}>
                        <Text style={styles.itemPrice}>{rupee(item.price)}</Text>
                        {item.mrp > item.price && <Text style={styles.itemMrp}>{rupee(item.mrp)}</Text>}
                      </View>
                    </View>

                    {!item.in_stock && <Text style={styles.oos}>Out of stock — remove to checkout</Text>}
                    
                    <View style={styles.itemBottom}>
                      <Pressable 
                        style={styles.trashBtn} 
                        onPress={() => removeItem(item.product_id, item.variant_id)} 
                        hitSlop={8} 
                        testID={`cart-remove-${item.slug}`}
                      >
                        <Feather name="trash-2" size={18} color={colors.muted} />
                      </Pressable>
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
            </View>

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
          </View>

          {/* RIGHT COLUMN: Bill Details & Checkout (Sticky on Desktop) */}
          <View style={[styles.rightCol, isDesktop && styles.rightColDesktop]}>
            <View style={styles.bill}>
              <Text style={styles.billTitle}>Bill Details</Text>
              
              <Row label="Item total" value={rupee(totals.subtotal)} />
              {totals.coupon_discount > 0 && <Row label={`Coupon (${totals.coupon_code})`} value={`- ${rupee(totals.coupon_discount)}`} green />}
              <Row label="Shipping" value={totals.shipping === 0 ? 'FREE' : rupee(totals.shipping)} green={totals.shipping === 0} />
              
              {totalSavings > 0 && (
                <View style={styles.savingsBox}>
                  <Text style={styles.savingsText}>You saved {rupee(totalSavings)} on this order!</Text>
                </View>
              )}

              <View style={styles.billDivider} />
              <Row label="Grand Total" value={rupee(totals.total)} bold />

              {/* Desktop Checkout Button inside Bill summary block */}
              {isDesktop && (
                <View style={{ marginTop: spacing.lg }}>
                  <Button
                    title="Proceed to Checkout"
                    onPress={onCheckout}
                    disabled={hasOutOfStock}
                    fullWidth
                    icon="arrow-right"
                    testID="checkout-button-desktop"
                  />
                </View>
              )}
            </View>
          </View>

        </View>

        {/* Footer placed inside scroll view */}
        <View style={{ marginTop: spacing.xxl }}>
          <Footer />
        </View>
      </KeyboardAwareScrollView>

      {/* Sticky checkout bar for MOBILE only */}
      {!isDesktop && (
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
      )}
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
  wrap: { flex: 1, backgroundColor: '#FFFFFF' }, // Page background set to white
  header: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: '#FFFFFF' },
  headerInner: { width: '100%', maxWidth: 1280, alignSelf: 'center', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontFamily: font.extrabold, fontSize: fontSize['2xl'], color: colors.onSurface },
  count: { fontFamily: font.medium, fontSize: fontSize.base, color: colors.muted },
  
  scrollContent: { padding: spacing.lg, paddingBottom: 220, backgroundColor: '#FFFFFF' },
  scrollContentDesktop: { padding: spacing.xl, paddingBottom: 100, backgroundColor: '#FFFFFF' },

  container: { width: '100%', maxWidth: 1280, alignSelf: 'center' },
  containerDesktop: { flexDirection: 'row', gap: 32, alignItems: 'flex-start' },

  leftCol: { width: '100%' },
  leftColDesktop: { flex: 1 },

  rightCol: { width: '100%', marginTop: spacing.md },
  rightColDesktop: { width: 380, marginTop: 0, position: 'sticky' as any, top: 24 },

  shipHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.brandSoft, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.md },
  shipHintText: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.brand },
  
  // Item card background set to #F8F9FA
  itemsCard: { backgroundColor: '#F8F9FA', borderRadius: radius.lg, borderWidth: 1, borderColor: '#E9ECEF', marginBottom: spacing.md, overflow: 'hidden' },
  item: { flexDirection: 'row', padding: spacing.md, backgroundColor: '#F8F9FA', alignItems: 'center' },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#E9ECEF' },
  
  itemImg: { width: 78, height: 78, borderRadius: radius.md, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  itemBody: { flex: 1, marginLeft: spacing.md },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  itemName: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  itemWeight: { fontFamily: font.medium, fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  
  priceCol: { alignItems: 'flex-end' },
  itemPrice: { fontFamily: font.extrabold, fontSize: fontSize.base, color: colors.onSurface },
  itemMrp: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.muted, textDecorationLine: 'line-through', marginTop: 2 },

  oos: { fontFamily: font.semibold, fontSize: fontSize.xs, color: colors.error, marginTop: 2 },
  itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  
  trashBtn: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },

  couponBox: { backgroundColor: '#F8F9FA', borderRadius: radius.lg, borderWidth: 1, borderColor: '#E9ECEF', padding: spacing.md, marginTop: spacing.sm },
  couponInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  couponInput: { flex: 1, fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurface, paddingVertical: spacing.sm },
  couponApplied: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  couponAppliedText: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  removeCoupon: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.error },
  viewCoupons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  viewCouponsText: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.brand },
  
  bill: { backgroundColor: '#F8F9FA', borderRadius: radius.lg, borderWidth: 1, borderColor: '#E9ECEF', padding: spacing.lg },
  billTitle: { fontFamily: font.bold, fontSize: fontSize.lg, color: colors.onSurface, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  rowLabel: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.onSurfaceMuted },
  rowValue: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurface },
  billDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.sm },
  
  savingsBox: { backgroundColor: colors.brandSoft, borderRadius: radius.sm, padding: spacing.sm, marginVertical: spacing.xs, alignItems: 'center' },
  savingsText: { fontFamily: font.semibold, fontSize: fontSize.xs, color: colors.brand },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md, ...shadow.float },
  footerLabel: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.muted },
  footerTotal: { fontFamily: font.extrabold, fontSize: fontSize.xl, color: colors.onSurface },
});