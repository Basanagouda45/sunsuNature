import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Carousel, type ICarouselInstance } from 'react-native-reanimated-carousel';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, radius, spacing } from '@/src/theme';
import { useFetch } from '@/src/hooks/useFetch';
import { useAuth } from '@/src/context/AuthContext';
import { useLocation } from '@/src/context/LocationContext';
import { Category, Product } from '@/src/types';
import { SectionHeader } from '@/src/components/SectionHeader';
import HomePageShop from './homePageShope';
import Footer from './footer';

// Web / Desktop images (1 - 7)
import Image1 from "../../assets/images/new-1.png";
import Image2 from "../../assets/images/new-2.png";
import Image3 from "../../assets/images/new-3.png";
import Image4 from "../../assets/images/new-4.png";
import Image5 from "../../assets/images/new-5.png";
import Image6 from "../../assets/images/new-6.png";
import Image7 from "../../assets/images/new-7.png";

// Mobile images (8 - 14)
import Image8 from "../../assets/images/m-all.png";
import Image9 from "../../assets/images/dig.png";
import Image10 from "../../assets/images/choc.png";
import Image11 from "../../assets/images/mng.png";
import Image12 from "../../assets/images/nan.png";
import Image13 from "../../assets/images/tropical.png";
import Image14 from "../../assets/images/bery.png";

const HORIZONTAL_PADDING = spacing.lg;
const CARD_GAP = spacing.md;
const FEATURED_CARD_WIDTH = 260;

// Web hero banners
const WEB_BANNERS = [
  { id: '1', image: Image1 },
  { id: '2', image: Image2 },
  { id: '3', image: Image3 },
  { id: '4', image: Image4 },
  { id: '5', image: Image5 },
  { id: '6', image: Image6 },
  { id: '7', image: Image7 },
];

// Mobile hero banners
const MOBILE_BANNERS = [
  { id: '1', image: Image8 },
  { id: '2', image: Image9 },
  { id: '3', image: Image10 },
  { id: '4', image: Image11 },
  { id: '5', image: Image12 },
  { id: '6', image: Image13 },
  { id: '7', image: Image14 },
];

