import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, radius, shadow, spacing } from '@/src/theme';
import { useFetch } from '@/src/hooks/useFetch';
import { Category } from '@/src/types';
import { Skeleton } from '@/src/components/Skeleton';
import { EmptyState } from '@/src/components/EmptyState';
import Footer from './footer';

export default function Categories() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { data, loading, error, reload } = useFetch<Category[]>('/categories');

  // Responsive card width layout (max constraint for tablets/web view, full width minus margins on mobile)
  const CARD_W = Math.min(width - spacing.lg * 2, 800);

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>Categories</Text>
        <Text style={styles.subtitle}>Explore our full range of natural powders</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.listContainer}>
          {loading ? (
[0, 1, 2, 3].map((i) => <Skeleton key={i} height={140} round={radius.lg} style={{ marginBottom: spacing.md, width: CARD_W }} />)
          ) : error ? (
            <EmptyState icon="wifi-off" title="Couldn't load" subtitle={error} ctaTitle="Retry" onPress={reload} />
          ) : (
            (data || []).map((c) => (
              <Pressable
                key={c.id}
                style={[styles.card, { width: CARD_W }]}
                onPress={() => router.push(`/(tabs)/shop?category=${c.slug}`)}
                testID={`categories-${c.slug}`}
              >
                <Image source={{ uri: c.image }} style={StyleSheet.absoluteFill as any} contentFit="cover" transition={250} />
                <LinearGradient colors={['rgba(23,32,23,0.1)', 'rgba(23,32,23,0.8)']} style={StyleSheet.absoluteFill as any} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardName}>{c.name}</Text>
                  <View style={styles.cardCta}>
                    <Text style={styles.cardCtaText}>Shop now</Text>
                    <View style={styles.arrow}>
                      <Text style={{ color: colors.onBrand, fontFamily: font.bold }}>→</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </View>

        {/* Footer attached at the bottom of the scroll view */}
        <View style={{ marginTop: spacing.xxl }}>
          <Footer />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontFamily: font.extrabold, fontSize: fontSize['2xl'], color: colors.onSurface },
  subtitle: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.muted, marginTop: 2 },
  content: { paddingVertical: spacing.lg, paddingBottom: spacing.xxxl },
  listContainer: { alignItems: 'center', paddingHorizontal: spacing.lg },
  card: { height: 140, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md, justifyContent: 'flex-end', ...shadow.card },
  cardBody: { padding: spacing.lg },
  cardName: { fontFamily: font.extrabold, fontSize: fontSize.xl, color: colors.onInverse },
  cardCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  cardCtaText: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onInverse },
  arrow: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});