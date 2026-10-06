import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  FlatList,
  Share,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import {
  colors,
  font,
  fontSize,
  radius,
  shadow,
  spacing,
  rupee,
} from "@/src/theme";

import { api, ApiError } from "@/src/api/client";
import { Product, Variant } from "@/src/types";
import { useFetch } from "@/src/hooks/useFetch";
import { useCart } from "@/src/context/CartContext";
import { useWishlist } from "@/src/context/WishlistContext";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";

import { Button } from "@/src/components/Button";
import { QuantityStepper } from "@/src/components/QuantityStepper";
import { Stars, StarRow } from "@/src/components/Stars";
import { Skeleton } from "@/src/components/Skeleton";
import { ProductCard } from "@/src/components/ProductCard";
import { AppHeader } from "../(tabs)/appHeader";

const { width: screenWidth } = Dimensions.get("window");

function Accordion({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);

  return (
    <View style={styles.accordion}>
      <Pressable
        style={styles.accordionHead}
        onPress={() => {
          Haptics.selectionAsync();
          setOpen(!open);
        }}
        testID={`accordion-${title}`}
      >
        <Text style={styles.accordionTitle}>{title}</Text>

        <Feather
          name={open ? "minus" : "plus"}
          size={20}
          color={colors.brand}
        />
      </Pressable>

      {open && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
}

export default function ProductDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { width: windowWidth } = useWindowDimensions();

  const isDesktop = windowWidth >= 768;

  const { slug } = useLocalSearchParams<{ slug: string }>();

  const {
    data: product,
    loading,
    error,
    reload,
  } = useFetch<Product>(`/products/${slug}`, false, [slug]);

  const { addItem } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const { token } = useAuth();
  const { show } = useToast();

  const [variant, setVariant] = useState<Variant | null>(null);
  const [qty, setQty] = useState(1);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const [pincode, setPincode] = useState("");
  const [pinResult, setPinResult] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);

  // Refs for smooth synchronization between main carousel and thumbnails
  const mobileListRef = useRef<FlatList>(null);
  const thumbsScrollRef = useRef<ScrollView>(null);

  const handleThumbnailPress = (i: number) => {
    setGalleryIndex(i);
    if (!isDesktop) {
      mobileListRef.current?.scrollToIndex({ index: i, animated: true });
    }
  };

  const handleMainSwipeEnd = (e: any) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    if (newIndex !== galleryIndex) {
      setGalleryIndex(newIndex);
      thumbsScrollRef.current?.scrollTo({
        x: newIndex * 84,
        animated: true,
      });
    }
  };

  // Reviews
  const reviewsData = useFetch<{
    reviews: any[];
    count: number;
    average: number;
    distribution: any;
  }>(product ? `/products/${product.id}/reviews` : null, false, [product?.id]);

  const reviewSheet = useRef<BottomSheet>(null);

  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  const activeVariant = variant || product?.variants?.[0] || null;

  const discount =
    activeVariant && activeVariant.mrp > activeVariant.price
      ? Math.round(
          ((activeVariant.mrp - activeVariant.price) / activeVariant.mrp) * 100,
        )
      : 0;

  const onAdd = async (buyNow = false) => {
    if (!product || !activeVariant) return;

    setAdding(true);

    try {
      await addItem(product, activeVariant, qty);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (buyNow) {
        router.push("/(tabs)/cart");
      } else {
        show(`${product.name} added to cart`, "success");
      }
    } catch (e) {
      show(
        e instanceof ApiError ? e.message : "Could not add to cart",
        "error",
      );
    } finally {
      setAdding(false);
    }
  };

  const onShare = async () => {
    if (!product) return;

    await Share.share({
      message: `Check out ${product.name} from SUNSU — ${product.tagline}. sunsu://product/${product.slug}`,
    });
  };

  const submitReview = async () => {
    if (!token) {
      router.push("/auth");
      return;
    }

    if (!product) return;

    try {
      await api.post(
        `/products/${product.id}/reviews`,
        {
          rating,
          comment: reviewText,
        },
        true,
      );

      show("Thanks for your review!", "success");

      setReviewText("");

      reviewSheet.current?.close();

      reviewsData.reload();

      reload();
    } catch (e) {
      show(
        e instanceof ApiError ? e.message : "Could not submit review",
        "error",
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.wrap}>
        <AppHeader />
        <Skeleton height={screenWidth} />

        <View
          style={{
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <Skeleton height={26} width="70%" />

          <Skeleton height={16} width="50%" />

          <Skeleton height={40} width="40%" />
        </View>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.wrap}>
        <AppHeader />
        <View
          style={[
            {
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: spacing.xl,
            },
          ]}
        >
          <Feather name="alert-circle" size={40} color={colors.muted} />

          <Text style={styles.errText}>{error || "Product not found"}</Text>

          <Button
            title="Retry"
            onPress={reload}
            fullWidth={false}
            style={{
              marginTop: spacing.lg,
            }}
          />
        </View>
      </View>
    );
  }

  const wishlisted = isWishlisted(product.id);

  return (
    <View style={styles.wrap}>
      {/* =====================================================
          UNIVERSAL APP HEADER
      ====================================================== */}
      <AppHeader />

      {/* =====================================================
          MAIN PAGE SCROLL
      ====================================================== */}

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: isDesktop ? 40 : 120,
        }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        {/* =====================================================
            MOBILE ACTION BAR (Below AppHeader, above product image)
        ====================================================== */}
        {!isDesktop && (
          <View style={styles.mobileActionBar}>
            <Pressable
              style={styles.circleBtn}
              onPress={() => router.back()}
              testID="pdp-back"
            >
              <Feather name="chevron-left" size={22} color={colors.onSurface} />
            </Pressable>

            <View
              style={{
                flexDirection: "row",
                gap: spacing.sm,
              }}
            >
              <Pressable
                style={styles.circleBtn}
                onPress={onShare}
                testID="pdp-share"
              >
                <Feather name="share-2" size={18} color={colors.onSurface} />
              </Pressable>

              <Pressable
                style={styles.circleBtn}
                onPress={async () => {
                  const a = await toggle(product);

                  show(
                    a ? "Saved to wishlist" : "Removed",
                    a ? "success" : "info",
                  );
                }}
                testID="pdp-wishlist"
              >
                <Feather
                  name="heart"
                  size={18}
                  color={wishlisted ? colors.accent : colors.onSurface}
                />
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.pageContainer}>
          <View
            style={[
              styles.mainContainer,
              isDesktop && styles.mainContainerDesktop,
            ]}
          >
            {/* =================================================
                GALLERY SECTION
            ================================================== */}

            <View
              style={[
                styles.galleryColumn,
                isDesktop && styles.galleryColumnDesktop,
              ]}
            >
              {isDesktop ? (
                <View style={styles.desktopGalleryRow}>
                  {/* -----------------------------------------
                      VERTICAL THUMBNAILS
                  ------------------------------------------ */}
                  <View style={styles.verticalThumbsContainer}>
                    {product.images.map((img, i) => (
                      <Pressable
                        key={i}
                        onPress={() => handleThumbnailPress(i)}
                        style={[
                          styles.thumb,
                          i === galleryIndex && styles.thumbActive,
                        ]}
                      >
                        <Image
                          source={{
                            uri: img,
                          }}
                          style={styles.thumbImg}
                          contentFit="cover"
                        />
                      </Pressable>
                    ))}
                  </View>

                  {/* -----------------------------------------
                      MAIN DESKTOP IMAGE
                  ------------------------------------------ */}
                  <View style={styles.desktopMainImageCard}>
                    <Image
                      source={{
                        uri: product.images[galleryIndex],
                      }}
                      style={styles.desktopMainImage}
                      contentFit="contain"
                      transition={200}
                    />

                    {discount > 0 && (
                      <View style={styles.pdpDiscount}>
                        <Text style={styles.pdpDiscountText}>
                          {discount}% OFF
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                /* =================================================
                   MOBILE IMAGE CAROUSEL
                ================================================== */
                <View>
                  <FlatList
                    ref={mobileListRef}
                    data={product.images}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(_, i) => String(i)}
                    onMomentumScrollEnd={handleMainSwipeEnd}
                    getItemLayout={(_, index) => ({
                      length: screenWidth,
                      offset: screenWidth * index,
                      index,
                    })}
                    renderItem={({ item }) => (
                      <Image
                        source={{
                          uri: item,
                        }}
                        style={{
                          width: screenWidth,
                          height: screenWidth,
                        }}
                        contentFit="cover"
                        transition={200}
                      />
                    )}
                  />

                  {discount > 0 && (
                    <View style={styles.pdpDiscount}>
                      <Text style={styles.pdpDiscountText}>
                        {discount}% OFF
                      </Text>
                    </View>
                  )}

                  <View style={styles.dots}>
                    {product.images.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          i === galleryIndex && styles.dotActive,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* =================================================
                  MOBILE THUMBNAILS
              ================================================== */}

              {!isDesktop && (
                <ScrollView
                  ref={thumbsScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbs}
                >
                  {product.images.map((img, i) => (
                    <Pressable
                      key={i}
                      onPress={() => handleThumbnailPress(i)}
                      style={[
                        styles.thumb,
                        i === galleryIndex && styles.thumbActive,
                      ]}
                    >
                      <Image
                        source={{
                          uri: img,
                        }}
                        style={styles.thumbImg}
                        contentFit="cover"
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* =================================================
                PRODUCT INFORMATION
            ================================================== */}

            <View style={[styles.info, isDesktop && styles.infoDesktop]}>
              {/* Desktop action buttons row right above product name/info */}
              {isDesktop && (
                <View style={styles.desktopActionButtonsRow}>
                  <Pressable
                    style={styles.circleBtn}
                    onPress={() => router.back()}
                    testID="pdp-back"
                  >
                    <Feather
                      name="chevron-left"
                      size={22}
                      color={colors.onSurface}
                    />
                  </Pressable>

                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <Pressable
                      style={styles.circleBtn}
                      onPress={onShare}
                      testID="pdp-share"
                    >
                      <Feather
                        name="share-2"
                        size={18}
                        color={colors.onSurface}
                      />
                    </Pressable>

                    <Pressable
                      style={styles.circleBtn}
                      onPress={async () => {
                        const a = await toggle(product);
                        show(
                          a ? "Saved to wishlist" : "Removed",
                          a ? "success" : "info",
                        );
                      }}
                      testID="pdp-wishlist"
                    >
                      <Feather
                        name="heart"
                        size={18}
                        color={
                          wishlisted ? colors.accent : colors.onSurface
                        }
                      />
                    </Pressable>
                  </View>
                </View>
              )}

              <Text style={styles.name}>{product.name}</Text>

              <Text style={styles.aboutHeader}>About this item</Text>

              {product.tagline ? (
                <Text style={styles.bulletTextItem}>• {product.tagline}</Text>
              ) : null}

              {product.benefits?.map((benefit, idx) => (
                <Text key={idx} style={styles.bulletTextItem}>
                  • {benefit}
                </Text>
              ))}

              {/* =================================================
                  FEATURE BOX
              ================================================== */}

              <View style={styles.featureGrid}>
                <View style={styles.featureCol}>
                  <View style={styles.featureRowItem}>
                    <Feather name="check" size={14} color={colors.brand} />

                    <Text style={styles.featureText}>Complete Nutrition</Text>
                  </View>

                  <View style={styles.featureRowItem}>
                    <Feather name="check" size={14} color={colors.brand} />

                    <Text style={styles.featureText}>
                      Keeps You Full Longer
                    </Text>
                  </View>

                  <View style={styles.featureRowItem}>
                    <Feather name="check" size={14} color={colors.brand} />

                    <Text style={styles.featureText}>Natural & Healthy</Text>
                  </View>
                </View>

                <View style={styles.featureCol}>
                  <View style={styles.featureRowItem}>
                    <Feather name="check" size={14} color={colors.brand} />

                    <Text style={styles.featureText}>High Protein & Fiber</Text>
                  </View>

                  <View style={styles.featureRowItem}>
                    <Feather name="check" size={14} color={colors.brand} />

                    <Text style={styles.featureText}>No Preservatives</Text>
                  </View>

                  <View style={styles.featureRowItem}>
                    <Feather name="check" size={14} color={colors.brand} />

                    <Text style={styles.featureText}>Easy & Quick</Text>
                  </View>
                </View>
              </View>

              {/* =================================================
                  SELECT WEIGHT
              ================================================== */}

              <Text style={styles.sectionLabel}>Select Weight</Text>

              <View style={styles.variants}>
                {product.variants.map((v) => {
                  const active = activeVariant?.id === v.id;

                  const out = v.stock <= 0;

                  return (
                    <Pressable
                      key={v.id}
                      disabled={out}
                      style={[
                        styles.variantChip,
                        active && styles.variantActive,
                        out && styles.variantOut,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setVariant(v);
                      }}
                      testID={`variant-${v.id}`}
                    >
                      <Text
                        style={[
                          styles.variantWeight,
                          active && {
                            color: colors.brand,
                          },
                        ]}
                      >
                        {v.weight}
                      </Text>

                      {out && (
                        <Text style={styles.variantOutText}>Out of stock</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* =================================================
                  PRICE
              ================================================== */}

              <View style={styles.priceSectionBlock}>
                <Text style={styles.priceHeaderLabel}>Price</Text>

                <View style={styles.priceRow}>
                  {discount > 0 && (
                    <Text style={styles.discountBadge}>-{discount}%</Text>
                  )}

                  <Text style={styles.price}>
                    {activeVariant && rupee(activeVariant.price)}
                  </Text>
                </View>

                {discount > 0 && activeVariant && (
                  <Text style={styles.mrpText}>
                    M.R.P.:{" "}
                    <Text style={styles.mrpStrike}>
                      {rupee(activeVariant.mrp)}
                    </Text>
                  </Text>
                )}

                <Text style={styles.taxNote}>
                  Inclusive of all taxes. Shipping calculated at checkout.
                </Text>
              </View>

              {/* =================================================
                  TRUST BADGES
              ================================================== */}

              <View style={styles.trustBadgesRow}>
                <View style={styles.trustBadge}>
                  <Feather name="shield" size={14} color={colors.onSurface} />

                  <Text style={styles.trustBadgeText}>100% Natural</Text>
                </View>

                <View style={styles.trustBadge}>
                  <Feather name="truck" size={14} color={colors.onSurface} />

                  <Text style={styles.trustBadgeText}>Fast Delivery</Text>
                </View>
              </View>

              <View style={styles.qtyRow}>
                <Text style={styles.sectionLabel}>Quantity</Text>

                <QuantityStepper
                  value={qty}
                  min={1}
                  max={activeVariant?.stock || 10}
                  onChange={setQty}
                  testID="pdp-qty"
                />
              </View>

              {/* =================================================
                  DESKTOP ACTION BUTTONS
              ================================================== */}

              {isDesktop && (
                <View style={styles.desktopActionRow}>
                  <Button
                    title="Buy Now"
                    onPress={() => onAdd(true)}
                    style={styles.buyNowBtn}
                    testID="pdp-buy-now-desktop"
                  />

                  <Button
                    title="Add to Cart"
                    variant="secondary"
                    onPress={() => onAdd(false)}
                    loading={adding}
                    style={styles.addCartBtn}
                    testID="pdp-add-cart-desktop"
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* =====================================================
          MOBILE STICKY ACTION BAR
      ====================================================== */}

      {!isDesktop && (
        <View
          style={[
            styles.stickyBar,
            {
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
        >
          <Button
            title="Add to Cart"
            variant="secondary"
            onPress={() => onAdd(false)}
            loading={adding}
            style={{
              flex: 1,
            }}
            testID="pdp-add-cart"
          />

          <Button
            title="Buy Now"
            onPress={() => onAdd(true)}
            style={{
              flex: 1,
            }}
            testID="pdp-buy-now"
          />
        </View>
      )}

      {/* =====================================================
          REVIEW SHEET
      ====================================================== */}

      <BottomSheet
        ref={reviewSheet}
        index={-1}
        snapPoints={[420]}
        enablePanDownToClose
        keyboardBehavior="interactive"
        backdropComponent={(p) => (
          <BottomSheetBackdrop
            {...p}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
          />
        )}
        handleIndicatorStyle={{
          backgroundColor: colors.borderStrong,
        }}
        backgroundStyle={{
          backgroundColor: colors.card,
        }}
      >
        <KeyboardAwareScrollView
          ScrollViewComponent={BottomSheetScrollView}
          contentContainerStyle={styles.sheet}
          keyboardShouldPersistTaps="handled"
          bottomOffset={24}
        >
          <Text style={styles.sheetTitle}>Write a Review</Text>

          <Text style={styles.inputLabel}>Your rating</Text>

          <View
            style={{
              marginVertical: spacing.md,
            }}
          >
            <StarRow value={rating} onChange={setRating} />
          </View>

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

          <Button
            title="Submit Review"
            onPress={submitReview}
            style={{
              marginTop: spacing.lg,
            }}
            testID="review-submit"
          />
        </KeyboardAwareScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  /* =========================================================
     PAGE
  ========================================================== */

  wrap: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  pageContainer: {
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
  },

  mainContainer: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
  },

  mainContainerDesktop: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    paddingTop: 26,
    paddingBottom: spacing.xl,
    gap: 40,
    alignItems: "flex-start",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  /* =========================================================
     TOP BARS / ACTION BUTTONS
  ========================================================== */

  mobileActionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: "#FFFFFF",
  },

  desktopActionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
    borderWidth: 1,
    borderColor: colors.border,
  },

  /* =========================================================
     GALLERY
  ========================================================== */

  galleryColumn: {
    width: "100%",
    backgroundColor: "#FFFFFF",
  },

  galleryColumnDesktop: {
    width: 520,
  },

  desktopGalleryRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },

  /* =========================================================
     DESKTOP THUMBNAILS
  ========================================================== */

  verticalThumbsContainer: {
    width: 78,
    gap: 12,
    alignItems: "center",
  },

  thumb: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },

  thumbActive: {
    borderColor: "#10B981",
    borderWidth: 2.5,
    shadowColor: "#10B981",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  thumbImg: {
    width: "100%",
    height: "100%",
  },

  /* =========================================================
     MAIN PRODUCT IMAGE
  ========================================================== */

  desktopMainImageCard: {
    flex: 1,
    height: 610,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    padding: 0,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },

  desktopMainImage: {
    width: "100%",
    height: "100%",
  },

  pdpDiscount: {
    position: "absolute",
    bottom: spacing.md,
    left: spacing.md,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },

  pdpDiscountText: {
    color: colors.onAccent,
    fontFamily: font.bold,
    fontSize: fontSize.sm,
  },

  /* =========================================================
     MOBILE GALLERY
  ========================================================== */

  dots: {
    position: "absolute",
    bottom: spacing.md,
    alignSelf: "center",
    flexDirection: "row",
    gap: 5,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },

  dotActive: {
    width: 18,
    backgroundColor: "#FFFFFF",
  },

  thumbs: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },

  /* =========================================================
     PRODUCT INFO
  ========================================================== */

  info: {
    paddingHorizontal: spacing.lg,
    backgroundColor: "#FFFFFF",
  },

  infoDesktop: {
    flex: 1,
    paddingHorizontal: 0,
    maxWidth: 720,
  },

  name: {
    fontFamily: font.extrabold,
    fontSize: fontSize["3xl"],
    color: colors.onSurface,
    marginTop: spacing.xs,
    lineHeight: 42,
  },

  aboutHeader: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.onSurface,
    marginTop: spacing.md,
    marginBottom: 4,
  },

  bulletTextItem: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.onSurfaceMuted,
    lineHeight: 21,
    marginBottom: 4,
  },

  /* =========================================================
     FEATURE GRID
  ========================================================== */

  featureGrid: {
    flexDirection: "row",
    gap: spacing.xl,
    backgroundColor: "#FAFCFB",
    padding: spacing.md,
    borderRadius: 16,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  featureCol: {
    flex: 1,
    gap: 8,
  },

  featureRowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  featureText: {
    fontFamily: font.medium,
    fontSize: fontSize.xs,
    color: colors.onSurface,
  },

  /* =========================================================
     SECTION LABELS
  ========================================================== */

  sectionLabel: {
    fontFamily: font.bold,
    fontSize: fontSize.base,
    color: colors.onSurface,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  /* =========================================================
     VARIANTS
  ========================================================== */

  variants: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  variantChip: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E1E5E2",
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: "center",
  },

  variantActive: {
    borderColor: colors.brand,
    backgroundColor: "#E8F8EF",
  },

  variantOut: {
    opacity: 0.5,
  },

  variantWeight: {
    fontFamily: font.bold,
    fontSize: fontSize.base,
    color: colors.onSurface,
  },

  variantOutText: {
    fontFamily: font.semibold,
    fontSize: 9,
    color: colors.error,
    marginTop: 2,
  },

  /* =========================================================
     PRICE
  ========================================================== */

  priceSectionBlock: {
    marginTop: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
  },

  priceHeaderLabel: {
    fontFamily: font.semibold,
    fontSize: fontSize.xs,
    color: colors.muted,
    textTransform: "uppercase",
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 2,
  },

  discountBadge: {
    fontFamily: font.extrabold,
    fontSize: fontSize.xl,
    color: colors.accent,
  },

  price: {
    fontFamily: font.extrabold,
    fontSize: fontSize["3xl"],
    color: colors.onSurface,
  },

  mrpText: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: 2,
  },

  mrpStrike: {
    textDecorationLine: "line-through",
  },

  taxNote: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 2,
  },

  /* =========================================================
     TRUST BADGES
  ========================================================== */

  trustBadgesRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F7F5",
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },

  trustBadgeText: {
    fontFamily: font.medium,
    fontSize: fontSize.xs,
    color: colors.onSurface,
  },

  /* =========================================================
     DESKTOP ACTION BUTTONS
  ========================================================== */

  desktopActionRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },

  buyNowBtn: {
    flex: 1,
    backgroundColor: "#059669",
    minHeight: 52,
  },

  addCartBtn: {
    flex: 1,
    borderColor: "#059669",
    backgroundColor: "#FFFFFF",
    minHeight: 52,
  },

  /* =========================================================
     QUANTITY
  ========================================================== */

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  /* =========================================================
     PINCODE
  ========================================================== */

  pinBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5E2",
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    height: 54,
    marginTop: spacing.lg,
  },

  pinInput: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: fontSize.base,
    color: colors.onSurface,
  },

  pinCheck: {
    fontFamily: font.bold,
    fontSize: fontSize.base,
    color: colors.brand,
  },

  pinResult: {
    fontFamily: font.semibold,
    fontSize: fontSize.sm,
    color: colors.success,
    marginTop: spacing.sm,
  },

  /* =========================================================
     DESCRIPTION
  ========================================================== */

  description: {
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.onSurfaceMuted,
    lineHeight: 23,
    marginTop: spacing.lg,
  },

  /* =========================================================
     ACCORDIONS
  ========================================================== */

  accordion: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  accordionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
  },

  accordionTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.onSurface,
  },

  accordionBody: {
    paddingBottom: spacing.lg,
  },

  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  pill: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  pillText: {
    fontFamily: font.semibold,
    fontSize: fontSize.sm,
    color: colors.brand,
  },

  nutriRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },

  nutriLabel: {
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.onSurfaceMuted,
  },

  nutriValue: {
    fontFamily: font.semibold,
    fontSize: fontSize.base,
    color: colors.onSurface,
  },

  nutriNote: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: spacing.sm,
  },

  bullet: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: "flex-start",
  },

  bulletText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.onSurfaceMuted,
    lineHeight: 21,
  },

  bodyText: {
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.onSurfaceMuted,
    lineHeight: 21,
  },

  faqQ: {
    fontFamily: font.bold,
    fontSize: fontSize.base,
    color: colors.onSurface,
  },

  faqA: {
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.onSurfaceMuted,
    marginTop: 4,
    lineHeight: 21,
  },

  /* =========================================================
     REVIEWS
  ========================================================== */

  reviewsHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
  },

  reviewsTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.xl,
    color: colors.onSurface,
  },

  writeReview: {
    fontFamily: font.semibold,
    fontSize: fontSize.base,
    color: colors.brand,
  },

  reviewSummary: {
    flexDirection: "row",
    marginTop: spacing.md,
  },

  avgBox: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 4,
  },

  avgNum: {
    fontFamily: font.extrabold,
    fontSize: fontSize["3xl"],
    color: colors.onSurface,
  },

  avgCount: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
  },

  reviewItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: 6,
  },

  reviewItemHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  reviewer: {
    fontFamily: font.bold,
    fontSize: fontSize.base,
    color: colors.onSurface,
  },

  verified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  verifiedText: {
    fontFamily: font.medium,
    fontSize: fontSize.xs,
    color: colors.success,
  },

  reviewComment: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.onSurfaceMuted,
  },

  /* =========================================================
     RELATED PRODUCTS
  ========================================================== */

  relatedSectionContainer: {
    marginTop: spacing.xl,
    width: "100%",
    alignItems: "flex-start",
  },

  relatedHeaderTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.xl,
    color: colors.onSurface,
    textAlign: "left",
    alignSelf: "flex-start",
    marginBottom: spacing.md,
  },

  relatedFlatListContent: {
    paddingLeft: 0,
    paddingRight: spacing.lg,
    justifyContent: "flex-start",
  },

  /* =========================================================
     MOBILE STICKY BAR
  ========================================================== */

  stickyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  /* =========================================================
     REVIEW SHEET
  ========================================================== */

  sheet: {
    padding: spacing.lg,
  },

  sheetTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.xl,
    color: colors.onSurface,
  },

  inputLabel: {
    fontFamily: font.semibold,
    fontSize: fontSize.sm,
    color: colors.onSurface,
    marginTop: spacing.md,
  },

  reviewInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    height: 100,
    textAlignVertical: "top",
    marginTop: spacing.xs,
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.onSurface,
  },

  errText: {
    fontFamily: font.semibold,
    fontSize: fontSize.lg,
    color: colors.onSurface,
    marginTop: spacing.md,
    textAlign: "center",
  },
});