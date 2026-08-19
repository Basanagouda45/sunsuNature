import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, radius, shadow, spacing, rupee } from '@/src/theme';
import { Product } from '@/src/types';
import { useCart } from '@/src/context/CartContext';
import { useWishlist } from '@/src/context/WishlistContext';
import { useToast } from '@/src/context/ToastContext';
import { Stars } from './Stars';

const BLUR = 'L6PZfSjE.AyE_3t7t7R**0o#DgR4';

export function ProductCard({ product, width }: { product: Product; width: number }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const { show } = useToast();
  const [adding, setAdding] = useState(false);

  const variant = product.variants?.[0];
  const discount = variant && variant.mrp > variant.price ? Math.round(((variant.mrp - variant.price) / variant.mrp) * 100) : 0;
  const wishlisted = isWishlisted(product.id);

  const onAdd = async (e: any) => {
    e.stopPropagation?.();
    if (!variant) return;
    setAdding(true);
    try {
      await addItem(product, variant, 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      show(`${product.name} added to cart`, 'success');
    } catch (err: any) {
      show(err?.message || 'Could not add to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  const onWishlist = async (e: any) => {
    e.stopPropagation?.();
    Haptics.selectionAsync();
    const added = await toggle(product);
    show(added ? 'Saved to wishlist' : 'Removed from wishlist', added ? 'success' : 'info');
  };

  const imgH = width * 0.92;

  return (
    <Pressable
      style={[styles.card, { width }]}
      onPress={() => router.push(`/product/${product.slug}`)}
      testID={`product-card-${product.slug}`}
    >
      <View style={[styles.imageWrap, { height: imgH }]}>
        <Image source={{ uri: product.images?.[0] }} style={styles.image} contentFit="cover" transition={250} placeholder={BLUR} />
        {discount > 0 && (
          <View style={styles.discountTag}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}
        <Pressable style={styles.heart} onPress={onWishlist} hitSlop={8} testID={`wishlist-${product.slug}`}>
          <Feather name="heart" size={16} color={wishlisted ? colors.accent : colors.onSurfaceMuted} style={wishlisted ? undefined : undefined} />
        </Pressable>
        {product.is_new && (
          <View style={styles.newTag}>
            <Text style={styles.newText}>NEW</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.tagline} numberOfLines={1}>{product.tagline || product.ingredients.join(' • ')}</Text>
        <View style={styles.metaRow}>
          <Stars rating={product.rating} size={12} count={product.review_count} />
          {variant && <Text style={styles.weight}>{variant.weight}</Text>}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.priceCol}>
            {variant && <Text style={styles.price}>{rupee(variant.price)}</Text>}
            {discount > 0 && variant && <Text style={styles.mrp}>{rupee(variant.mrp)}</Text>}
          </View>
          <Pressable style={styles.addBtn} onPress={onAdd} disabled={adding} testID={`add-${product.slug}`}>
            <Feather name={adding ? 'loader' : 'plus'} size={18} color={colors.onBrand} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.soft },
  imageWrap: { backgroundColor: colors.surfaceTertiary, position: 'relative' },
  image: { width: '100%', height: '100%' },
  discountTag: { position: 'absolute', top: spacing.sm, left: spacing.sm, backgroundColor: colors.accent, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  discountText: { color: colors.onAccent, fontFamily: font.bold, fontSize: fontSize.xs },
  newTag: { position: 'absolute', bottom: spacing.sm, left: spacing.sm, backgroundColor: colors.onSurface, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  newText: { color: colors.onInverse, fontFamily: font.bold, fontSize: fontSize.xs, letterSpacing: 0.5 },
  heart: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.md, paddingTop: spacing.sm },
  name: { fontFamily: font.bold, fontSize: fontSize.md, color: colors.onSurface },
  tagline: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  weight: { fontFamily: font.medium, fontSize: fontSize.xs, color: colors.onSurfaceMuted, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  priceCol: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  price: { fontFamily: font.extrabold, fontSize: fontSize.lg, color: colors.onSurface },
  mrp: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted, textDecorationLine: 'line-through' },
  addBtn: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});