export default function Home() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Use tall portrait height on mobile (similar to 4:5 e-commerce banners in Image 1)
  const heroHeight = isMobile ? Math.round(width * 1.25) : 580;
  const webCardWidth = (width - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

  // Select banner images according to device
  const heroBanners = isMobile ? MOBILE_BANNERS : WEB_BANNERS;

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { location } = useLocation();

  // Carousel refs and state
  const heroCarouselRef = useRef<ICarouselInstance>(null);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  // Auto-Slide Loop Effect
  useEffect(() => {
    const heroTimer = setInterval(() => {
      heroCarouselRef.current?.next();
    }, 6000);

    return () => {
      clearInterval(heroTimer);
    };
  }, []);

  const categories = useFetch<Category[]>('/categories');
  const best = useFetch<{ products: Product[] }>('/products?best_seller=true&limit=8');
  const fresh = useFetch<{ products: Product[] }>('/products?is_new=true&limit=8');

  const onRefresh = useCallback(() => {
    categories.reload();
    best.reload();
    fresh.reload();
  }, [categories, best, fresh]);

  const filteredCategories = (categories.data || []).filter((c) => {
    const name = c.name.toLowerCase();
    const slug = c.slug.toLowerCase();
    return (
      !name.includes('immunity') &&
      !slug.includes('immunity') &&
      !name.includes('vegetable') &&
      !slug.includes('vegetable')
    );
  });

  return (
    <View style={styles.wrap}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        {/* Full-Width Automatic Hero Slideshow */}
        <View style={[styles.heroWrap, { height: heroHeight }]}>
          <Carousel
            ref={heroCarouselRef}
            width={width}
            height={heroHeight}
            loop={true}
            enabled={true}
            pagingEnabled={true}
            snapEnabled={true}
            scrollAnimationDuration={650}
            data={heroBanners}
            onSnapToItem={(index) => setActiveHeroIndex(index)}
            style={{ width: width, height: heroHeight }}
            panGestureHandlerProps={{ activeOffsetX: [-10, 10] }}
            renderItem={({ item }) => (
              <Pressable
                style={styles.hero}
                onPress={() => router.push('/(tabs)/shop')}
                testID="hero-banner"
              >
                {/* Edge-to-edge uncropped banner image */}
                <Image 
                  source={item.image} 
                  style={styles.heroImage} 
                  contentFit="cover" 
                  transition={250} 
                />
              </Pressable>
            )}
          />

          {/* Dots Indicator */}
          <View style={styles.dotsContainer}>
            {heroBanners.map((_, idx) => (
              <Pressable
                key={idx}
                onPress={() => heroCarouselRef.current?.scrollTo({ index: idx, animated: true })}
                style={[
                  styles.dot,
                  activeHeroIndex === idx && styles.activeDot,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Responsive Shop by Category */}
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader 
            title="Shop by Category" 
            actionLabel="See all" 
            onAction={() => router.push('/(tabs)/categories')} 
          />
          <View style={[
            styles.categoryContainer, 
            isMobile && { paddingHorizontal: spacing.md },
            !isMobile && styles.webCategoryGrid
          ]}>
            {filteredCategories.map((c) => (
              <Pressable
                key={c.id}
                style={[
                  isMobile ? styles.mobileBannerCard : styles.webBannerCard,
                  !isMobile && { width: webCardWidth }
                ]}
                onPress={() => router.push(`/(tabs)/shop?category=${c.slug}`)}
                testID={`category-${c.slug}`}
              >
                <Image 
                  source={{ uri: c.image }} 
                  style={StyleSheet.absoluteFillObject} 
                  contentFit="cover" 
                  transition={200} 
                />
                <LinearGradient
                  colors={isMobile ? ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)'] : ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.65)']}
                  style={StyleSheet.absoluteFillObject}
                />
                
                <View style={isMobile ? styles.mobileContent : styles.webContent}>
                  <Text style={isMobile ? styles.mobileTitle : styles.webTitle} numberOfLines={isMobile ? 1 : 2}>
                    {c.name}
                  </Text>
                  
                  {isMobile ? (
                    <View style={styles.mobileCta}>
                      <Text style={styles.mobileCtaText}>Shop now</Text>
                      <View style={styles.greenArrowCircle}>
                        <Feather name="arrow-right" size={10} color="#FFFFFF" />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.webCta}>
                      <Text style={styles.webCtaText}>Shop Now</Text>
                      <Feather name="arrow-right" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Home Page Shop Section */}
        <HomePageShop />

        {/* Footer Component */}
        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { 
    flex: 1, 
    backgroundColor: colors.surface, 
    paddingTop: spacing.xs,
  },
  heroWrap: { 
    width: '100%', 
    position: 'relative',
    backgroundColor: '#FAF5EE',
  },
  hero: { 
    flex: 1, 
    width: '100%',
    height: '100%',
    overflow: 'hidden', 
  },
  heroImage: { 
    width: '100%', 
    height: '100%',
  },

  // Bottom Dots Indicator (like in Image 1)
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  activeDot: {
    width: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },

  // Category Layout
  categoryContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    marginTop: spacing.sm,
    gap: CARD_GAP,
  },
  webCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8F9FA',
    padding: 16,
  },

  // Mobile Category Styles
  mobileBannerCard: {
    width: '100%',
    height: 125,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: colors.surfaceTertiary,
  },
  mobileContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    zIndex: 2,
  },
  mobileTitle: {
    fontFamily: font.extrabold,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  mobileCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mobileCtaText: {
    fontFamily: font.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  greenArrowCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Web Category Styles
  webBannerCard: {
    height: 280,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceTertiary,
  },
  webContent: {
    padding: spacing.md,
    zIndex: 2,
  },
  webTitle: {
    fontFamily: font.extrabold,
    fontSize: fontSize.sm,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  webCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  webCtaText: {
    fontFamily: font.semibold,
    fontSize: 11,
    color: '#FFFFFF',
  },
});