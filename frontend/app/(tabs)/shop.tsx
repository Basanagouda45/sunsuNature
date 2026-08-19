import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { colors, font, fontSize, radius, spacing } from '@/src/theme';
import { api } from '@/src/api/client';
import { Category, Product } from '@/src/types';
import { useFetch } from '@/src/hooks/useFetch';
import { ProductCard } from '@/src/components/ProductCard';
import { ProductCardSkeleton } from '@/src/components/Skeleton';
import { EmptyState } from '@/src/components/EmptyState';
import { Button } from '@/src/components/Button';
import { Chip } from '@/src/components/Chip';

const { width } = Dimensions.get('window');
const GAP = spacing.md;
const CARD_W = (width - spacing.lg * 2 - GAP) / 2;

const SORTS = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'best_selling', label: 'Best Selling' },
  { key: 'newest', label: 'Newest' },
  { key: 'price_asc', label: 'Price: Low to High' },
  { key: 'price_desc', label: 'Price: High to Low' },
  { key: 'rating', label: 'Rating' },
];

const DIETARY = ['Vegan', 'Gluten-Free', 'Organic'];
const PRICE_RANGES = [
  { label: 'Under ₹300', min: 0, max: 300 },
  { label: '₹300 - ₹600', min: 300, max: 600 },
  { label: '₹600 - ₹1000', min: 600, max: 1000 },
  { label: 'Above ₹1000', min: 1000, max: 99999 },
];

