import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { colors, font } from '@/src/theme';
import { useCart } from '@/src/context/CartContext';

function CartIcon({ color, size }: { color: string; size: number }) {
  const { itemCount } = useCart();
  return (
    <View>
      <Feather name="shopping-bag" size={size} color={color} />
      {itemCount > 0 && (
        <View style={styles.badge} testID="cart-badge">
          <Text style={styles.badgeText}>{itemCount > 9 ? '9+' : itemCount}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 86 : 66,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} /> }} />
      <Tabs.Screen name="categories" options={{ title: 'Categories', tabBarIcon: ({ color, size }) => <Feather name="layers" size={size} color={color} /> }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart', tabBarIcon: ({ color, size }) => <CartIcon color={color} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: colors.accent,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.onAccent, fontFamily: font.bold, fontSize: 10 },
});
