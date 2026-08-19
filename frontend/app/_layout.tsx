import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';

import { useIconFonts } from '@/src/hooks/use-icon-fonts';
import { ToastProvider } from '@/src/context/ToastContext';
import { AuthProvider } from '@/src/context/AuthContext';
import { LocationProvider } from '@/src/context/LocationContext';
import { WishlistProvider } from '@/src/context/WishlistContext';
import { CartProvider } from '@/src/context/CartContext';
import { colors } from '@/src/theme';

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [iconsLoaded, iconError] = useIconFonts();
  const [fontsLoaded, fontError] = useFonts({
    'PlusJakarta-Regular': require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakarta-Medium': require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakarta-SemiBold': require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakarta-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'PlusJakarta-ExtraBold': require('../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
  });

  const ready = (iconsLoaded || iconError) && (fontsLoaded || fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
      <KeyboardProvider>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <AuthProvider>
            <LocationProvider>
              <WishlistProvider>
                <CartProvider>
                  <ToastProvider>
                    <StatusBar style="dark" />
                    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
                      <Stack.Screen name="location" options={{ presentation: 'modal' }} />
                    </Stack>
                  </ToastProvider>
                </CartProvider>
              </WishlistProvider>
            </LocationProvider>
          </AuthProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
