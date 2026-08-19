import { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, Dimensions, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Carousel } from 'react-native-reanimated-carousel';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, radius, shadow, spacing } from '@/src/theme';
import { useFetch } from '@/src/hooks/useFetch';
import { useAuth } from '@/src/context/AuthContext';
import { useLocation } from '@/src/context/LocationContext';
import { Banner, Category, Product } from '@/src/types';
import { ProductCard } from '@/src/components/ProductCard';
import { SectionHeader } from '@/src/components/SectionHeader';
import { SunLogo } from '@/src/components/SunLogo';
import { ProductCardSkeleton } from '@/src/components/Skeleton';

const { width } = Dimensions.get('window');
const CARD_W = 168;

const NEEDS = [
  { key: 'energy', label: 'Energy', icon: 'zap' },
  { key: 'immunity', label: 'Immunity', icon: 'shield' },
  { key: 'digestion', label: 'Digestion', icon: 'activity' },
  { key: 'daily-wellness', label: 'Daily Wellness', icon: 'sun' },
  { key: 'skin-glow', label: 'Skin & Glow', icon: 'star' },
  { key: 'workout', label: 'Workout', icon: 'trending-up' },
];

const TRUST = [
  { icon: 'sun', label: 'Carefully Dehydrated' },
  { icon: 'check-circle', label: 'Quality Ingredients' },
  { icon: 'zap', label: 'Convenient Nutrition' },
  { icon: 'shield', label: 'Hygienically Packed' },
];

