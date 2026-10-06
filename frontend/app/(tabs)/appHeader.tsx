import React from 'react';
import {
  Platform,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

import { colors, font, fontSize, radius, spacing } from '@/src/theme';
import { useCart } from '@/src/context/CartContext';
import { SunLogo } from '@/src/components/SunLogo';

function WebHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <View style={styles.webHeaderContainer}>
      <View style={styles.webHeaderInner}>
        {/* Left Section */}
        <View style={styles.webLeftSection}>
          <Pressable
            style={styles.menuButton}
            onPress={() => router.push('/(tabs)/categories')}
          >
            <Feather name="menu" size={22} color={colors.onSurface} />
          </Pressable>

          <Pressable style={styles.logoWrap} onPress={() => router.push('/(tabs)')}>
            <SunLogo size={24} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.webSearchContainer}>
          <Pressable
            style={styles.categoriesSelector}
            onPress={() => router.push('/(tabs)/categories')}
          >
            <Feather name="grid" size={16} color={colors.onSurface} />
            <Text style={styles.categoriesSelectorText}>All Categories</Text>
          </Pressable>

          <View style={styles.searchDivider} />

          <View style={styles.webSearchInputWrap}>
            <TextInput
              style={styles.webSearchInput}
              placeholder="What are you looking for?"
              placeholderTextColor={colors.muted}
              onFocus={() => router.push('/search')}
            />
            <Feather
              name="search"
              size={18}
              color={colors.onSurface}
              style={styles.searchIcon}
            />
          </View>
        </View>

        {/* Right Section */}
        <View style={styles.webRightSection}>
          <Pressable
            style={styles.webIconButton}
            onPress={() => router.push('/(tabs)/account')}
          >
            <Feather
              name="user"
              size={22}
              color={pathname === '/account' ? colors.brand : colors.onSurface}
            />
          </Pressable>

          <View style={styles.verticalDivider} />

          <Pressable
            style={styles.webIconButton}
            onPress={() => router.push('/(tabs)/cart')}
          >
            <Feather
              name="shopping-bag"
              size={22}
              color={pathname === '/cart' ? colors.brand : colors.onSurface}
            />
            {itemCount > 0 && (
              <View style={styles.webBadge}>
                <Text style={styles.badgeText}>
                  {itemCount > 9 ? '9+' : itemCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function MobileHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <View style={styles.mobileHeaderWrapper}>
      {/* Promotional Banner */}
      <View style={styles.topPromoBanner}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promoContent}
        >
          <Text style={styles.promoBannerText}>
            Discount on Purchase of 899 and Above With Code "SAVER8" ✦ Get 8% Discount
          </Text>
        </ScrollView>
      </View>

      {/* Main Header */}
      <View style={styles.mobileHeaderMain}>
        <View style={styles.mobileNavRow}>
          {/* Left */}
          <View style={styles.mobileLeftGroup}>
            <Pressable
              style={styles.mobileIconBtn}
              onPress={() => router.push('/(tabs)/categories')}
            >
              <Feather name="menu" size={22} color={colors.onSurface} />
            </Pressable>

            <Pressable style={styles.logoWrap} onPress={() => router.push('/(tabs)')}>
              <SunLogo size={22} />
            </Pressable>
          </View>

          {/* Right */}
          <View style={styles.mobileRightGroup}>
            <Pressable
              style={styles.mobileIconBtn}
              onPress={() => router.push('/(tabs)/account')}
            >
              <Feather
                name="user"
                size={22}
                color={pathname === '/account' ? colors.brand : colors.onSurface}
              />
            </Pressable>

            <View style={styles.mobileVerticalDivider} />

            <Pressable
              style={styles.mobileIconBtn}
              onPress={() => router.push('/(tabs)/cart')}
            >
              <Feather
                name="shopping-bag"
                size={22}
                color={pathname === '/cart' ? colors.brand : colors.onSurface}
              />
              {itemCount > 0 && (
                <View style={styles.mobileBadge}>
                  <Text style={styles.badgeText}>
                    {itemCount > 9 ? '9+' : itemCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Mobile Search */}
        <View style={styles.mobileSearchContainer}>
          <Pressable
            style={styles.mobileCategorySelector}
            onPress={() => router.push('/(tabs)/categories')}
          >
            <Feather name="grid" size={16} color={colors.onSurface} />
            <Text style={styles.mobileCategoryText} numberOfLines={1}>
              All C...
            </Text>
          </Pressable>

          <View style={styles.mobileSearchDivider} />

          <View style={styles.mobileSearchInputWrap}>
            <TextInput
              style={styles.mobileSearchInput}
              placeholder="What are you looking for?"
              placeholderTextColor={colors.muted}
              onFocus={() => router.push('/search')}
            />
            <Feather name="search" size={18} color={colors.onSurface} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function AppHeader() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  return isDesktop ? <WebHeader /> : <MobileHeader />;
}

const styles = StyleSheet.create({
  badgeText: {
    color: colors.onAccent,
    fontFamily: font.bold,
    fontSize: 10,
  },
  webHeaderContainer: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    width: '100%',
    zIndex: 100,
  },
  webHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1200,
    width: '100%',
    gap: spacing.lg,
  },
  webLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuButton: {
    padding: spacing.xs,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webSearchContainer: {
    flex: 1,
    maxWidth: 650,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    height: 44,
    paddingHorizontal: spacing.sm,
  },
  categoriesSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    height: '100%',
  },
  categoriesSelectorText: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.onSurface,
  },
  searchDivider: {
    width: 1,
    height: '60%',
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  webSearchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: spacing.xs,
  },
  webSearchInput: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.onSurface,
    paddingRight: spacing.sm,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' as any }),
  },
  searchIcon: {
    marginLeft: 'auto',
  },
  webRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  webIconButton: {
    padding: spacing.xs,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  webBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: colors.accent,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  mobileHeaderWrapper: {
    width: '100%',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topPromoBanner: {
    backgroundColor: '#FFCB05',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  promoContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  promoBannerText: {
    fontFamily: font.semibold,
    fontSize: 11,
    color: '#212121',
    textAlign: 'center',
  },
  mobileHeaderMain: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  mobileNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  mobileLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mobileRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mobileIconBtn: {
    padding: 4,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileVerticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: 2,
  },
  mobileBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: colors.accent,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  mobileSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    height: 44,
    paddingHorizontal: spacing.sm,
  },
  mobileCategorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: spacing.xs,
  },
  mobileCategoryText: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.onSurface,
  },
  mobileSearchDivider: {
    width: 1,
    height: '60%',
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  mobileSearchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  mobileSearchInput: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.onSurface,
    paddingRight: spacing.xs,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' as any }),
  },
});