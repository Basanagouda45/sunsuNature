import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, font, fontSize, radius, spacing, rupee } from '@/src/theme';
import { api, ApiError } from '@/src/api/client';
import { Address } from '@/src/types';
import { useCart } from '@/src/context/CartContext';
import { useToast } from '@/src/context/ToastContext';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Button } from '@/src/components/Button';

const STEPS = ['Address', 'Summary', 'Payment'];

export default function Checkout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, totals, refresh } = useCart();
  const { show } = useToast();

  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string | null>(null);
  const [payment, setPayment] = useState<'cod' | 'razorpay'>('cod');
  const [placing, setPlacing] = useState(false);

  const loadAddresses = async () => {
    try {
      const res = await api.get<Address[]>('/addresses', true);
      setAddresses(res);
      const def = res.find((a) => a.is_default) || res[0];
      if (def && !selectedAddr) setSelectedAddr(def.id);
    } catch {}
  };

  useFocusEffect(useCallback(() => { loadAddresses(); refresh(); /* eslint-disable-next-line */ }, []));

  const placeOrder = async () => {
    if (!selectedAddr) { show('Please select an address', 'error'); setStep(0); return; }
    setPlacing(true);
    try {
      const order = await api.post<{ id: string }>('/checkout', {
        address_id: selectedAddr,
        coupon_code: totals.coupon_code,
        payment_method: payment,
      }, true);
      show('Order placed!', 'success');
      router.replace(`/order-confirmation/${order.id}`);
    } catch (e) {
      show(e instanceof ApiError ? e.message : 'Order failed. Please try again.', 'error');
      if (e instanceof ApiError && e.status === 409) { refresh(); router.replace('/(tabs)/cart'); }
    } finally {
      setPlacing(false);
    }
  };

  const next = () => {
    if (step === 0 && !selectedAddr) { show('Select a delivery address', 'error'); return; }
    if (step < 2) setStep(step + 1);
    else placeOrder();
  };

  return (
    <View style={styles.wrap}>
      <ScreenHeader title="Checkout" onBack={() => (step > 0 ? setStep(step - 1) : router.back())} />

      {/* Stepper */}
      <View style={styles.stepper}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
              {i < step ? <Feather name="check" size={12} color={colors.onBrand} /> : <Text style={[styles.stepNum, i <= step && { color: colors.onBrand }]}>{i + 1}</Text>}
            </View>
            <Text style={[styles.stepLabel, i === step && { color: colors.brand, fontFamily: font.bold }]}>{s}</Text>
            {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && styles.stepLineActive]} />}
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <View>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <Pressable onPress={() => router.push('/addresses')} testID="checkout-manage-address"><Text style={styles.link}>+ Add New</Text></Pressable>
            </View>
            {addresses.length === 0 ? (
              <Pressable style={styles.addAddr} onPress={() => router.push('/addresses')} testID="checkout-add-address">
                <Feather name="plus-circle" size={20} color={colors.brand} />
                <Text style={styles.addAddrText}>Add a delivery address</Text>
              </Pressable>
            ) : (
              addresses.map((a) => (
                <Pressable key={a.id} style={[styles.addrCard, selectedAddr === a.id && styles.addrCardActive]} onPress={() => setSelectedAddr(a.id)} testID={`checkout-addr-${a.id}`}>
                  <Feather name={selectedAddr === a.id ? 'check-circle' : 'circle'} size={20} color={selectedAddr === a.id ? colors.brand : colors.border} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addrName}>{a.full_name} • {a.address_type}</Text>
                    <Text style={styles.addrText}>{a.house}, {a.street}, {a.city}, {a.state} - {a.pincode}</Text>
                    <Text style={styles.addrText}>Mobile: {a.mobile}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            {items.map((it) => (
              <View key={`${it.product_id}-${it.variant_id}`} style={styles.itemRow}>
                <Image source={{ uri: it.image }} style={styles.itemImg} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                  <Text style={styles.itemMeta}>{it.weight} • Qty {it.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>{rupee(it.line_total)}</Text>
              </View>
            ))}
            <View style={styles.bill}>
              <Row label="Item total (MRP)" value={rupee(totals.mrp_total)} />
              {totals.product_discount > 0 && <Row label="Discount" value={`- ${rupee(totals.product_discount)}`} green />}
              {totals.coupon_discount > 0 && <Row label={`Coupon (${totals.coupon_code})`} value={`- ${rupee(totals.coupon_discount)}`} green />}
              <Row label="Shipping" value={totals.shipping === 0 ? 'FREE' : rupee(totals.shipping)} green={totals.shipping === 0} />
              <View style={styles.billDivider} />
              <Row label="Total" value={rupee(totals.total)} bold />
            </View>
            {!totals.coupon_code && (
              <Pressable style={styles.couponPrompt} onPress={() => router.push('/(tabs)/cart')} testID="checkout-add-coupon">
                <Feather name="tag" size={16} color={colors.brand} />
                <Text style={styles.couponPromptText}>Have a coupon? Apply it in cart</Text>
              </Pressable>
            )}
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <Pressable style={[styles.payOption, payment === 'cod' && styles.payActive]} onPress={() => setPayment('cod')} testID="pay-cod">
              <Feather name={payment === 'cod' ? 'check-circle' : 'circle'} size={20} color={payment === 'cod' ? colors.brand : colors.border} />
              <View style={styles.payIcon}><Feather name="dollar-sign" size={18} color={colors.brand} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.payTitle}>Cash on Delivery</Text>
                <Text style={styles.paySub}>Pay when your order arrives</Text>
              </View>
            </Pressable>
            <View style={[styles.payOption, styles.payDisabled]}>
              <Feather name="circle" size={20} color={colors.border} />
              <View style={styles.payIcon}><Feather name="credit-card" size={18} color={colors.muted} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.payTitle, { color: colors.muted }]}>UPI / Cards / Netbanking</Text>
                <Text style={styles.paySub}>Online payment via Razorpay — coming soon</Text>
              </View>
            </View>
            <View style={styles.secureNote}>
              <Feather name="lock" size={14} color={colors.success} />
              <Text style={styles.secureText}>Payments are verified securely on our servers.</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View>
          <Text style={styles.footerLabel}>Payable</Text>
          <Text style={styles.footerTotal}>{rupee(totals.total)}</Text>
        </View>
        <Button
          title={step < 2 ? 'Continue' : 'Place Order'}
          onPress={next}
          loading={placing}
          fullWidth={false}
          style={{ flex: 1, marginLeft: spacing.lg }}
          icon={step < 2 ? 'arrow-right' : 'check'}
          testID="checkout-next"
        />
      </View>
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
  stepper: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  stepNum: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.muted },
  stepLabel: { fontFamily: font.medium, fontSize: fontSize.sm, color: colors.muted, marginLeft: spacing.sm },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  stepLineActive: { backgroundColor: colors.brand },
  sectionTitle: { fontFamily: font.bold, fontSize: fontSize.lg, color: colors.onSurface, marginBottom: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.brand },
  addAddr: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', padding: spacing.lg },
  addAddrText: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.brand },
  addrCard: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  addrCardActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft + '55' },
  addrName: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  addrText: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.onSurfaceMuted, marginTop: 2 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  itemImg: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  itemName: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  itemMeta: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  itemPrice: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  bill: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginTop: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  rowLabel: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.onSurfaceMuted },
  rowValue: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurface },
  billDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.sm },
  couponPrompt: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.brandSoft, borderRadius: radius.sm },
  couponPromptText: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.brand },
  payOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  payActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft + '55' },
  payDisabled: { opacity: 0.6 },
  payIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  payTitle: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  paySub: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  secureNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  secureText: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.onSurfaceMuted },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  footerLabel: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.muted },
  footerTotal: { fontFamily: font.extrabold, fontSize: fontSize.xl, color: colors.onSurface },
});