const FOOTER_LINKS = ['About Sunsu', 'Contact', 'FAQ', 'Shipping', 'Returns', 'Privacy Policy', 'Terms', 'Refund Policy'];

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { location } = useLocation();

  const banners = useFetch<Banner[]>('/banners');
  const categories = useFetch<Category[]>('/categories');
  const best = useFetch<{ products: Product[] }>('/products?best_seller=true&limit=8');
  const fresh = useFetch<{ products: Product[] }>('/products?is_new=true&limit=8');

  const onRefresh = useCallback(() => {
    banners.reload();
    categories.reload();
    best.reload();
    fresh.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = best.loading && !best.data;

  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <SunLogo size={20} />
        <Pressable style={styles.location} onPress={() => router.push('/location')} testID="header-location">
          <Feather name="map-pin" size={13} color={colors.brand} />
          <Text style={styles.locText} numberOfLines={1}>
            {location ? `${location.city} • ${location.pincode}` : 'Set location'}
          </Text>
          <Feather name="chevron-down" size={14} color={colors.onSurfaceMuted} />
        </Pressable>
        <View style={styles.headerIcons}>
          <Pressable onPress={() => router.push('/(tabs)/cart')} testID="header-cart" hitSlop={6}>
            <Feather name="shopping-bag" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        {/* Search */}
        <Pressable style={styles.search} onPress={() => router.push('/search')} testID="home-search">
          <Feather name="search" size={18} color={colors.muted} />
          <Text style={styles.searchText}>Search fruits, powders & wellness blends</Text>
        </Pressable>

        {/* Hero carousel */}
        {banners.data && banners.data.length > 0 && (
          <View style={styles.heroWrap}>
            <Carousel
              width={width - spacing.lg * 2}
              height={190}
              autoPlay
              autoPlayInterval={3800}
              loop
              data={banners.data}
              scrollAnimationDuration={700}
              style={{ width: width - spacing.lg * 2, height: 190, borderRadius: radius.lg }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.hero}
                  onPress={() => router.push('/(tabs)/shop')}
                  testID="hero-banner"
                >
                  <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill as any} contentFit="cover" transition={250} />
                  <LinearGradient colors={['rgba(23,32,23,0.15)', 'rgba(23,32,23,0.75)']} style={StyleSheet.absoluteFill as any} />
                  <View style={styles.heroText}>
                    <Text style={styles.heroTitle}>{item.title}</Text>
                    {!!item.subtitle && <Text style={styles.heroSub} numberOfLines={2}>{item.subtitle}</Text>}
                    <View style={styles.heroCta}>
                      <Text style={styles.heroCtaText}>{item.cta_text || 'Shop Now'}</Text>
                      <Feather name="arrow-right" size={14} color={colors.onBrand} />
                    </View>
                  </View>
                </Pressable>
              )}
            />
          </View>
        )}

        {/* Categories */}
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="Shop by Category" actionLabel="See all" onAction={() => router.push('/(tabs)/categories')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hpad}>
            {(categories.data || []).map((c) => (
              <Pressable key={c.id} style={styles.catItem} onPress={() => router.push(`/(tabs)/shop?category=${c.slug}`)} testID={`category-${c.slug}`}>
                <View style={styles.catImgWrap}>
                  <Image source={{ uri: c.image }} style={styles.catImg} contentFit="cover" transition={200} />
                </View>
                <Text style={styles.catName} numberOfLines={2}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Best Sellers */}
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="Best Sellers" actionLabel="See all" onAction={() => router.push('/(tabs)/shop')} />
          {loading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hpad}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ marginRight: spacing.md }}>
                  <ProductCardSkeleton width={CARD_W} />
                </View>
              ))}
            </ScrollView>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={best.data?.products || []}
              keyExtractor={(p) => p.id}
              contentContainerStyle={styles.hpad}
              renderItem={({ item }) => (
                <View style={{ marginRight: spacing.md }}>
                  <ProductCard product={item} width={CARD_W} />
                </View>
              )}
            />
          )}
        </View>

        {/* Shop by Need */}
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="Shop by Need" />
          <View style={styles.needsGrid}>
            {NEEDS.map((n) => (
              <Pressable key={n.key} style={styles.needCard} onPress={() => router.push(`/(tabs)/shop?need=${n.key}`)} testID={`need-${n.key}`}>
                <View style={styles.needIcon}>
                  <Feather name={n.icon as any} size={20} color={colors.brand} />
                </View>
                <Text style={styles.needLabel}>{n.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* New Arrivals */}
        {(fresh.data?.products?.length || 0) > 0 && (
          <View style={{ marginTop: spacing.xl }}>
            <SectionHeader title="New Arrivals" actionLabel="See all" onAction={() => router.push('/(tabs)/shop')} />
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={fresh.data?.products || []}
              keyExtractor={(p) => p.id}
              contentContainerStyle={styles.hpad}
              renderItem={({ item }) => (
                <View style={{ marginRight: spacing.md }}>
                  <ProductCard product={item} width={CARD_W} />
                </View>
              )}
            />
          </View>
        )}

        {/* Promo */}
        <Pressable style={styles.promo} onPress={() => router.push('/(tabs)/shop')}>
          <View style={{ flex: 1 }}>
            <Text style={styles.promoTitle}>Buy More, Save More</Text>
            <Text style={styles.promoSub}>Free shipping on all orders above ₹999</Text>
          </View>
          <Feather name="gift" size={30} color={colors.onBrand} />
        </Pressable>

        {/* What makes Sunsu different */}
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="What Makes SUNSU Different?" />
          <View style={styles.trustGrid}>
            {TRUST.map((t) => (
              <View key={t.label} style={styles.trustCard}>
                <View style={styles.trustIcon}>
                  <Feather name={t.icon as any} size={18} color={colors.brand} />
                </View>
                <Text style={styles.trustLabel}>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Reviews */}
        <View style={[styles.reviewCard]}>
          <View style={styles.reviewStars}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Feather key={i} name="star" size={16} color={colors.star} />
            ))}
          </View>
          <Text style={styles.reviewQuote}>“Genuinely the easiest way I’ve found to add real fruit to my mornings. The Mango Energy Mix is a family favourite!”</Text>
          <Text style={styles.reviewName}>— Priya S., Bengaluru</Text>
          <Text style={styles.reviewMeta}>Trusted by 5,000+ happy customers across India</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <SunLogo size={18} />
          <Text style={styles.footerTag}>Nature, Dehydrated. Goodness, Preserved.</Text>
          <View style={styles.footerLinks}>
            {FOOTER_LINKS.map((l) => (
              <Pressable key={l} onPress={() => router.push('/support')}>
                <Text style={styles.footerLink}>{l}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.footerCopy}>© 2026 SUNSU • Made in India</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  location: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' },
  locText: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.onSurface, maxWidth: 150 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchText: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.muted },
  heroWrap: { paddingHorizontal: spacing.lg, height: 190 },
  hero: { flex: 1, borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end' },
  heroText: { padding: spacing.lg },
  heroTitle: { fontFamily: font.extrabold, fontSize: fontSize['2xl'], color: colors.onInverse, lineHeight: 28 },
  heroSub: { fontFamily: font.regular, fontSize: fontSize.base, color: 'rgba(247,245,240,0.9)', marginTop: 4 },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brand, alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, marginTop: spacing.md },
  heroCtaText: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.onBrand },
  hpad: { paddingHorizontal: spacing.lg },
  catItem: { width: 84, marginRight: spacing.md, alignItems: 'center' },
  catImgWrap: { width: 76, height: 76, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border },
  catImg: { width: '100%', height: '100%' },
  catName: { fontFamily: font.semibold, fontSize: fontSize.xs, color: colors.onSurface, textAlign: 'center', marginTop: spacing.sm },
  needsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.md },
  needCard: { width: (width - spacing.lg * 2 - spacing.md * 2) / 3, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', paddingVertical: spacing.md, gap: spacing.sm },
  needIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  needLabel: { fontFamily: font.semibold, fontSize: fontSize.xs, color: colors.onSurface, textAlign: 'center' },
  promo: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.xl, backgroundColor: colors.brandDark, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  promoTitle: { fontFamily: font.extrabold, fontSize: fontSize.xl, color: colors.onBrand },
  promoSub: { fontFamily: font.regular, fontSize: fontSize.base, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  trustGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.md },
  trustCard: { width: (width - spacing.lg * 2 - spacing.md) / 2, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  trustIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  trustLabel: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.onSurface, flex: 1 },
  reviewCard: { marginHorizontal: spacing.lg, marginTop: spacing.xl, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, ...shadow.soft },
  reviewStars: { flexDirection: 'row', gap: 3 },
  reviewQuote: { fontFamily: font.medium, fontSize: fontSize.lg, color: colors.onSurface, lineHeight: 24, marginTop: spacing.md },
  reviewName: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.brand, marginTop: spacing.md },
  reviewMeta: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted, marginTop: spacing.xs },
  footer: { marginTop: spacing.xxl, paddingHorizontal: spacing.lg, alignItems: 'center', gap: spacing.md },
  footerTag: { fontFamily: font.medium, fontSize: fontSize.sm, color: colors.muted },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.lg, rowGap: spacing.md },
  footerLink: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.onSurfaceMuted },
  footerCopy: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.muted, marginTop: spacing.sm },
});
