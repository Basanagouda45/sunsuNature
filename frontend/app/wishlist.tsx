import { useCallback } from 'react';
import { View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, spacing } from '@/src/theme';
import { useWishlist } from '@/src/context/WishlistContext';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { ProductCard } from '@/src/components/ProductCard';
import { EmptyState } from '@/src/components/EmptyState';

const { width } = Dimensions.get('window');
const GAP = spacing.md;
const CARD_W = (width - spacing.lg * 2 - GAP) / 2;

export default function Wishlist() {
  const router = useRouter();
  const { products, refresh } = useWishlist();

  useFocusEffect(useCallback(() => { refresh(); }, []));

  return (
    <View style={styles.wrap}>
      <ScreenHeader title="Wishlist" subtitle={`${products.length} saved`} />
      {products.length === 0 ? (
        <EmptyState
          icon="heart"
          title="Your wishlist is empty"
          subtitle="Save products you love and find them here later."
          ctaTitle="Explore Products"
          onPress={() => router.push('/(tabs)/shop')}
          testID="wishlist-empty"
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item }) => (
            <View style={{ marginBottom: GAP }}><ProductCard product={item} width={CARD_W} /></View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { flex: 1, backgroundColor: colors.surface } });
