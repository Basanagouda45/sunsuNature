import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { storage } from '@/src/utils/storage';
import { colors, font, fontSize, radius, spacing } from '@/src/theme';
import { Button } from '@/src/components/Button';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    image: 'https://images.pexels.com/photos/39060097/pexels-photo-39060097.jpeg?auto=compress&cs=tinysrgb&w=1000',
    title: 'Real Ingredients.\nCarefully Dehydrated.',
    subtitle: 'We gently dry real fruits and vegetables to lock in their natural goodness.',
  },
  {
    image: 'https://images.pexels.com/photos/5208223/pexels-photo-5208223.jpeg?auto=compress&cs=tinysrgb&w=1000',
    title: 'Nutrition Made\nConvenient.',
    subtitle: 'Premium powders and blends crafted for your everyday wellness.',
  },
  {
    image: 'https://images.pexels.com/photos/1793035/pexels-photo-1793035.jpeg?auto=compress&cs=tinysrgb&w=1000',
    title: 'Mix. Enjoy.\nLive Better.',
    subtitle: 'Add to smoothies, milk, water or recipes — delicious in seconds.',
  },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const finish = async () => {
    await storage.setItem('sunsu_onboarded', true);
    router.replace('/(tabs)');
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
    } else {
      finish();
    }
  };

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <Image source={{ uri: item.image }} style={styles.image} contentFit="cover" transition={200} />
            <LinearGradient colors={['transparent', 'rgba(23,32,23,0.35)', colors.inverse]} style={styles.scrim} />
            <View style={[styles.textWrap, { paddingBottom: insets.bottom + 190 }]}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button title={index === SLIDES.length - 1 ? 'Get Started' : 'Next'} onPress={next} testID="onboarding-next" />
        <Pressable onPress={finish} style={styles.skip} testID="onboarding-skip">
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.inverse },
  image: { width, height: '100%', position: 'absolute' },
  scrim: { ...StyleSheet.absoluteFillObject },
  textWrap: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.xl },
  title: { fontFamily: font.extrabold, fontSize: fontSize['4xl'], color: colors.onInverse, lineHeight: 40 },
  subtitle: { fontFamily: font.regular, fontSize: fontSize.lg, color: 'rgba(247,245,240,0.85)', marginTop: spacing.md, lineHeight: 24 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: spacing.xl, gap: spacing.md },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(247,245,240,0.4)' },
  dotActive: { width: 22, backgroundColor: colors.onInverse },
  skip: { alignSelf: 'center', paddingVertical: spacing.sm },
  skipText: { fontFamily: font.semibold, fontSize: fontSize.base, color: 'rgba(247,245,240,0.8)' },
});
