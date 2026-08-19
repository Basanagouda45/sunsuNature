import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, radius, spacing } from '@/src/theme';
import { api } from '@/src/api/client';
import { storage } from '@/src/utils/storage';
import { Product } from '@/src/types';
import { ProductCard } from '@/src/components/ProductCard';
import { EmptyState } from '@/src/components/EmptyState';

const { width } = Dimensions.get('window');
const GAP = spacing.md;
const CARD_W = (width - spacing.lg * 2 - GAP) / 2;
const RECENT_KEY = 'sunsu_recent_searches';
const POPULAR = ['Mango', 'Energy', 'Cocoa', 'Immunity', 'Beetroot', 'Lemon'];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [results, setResults] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const debounce = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    (async () => {
      const raw = await storage.getItem<string>(RECENT_KEY, '');
      if (raw) { try { setRecent(JSON.parse(raw)); } catch {} }
    })();
    setTimeout(() => inputRef.current?.focus(), 350);
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim().length === 0) { setSuggestions([]); setResults(null); return; }
    debounce.current = setTimeout(async () => {
      try {
        const s = await api.get(`/products/search-suggestions?q=${encodeURIComponent(q.trim())}`);
        setSuggestions(s);
      } catch {}
    }, 300);
  }, [q]);

  const runSearch = useCallback(async (term: string) => {
    if (!term.trim()) return;
    setLoading(true);
    setSuggestions([]);
    try {
      const res = await api.get<{ products: Product[] }>(`/products?search=${encodeURIComponent(term.trim())}&limit=50`);
      setResults(res.products);
      const next = [term.trim(), ...recent.filter((r) => r.toLowerCase() !== term.trim().toLowerCase())].slice(0, 6);
      setRecent(next);
      await storage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [recent]);

  const clearRecent = async () => { setRecent([]); await storage.removeItem(RECENT_KEY); };

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search products, ingredients..."
            placeholderTextColor={colors.muted}
            value={q}
            onChangeText={setQ}
            returnKeyType="search"
            onSubmitEditing={() => runSearch(q)}
            testID="search-input"
          />
          {q.length > 0 && (
            <Pressable onPress={() => { setQ(''); setResults(null); }} hitSlop={8}><Feather name="x" size={18} color={colors.muted} /></Pressable>
          )}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}><Text style={styles.cancel}>Cancel</Text></Pressable>
      </View>

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((s) => (
            <Pressable key={s.id} style={styles.suggestRow} onPress={() => router.push(`/product/${s.slug}`)} testID={`suggestion-${s.slug}`}>
              <Image source={{ uri: s.image }} style={styles.suggestImg} contentFit="cover" />
              <Text style={styles.suggestText}>{s.name}</Text>
              <Feather name="arrow-up-left" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.xxl }} />
      ) : results !== null ? (
        results.length === 0 ? (
          <EmptyState icon="search" title={`No results for "${q}"`} subtitle="Try a different keyword or browse our shop." ctaTitle="Browse Shop" onPress={() => router.push('/(tabs)/shop')} testID="search-empty" />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(p) => p.id}
            numColumns={2}
            columnWrapperStyle={{ gap: GAP }}
            contentContainerStyle={{ padding: spacing.lg }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View style={{ marginBottom: GAP }}><ProductCard product={item} width={CARD_W} /></View>
            )}
          />
        )
      ) : (
        <View style={{ padding: spacing.lg }}>
          {recent.length > 0 && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <Pressable onPress={clearRecent} testID="clear-recent"><Text style={styles.clear}>Clear</Text></Pressable>
              </View>
              <View style={styles.tags}>
                {recent.map((r) => (
                  <Pressable key={r} style={styles.tag} onPress={() => { setQ(r); runSearch(r); }}>
                    <Feather name="clock" size={13} color={colors.muted} />
                    <Text style={styles.tagText}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Popular Searches</Text>
          <View style={styles.tags}>
            {POPULAR.map((p) => (
              <Pressable key={p} style={styles.tag} onPress={() => { setQ(p); runSearch(p); }} testID={`popular-${p}`}>
                <Feather name="trending-up" size={13} color={colors.brand} />
                <Text style={styles.tagText}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 46 },
  input: { flex: 1, fontFamily: font.medium, fontSize: fontSize.base, color: colors.onSurface },
  cancel: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.brand },
  suggestions: { backgroundColor: colors.card, marginHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  suggestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  suggestImg: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  suggestText: { flex: 1, fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurface },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: font.bold, fontSize: fontSize.lg, color: colors.onSurface, marginBottom: spacing.md },
  clear: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.error },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  tagText: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.onSurface },
});
