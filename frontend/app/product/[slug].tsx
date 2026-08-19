import { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Modal, FlatList, Share, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { colors, font, fontSize, radius, shadow, spacing, rupee } from '@/src/theme';
import { api, ApiError } from '@/src/api/client';
import { Product, Variant } from '@/src/types';
import { useFetch } from '@/src/hooks/useFetch';
import { useCart } from '@/src/context/CartContext';
import { useWishlist } from '@/src/context/WishlistContext';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { Button } from '@/src/components/Button';
import { QuantityStepper } from '@/src/components/QuantityStepper';
import { Stars, StarRow } from '@/src/components/Stars';
import { Skeleton } from '@/src/components/Skeleton';
import { ProductCard } from '@/src/components/ProductCard';

const { width } = Dimensions.get('window');

function Accordion({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <View style={styles.accordion}>
      <Pressable style={styles.accordionHead} onPress={() => { Haptics.selectionAsync(); setOpen(!open); }} testID={`accordion-${title}`}>
        <Text style={styles.accordionTitle}>{title}</Text>
        <Feather name={open ? 'minus' : 'plus'} size={20} color={colors.brand} />
      </Pressable>
      {open && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
}

export default function ProductDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: product, loading, error, reload } = useFetch<Product>(`/products/${slug}`, false, [slug]);
  const { addItem } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const { token } = useAuth();
  const { show } = useToast();

  const [variant, setVariant] = useState<Variant | null>(null);
  const [qty, setQty] = useState(1);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState<number | null>(null);
  const [pincode, setPincode] = useState('');
  const [pinResult, setPinResult] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // reviews
  const reviewsData = useFetch<{ reviews: any[]; count: number; average: number; distribution: any }>(
    product ? `/products/${product.id}/reviews` : null, false, [product?.id],
  );
  const reviewSheet = useRef<BottomSheet>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const activeVariant = variant || product?.variants?.[0] || null;
  const discount = activeVariant && activeVariant.mrp > activeVariant.price
    ? Math.round(((activeVariant.mrp - activeVariant.price) / activeVariant.mrp) * 100) : 0;

  const onAdd = async (buyNow = false) => {
    if (!product || !activeVariant) return;
    setAdding(true);
    try {
      await addItem(product, activeVariant, qty);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (buyNow) {
        router.push('/(tabs)/cart');
      } else {
        show(`${product.name} added to cart`, 'success');
      }
    } catch (e) {
      show(e instanceof ApiError ? e.message : 'Could not add to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  const checkPin = async () => {
    if (pincode.length !== 6) { setPinResult('Enter a valid 6-digit PIN'); return; }
    try {
      const res = await api.get(`/location/pincode/${pincode}`);
      setPinResult(`Deliverable to ${res.city} • Est. delivery by ${res.estimated_delivery}`);
    } catch (e) {
      setPinResult(e instanceof ApiError ? e.message : 'Not serviceable');
    }
  };

  const onShare = async () => {
    if (!product) return;
    await Share.share({ message: `Check out ${product.name} from SUNSU — ${product.tagline}. sunsu://product/${product.slug}` });
  };

  const submitReview = async () => {
    if (!token) { router.push('/auth'); return; }
    if (!product) return;
    try {
      await api.post(`/products/${product.id}/reviews`, { rating, comment: reviewText }, true);
      show('Thanks for your review!', 'success');
      setReviewText('');
      reviewSheet.current?.close();
      reviewsData.reload();
      reload();
    } catch (e) {
      show(e instanceof ApiError ? e.message : 'Could not submit review', 'error');
    }
  };

  if (loading) {
    return (
      <View style={styles.wrap}>
        <Skeleton height={width} />
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Skeleton height={26} width={'70%'} />
          <Skeleton height={16} width={'50%'} />
          <Skeleton height={40} width={'40%'} />
        </View>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.wrap, { justifyContent: 'center', alignItems: 'center', padding: spacing.xl }]}>
        <Feather name="alert-circle" size={40} color={colors.muted} />
        <Text style={styles.errText}>{error || 'Product not found'}</Text>
        <Button title="Retry" onPress={reload} fullWidth={false} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  const wishlisted = isWishlisted(product.id);

  return (
    <View style={styles.wrap}>
      {/* floating top bar */}
      <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
        <Pressable style={styles.circleBtn} onPress={() => router.back()} testID="pdp-back">
          <Feather name="chevron-left" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Pressable style={styles.circleBtn} onPress={onShare} testID="pdp-share">
            <Feather name="share-2" size={18} color={colors.onSurface} />
          </Pressable>
          <Pressable style={styles.circleBtn} onPress={async () => { const a = await toggle(product); show(a ? 'Saved to wishlist' : 'Removed', a ? 'success' : 'info'); }} testID="pdp-wishlist">
            <Feather name="heart" size={18} color={wishlisted ? colors.accent : colors.onSurface} />
          </Pressable>
        </View>
      </View>

      <KeyboardAwareScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled" bottomOffset={24}>
        {/* Gallery */}
        <View>
          <FlatList
            data={product.images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={(e) => setGalleryIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item, index }) => (
              <Pressable onPress={() => setFullscreen(index)}>
                <Image source={{ uri: item }} style={{ width, height: width }} contentFit="cover" transition={200} />
              </Pressable>
            )}
          />
          {discount > 0 && (
            <View style={styles.pdpDiscount}>
              <Text style={styles.pdpDiscountText}>{discount}% OFF</Text>
            </View>
          )}
          <View style={styles.dots}>
            {product.images.map((_, i) => (
              <View key={i} style={[styles.dot, i === galleryIndex && styles.dotActive]} />
            ))}
          </View>
        </View>

        {/* Thumbnails */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
          {product.images.map((img, i) => (
            <Pressable key={i} onPress={() => setFullscreen(i)} style={[styles.thumb, i === galleryIndex && styles.thumbActive]}>
              <Image source={{ uri: img }} style={styles.thumbImg} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.info}>
          <Text style={styles.catLabel}>{product.category_name}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.tagline}>{product.tagline}</Text>
          <View style={styles.ratingRow}>
            <Stars rating={product.rating} size={15} count={product.review_count} />
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{activeVariant && rupee(activeVariant.price)}</Text>
            {discount > 0 && activeVariant && <Text style={styles.mrp}>{rupee(activeVariant.mrp)}</Text>}
            {discount > 0 && <Text style={styles.save}>Save {rupee((activeVariant!.mrp - activeVariant!.price) * qty)}</Text>}
          </View>
          <Text style={styles.taxNote}>Inclusive of all taxes</Text>

          {/* Variants */}
          <Text style={styles.sectionLabel}>Select Size</Text>
          <View style={styles.variants}>
            {product.variants.map((v) => {
              const active = activeVariant?.id === v.id;
              const out = v.stock <= 0;
              return (
                <Pressable
                  key={v.id}
                  disabled={out}
                  style={[styles.variantChip, active && styles.variantActive, out && styles.variantOut]}
                  onPress={() => { Haptics.selectionAsync(); setVariant(v); }}
                  testID={`variant-${v.id}`}
                >
                  <Text style={[styles.variantWeight, active && { color: colors.brand }]}>{v.weight}</Text>
                  <Text style={[styles.variantPrice, active && { color: colors.brand }]}>{rupee(v.price)}</Text>
                  {out && <Text style={styles.variantOutText}>Out of stock</Text>}
                </Pressable>
              );
            })}
          </View>

          {/* Quantity */}
          <View style={styles.qtyRow}>
            <Text style={styles.sectionLabel}>Quantity</Text>
            <QuantityStepper value={qty} min={1} max={activeVariant?.stock || 10} onChange={setQty} testID="pdp-qty" />
          </View>

          {/* PIN checker */}
          <View style={styles.pinBox}>
            <Feather name="map-pin" size={18} color={colors.brand} />
            <TextInput
              style={styles.pinInput}
              placeholder="Enter PIN code to check delivery"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={6}
              value={pincode}
              onChangeText={(t) => setPincode(t.replace(/[^0-9]/g, ''))}
              testID="pin-input"
            />
            <Pressable onPress={checkPin} testID="pin-check"><Text style={styles.pinCheck}>Check</Text></Pressable>
          </View>
          {pinResult && <Text style={styles.pinResult}>{pinResult}</Text>}

          <Text style={styles.description}>{product.description}</Text>

          {/* Accordions */}
          <View style={{ marginTop: spacing.lg }}>
            <Accordion title="What's Inside?" defaultOpen>
              <View style={styles.pillRow}>
                {product.ingredients.map((ing) => (
                  <View key={ing} style={styles.pill}><Text style={styles.pillText}>{ing}</Text></View>
                ))}
              </View>
            </Accordion>
            <Accordion title="Nutritional Information">
              {product.nutrition.map((n) => (
                <View key={n.label} style={styles.nutriRow}>
                  <Text style={styles.nutriLabel}>{n.label}</Text>
                  <Text style={styles.nutriValue}>{n.value}</Text>
                </View>
              ))}
              <Text style={styles.nutriNote}>* Approx. values per 100g</Text>
            </Accordion>
            <Accordion title="Benefits">
              {product.benefits.map((b) => (
                <View key={b} style={styles.bullet}><Feather name="check" size={15} color={colors.brand} /><Text style={styles.bulletText}>{b}</Text></View>
              ))}
            </Accordion>
            <Accordion title="How To Use">
              {product.how_to_use.map((h) => (
                <View key={h} style={styles.bullet}><Feather name="chevron-right" size={15} color={colors.brand} /><Text style={styles.bulletText}>{h}</Text></View>
              ))}
            </Accordion>
            <Accordion title="Storage & Shelf Life">
              <Text style={styles.bodyText}>{product.storage}</Text>
              <Text style={[styles.bodyText, { marginTop: spacing.sm }]}>Shelf life: {product.shelf_life}</Text>
            </Accordion>
            <Accordion title="Allergen Information">
              <Text style={styles.bodyText}>{product.allergen_info}</Text>
            </Accordion>
            <Accordion title="FAQ">
              {product.faqs.map((f) => (
                <View key={f.q} style={{ marginBottom: spacing.md }}>
                  <Text style={styles.faqQ}>{f.q}</Text>
                  <Text style={styles.faqA}>{f.a}</Text>
                </View>
              ))}
            </Accordion>
          </View>

          {/* Reviews */}
          <View style={styles.reviewsHead}>
            <Text style={styles.reviewsTitle}>Ratings & Reviews</Text>
            <Pressable onPress={() => reviewSheet.current?.expand()} testID="write-review"><Text style={styles.writeReview}>Write a review</Text></Pressable>
          </View>
          <View style={styles.reviewSummary}>
            <View style={styles.avgBox}>
              <Text style={styles.avgNum}>{(reviewsData.data?.average || product.rating).toFixed(1)}</Text>
              <Stars rating={reviewsData.data?.average || product.rating} size={13} showValue={false} />
              <Text style={styles.avgCount}>{reviewsData.data?.count ?? product.review_count} reviews</Text>
            </View>
          </View>
          {(reviewsData.data?.reviews || []).slice(0, 3).map((r) => (
            <View key={r.id} style={styles.reviewItem}>
              <View style={styles.reviewItemHead}>
                <Text style={styles.reviewer}>{r.user_name}</Text>
                {r.verified_purchase && <View style={styles.verified}><Feather name="check-circle" size={11} color={colors.success} /><Text style={styles.verifiedText}>Verified</Text></View>}
              </View>
              <Stars rating={r.rating} size={12} showValue={false} />
              {!!r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
            </View>
          ))}

          {/* Related */}
          {product.related && product.related.length > 0 && (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={styles.reviewsTitle}>You May Also Like</Text>
              <FlatList
                horizontal
                data={product.related}
                keyExtractor={(p) => p.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: spacing.md }}
                renderItem={({ item }) => (
                  <View style={{ marginRight: spacing.md }}><ProductCard product={item} width={160} /></View>
                )}
              />
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* Sticky Add to cart */}
      <View style={[styles.stickyBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title="Add to Cart" variant="secondary" onPress={() => onAdd(false)} loading={adding} style={{ flex: 1 }} testID="pdp-add-cart" />
        <Button title="Buy Now" onPress={() => onAdd(true)} style={{ flex: 1 }} testID="pdp-buy-now" />
      </View>

      {/* Fullscreen gallery */}
      <Modal visible={fullscreen !== null} transparent animationType="fade" onRequestClose={() => setFullscreen(null)}>
        <View style={styles.fullscreen}>
          <Pressable style={[styles.fsClose, { top: insets.top + spacing.md }]} onPress={() => setFullscreen(null)} testID="fullscreen-close">
            <Feather name="x" size={26} color="#fff" />
          </Pressable>
          <FlatList
            data={product.images}
            horizontal
            pagingEnabled
            initialScrollIndex={fullscreen || 0}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(_, i) => String(i)}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.fsImgWrap}>
                <Image source={{ uri: item }} style={{ width, height: width }} contentFit="contain" />
              </View>
            )}
          />
        </View>
      </Modal>

      {/* Review sheet */}
      <BottomSheet
        ref={reviewSheet}
        index={-1}
        snapPoints={[420]}
        enablePanDownToClose
        keyboardBehavior="interactive"
        backdropComponent={(p) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />}
        handleIndicatorStyle={{ backgroundColor: colors.borderStrong }}
        backgroundStyle={{ backgroundColor: colors.card }}
      >
        <KeyboardAwareScrollView ScrollViewComponent={BottomSheetScrollView} contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled" bottomOffset={24}>
          <Text style={styles.sheetTitle}>Write a Review</Text>
          <Text style={styles.inputLabel}>Your rating</Text>
          <View style={{ marginVertical: spacing.md }}><StarRow value={rating} onChange={setRating} /></View>
          <Text style={styles.inputLabel}>Your review</Text>
          <TextInput
            style={styles.reviewInput}
            placeholder="Share your experience..."
            placeholderTextColor={colors.muted}
            multiline
            value={reviewText}
            onChangeText={setReviewText}
            testID="review-input"
          />
          <Button title="Submit Review" onPress={submitReview} style={{ marginTop: spacing.lg }} testID="review-submit" />
        </KeyboardAwareScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  errText: { fontFamily: font.semibold, fontSize: fontSize.lg, color: colors.onSurface, marginTop: spacing.md, textAlign: 'center' },
  topBar: { position: 'absolute', left: spacing.lg, right: spacing.lg, zIndex: 20, flexDirection: 'row', justifyContent: 'space-between' },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...shadow.soft },
  pdpDiscount: { position: 'absolute', bottom: 44, left: spacing.lg, backgroundColor: colors.accent, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.sm },
  pdpDiscountText: { color: colors.onAccent, fontFamily: font.bold, fontSize: fontSize.sm },
  dots: { position: 'absolute', bottom: spacing.md, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 18, backgroundColor: '#fff' },
  thumbs: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: colors.brand },
  thumbImg: { width: '100%', height: '100%' },
  info: { paddingHorizontal: spacing.lg },
  catLabel: { fontFamily: font.bold, fontSize: fontSize.xs, color: colors.brand, textTransform: 'uppercase', letterSpacing: 1 },
  name: { fontFamily: font.extrabold, fontSize: fontSize['3xl'], color: colors.onSurface, marginTop: spacing.xs },
  tagline: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.muted, marginTop: 2 },
  ratingRow: { marginTop: spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.md },
  price: { fontFamily: font.extrabold, fontSize: fontSize['3xl'], color: colors.onSurface },
  mrp: { fontFamily: font.regular, fontSize: fontSize.lg, color: colors.muted, textDecorationLine: 'line-through' },
  save: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.accent, backgroundColor: colors.accentSoft, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  taxNote: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  sectionLabel: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface, marginTop: spacing.lg, marginBottom: spacing.sm },
  variants: { flexDirection: 'row', gap: spacing.sm },
  variantChip: { flex: 1, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  variantActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  variantOut: { opacity: 0.5 },
  variantWeight: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  variantPrice: { fontFamily: font.medium, fontSize: fontSize.sm, color: colors.onSurfaceMuted, marginTop: 2 },
  variantOutText: { fontFamily: font.semibold, fontSize: 9, color: colors.error, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pinBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 50, marginTop: spacing.lg },
  pinInput: { flex: 1, fontFamily: font.medium, fontSize: fontSize.base, color: colors.onSurface },
  pinCheck: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.brand },
  pinResult: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.success, marginTop: spacing.sm },
  description: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.onSurfaceMuted, lineHeight: 22, marginTop: spacing.lg },
  accordion: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  accordionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.lg },
  accordionTitle: { fontFamily: font.bold, fontSize: fontSize.lg, color: colors.onSurface },
  accordionBody: { paddingBottom: spacing.lg },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: { backgroundColor: colors.brandSoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  pillText: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.brand },
  nutriRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  nutriLabel: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.onSurfaceMuted },
  nutriValue: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurface },
  nutriNote: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.muted, marginTop: spacing.sm },
  bullet: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, alignItems: 'flex-start' },
  bulletText: { flex: 1, fontFamily: font.regular, fontSize: fontSize.base, color: colors.onSurfaceMuted, lineHeight: 21 },
  bodyText: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.onSurfaceMuted, lineHeight: 21 },
  faqQ: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  faqA: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.onSurfaceMuted, marginTop: 4, lineHeight: 21 },
  reviewsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl },
  reviewsTitle: { fontFamily: font.bold, fontSize: fontSize.xl, color: colors.onSurface },
  writeReview: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.brand },
  reviewSummary: { flexDirection: 'row', marginTop: spacing.md },
  avgBox: { alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: 4 },
  avgNum: { fontFamily: font.extrabold, fontSize: fontSize['3xl'], color: colors.onSurface },
  avgCount: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.muted },
  reviewItem: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.md, gap: 6 },
  reviewItemHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewer: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verifiedText: { fontFamily: font.semibold, fontSize: fontSize.xs, color: colors.success },
  reviewComment: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.onSurfaceMuted, lineHeight: 20 },
  stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: spacing.md, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md, ...shadow.float },
  fullscreen: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  fsClose: { position: 'absolute', right: spacing.lg, zIndex: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  fsImgWrap: { width, justifyContent: 'center' },
  sheet: { padding: spacing.lg, paddingBottom: spacing.xxl },
  sheetTitle: { fontFamily: font.bold, fontSize: fontSize.xl, color: colors.onSurface },
  inputLabel: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.onSurfaceMuted, marginTop: spacing.md },
  reviewInput: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 90, textAlignVertical: 'top', fontFamily: font.regular, fontSize: fontSize.base, color: colors.onSurface, marginTop: spacing.sm },
});