export default function Shop() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; need?: string }>();

  const categories = useFetch<Category[]>('/categories');
  const [selectedCat, setSelectedCat] = useState<string>(params.category || 'all');
  const [need, setNeed] = useState<string | undefined>(params.need);
  const [sort, setSort] = useState('recommended');
  const [dietary, setDietary] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<number | null>(null);
  const [minRating, setMinRating] = useState(false);
  const [inStock, setInStock] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterSheet = useRef<BottomSheet>(null);
  const sortSheet = useRef<BottomSheet>(null);

  useEffect(() => {
    if (params.category) setSelectedCat(params.category);
    if (params.need) setNeed(params.need);
  }, [params.category, params.need]);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (selectedCat && selectedCat !== 'all') q.set('category', selectedCat);
    if (need) q.set('need', need);
    if (sort) q.set('sort', sort);
    if (dietary) q.set('dietary', dietary);
    if (priceRange !== null) {
      q.set('min_price', String(PRICE_RANGES[priceRange].min));
      q.set('max_price', String(PRICE_RANGES[priceRange].max));
    }
    if (minRating) q.set('min_rating', '4');
    if (inStock) q.set('in_stock', 'true');
    q.set('limit', '50');
    return q.toString();
  }, [selectedCat, need, sort, dietary, priceRange, minRating, inStock]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ products: Product[] }>(`/products?${query}`);
      setProducts(res.products);
    } catch (e: any) {
      setError(e?.message || 'Unable to load products');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const activeFilterCount = (dietary ? 1 : 0) + (priceRange !== null ? 1 : 0) + (minRating ? 1 : 0) + (inStock ? 1 : 0);

  const resetFilters = () => {
    setDietary(null);
    setPriceRange(null);
    setMinRating(false);
    setInStock(false);
    setNeed(undefined);
  };

  const cats = [{ id: 'all', slug: 'all', name: 'All' } as any, ...(categories.data || [])];

  return (
    <View style={styles.wrap}>
      {/* Sticky header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Shop SUNSU</Text>
          <Pressable onPress={() => router.push('/search')} hitSlop={8} testID="shop-search">
            <Feather name="search" size={22} color={colors.onSurface} />
          </Pressable>
        </View>
        {need && (
          <View style={styles.needBanner}>
            <Text style={styles.needBannerText}>Filtered by need: {need.replace('-', ' ')}</Text>
            <Pressable onPress={() => setNeed(undefined)} hitSlop={8}>
              <Feather name="x" size={16} color={colors.brand} />
            </Pressable>
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {cats.map((c) => (
            <Chip key={c.slug} label={c.name} active={selectedCat === c.slug} onPress={() => setSelectedCat(c.slug)} testID={`cat-chip-${c.slug}`} />
          ))}
        </ScrollView>
        <View style={styles.toolbar}>
          <Pressable style={styles.toolBtn} onPress={() => sortSheet.current?.expand()} testID="sort-button">
            <Feather name="bar-chart-2" size={16} color={colors.onSurface} />
            <Text style={styles.toolText}>{SORTS.find((s) => s.key === sort)?.label}</Text>
          </Pressable>
          <Pressable style={styles.toolBtn} onPress={() => filterSheet.current?.expand()} testID="filter-button">
            <Feather name="sliders" size={16} color={colors.onSurface} />
            <Text style={styles.toolText}>Filter{activeFilterCount ? ` (${activeFilterCount})` : ''}</Text>
          </Pressable>
        </View>
      </View>

      {/* Grid */}
      {loading ? (
        <View style={styles.gridPad}>
          <View style={styles.gridRow}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ marginBottom: GAP }}>
                <ProductCardSkeleton width={CARD_W} />
              </View>
            ))}
          </View>
        </View>
      ) : error ? (
        <EmptyState icon="wifi-off" title="Couldn't load products" subtitle={error} ctaTitle="Retry" onPress={load} testID="shop-error" />
      ) : products.length === 0 ? (
        <EmptyState icon="search" title="No products found" subtitle="Try adjusting your filters." ctaTitle="Clear Filters" onPress={resetFilters} testID="shop-empty" />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={styles.gridPad}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={{ marginBottom: GAP }}>
              <ProductCard product={item} width={CARD_W} />
            </View>
          )}
        />
      )}

      {/* Sort sheet */}
      <BottomSheet
        ref={sortSheet}
        index={-1}
        snapPoints={[420]}
        enablePanDownToClose
        backdropComponent={(p) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />}
        handleIndicatorStyle={{ backgroundColor: colors.borderStrong }}
        backgroundStyle={{ backgroundColor: colors.card }}
      >
        <BottomSheetView style={styles.sheet}>
          <Text style={styles.sheetTitle}>Sort By</Text>
          {SORTS.map((s) => (
            <Pressable key={s.key} style={styles.sortRow} onPress={() => { setSort(s.key); sortSheet.current?.close(); }} testID={`sort-${s.key}`}>
              <Text style={[styles.sortLabel, sort === s.key && { color: colors.brand, fontFamily: font.bold }]}>{s.label}</Text>
              {sort === s.key && <Feather name="check" size={18} color={colors.brand} />}
            </Pressable>
          ))}
        </BottomSheetView>
      </BottomSheet>

      {/* Filter sheet */}
      <BottomSheet
        ref={filterSheet}
        index={-1}
        snapPoints={[560]}
        enablePanDownToClose
        backdropComponent={(p) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />}
        handleIndicatorStyle={{ backgroundColor: colors.borderStrong }}
        backgroundStyle={{ backgroundColor: colors.card }}
      >
        <BottomSheetView style={styles.sheet}>
          <Text style={styles.sheetTitle}>Filters</Text>
          <Text style={styles.filterGroup}>Price</Text>
          <View style={styles.filterChips}>
            {PRICE_RANGES.map((p, i) => (
              <Chip key={p.label} label={p.label} active={priceRange === i} onPress={() => setPriceRange(priceRange === i ? null : i)} />
            ))}
          </View>
          <Text style={styles.filterGroup}>Dietary</Text>
          <View style={styles.filterChips}>
            {DIETARY.map((d) => (
              <Chip key={d} label={d} active={dietary === d} onPress={() => setDietary(dietary === d ? null : d)} />
            ))}
          </View>
          <Text style={styles.filterGroup}>Other</Text>
          <View style={styles.filterChips}>
            <Chip label="4★ & above" active={minRating} onPress={() => setMinRating(!minRating)} />
            <Chip label="In stock only" active={inStock} onPress={() => setInStock(!inStock)} />
          </View>
          <View style={styles.sheetActions}>
            <Button title="Reset" variant="secondary" onPress={resetFilters} style={{ flex: 1 }} testID="filter-reset" />
            <Button title="Apply" onPress={() => filterSheet.current?.close()} style={{ flex: 1 }} testID="filter-apply" />
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.surface, paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontFamily: font.extrabold, fontSize: fontSize['2xl'], color: colors.onSurface },
  needBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing.lg, marginBottom: spacing.sm, backgroundColor: colors.brandSoft, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  needBannerText: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.brand, textTransform: 'capitalize' },
  chipRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: spacing.xs },
  toolbar: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  toolBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: spacing.sm },
  toolText: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.onSurface },
  gridPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  sheet: { padding: spacing.lg, paddingBottom: spacing.xxl },
  sheetTitle: { fontFamily: font.bold, fontSize: fontSize.xl, color: colors.onSurface, marginBottom: spacing.md },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  sortLabel: { fontFamily: font.medium, fontSize: fontSize.lg, color: colors.onSurface },
  filterGroup: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurfaceMuted, marginTop: spacing.lg, marginBottom: spacing.sm },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sheetActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
});
