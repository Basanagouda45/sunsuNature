import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { colors, font, fontSize, radius, spacing } from '@/src/theme';
import { useLocation } from '@/src/context/LocationContext';
import { useToast } from '@/src/context/ToastContext';
import { Button } from '@/src/components/Button';

export default function LocationModal() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setByPincode, detectCurrentLocation } = useLocation();
  const { show } = useToast();
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const applyPin = async () => {
    if (pincode.length !== 6) { show('Enter a valid 6-digit PIN code', 'error'); return; }
    setLoading(true);
    try {
      const res = await setByPincode(pincode);
      show(`Delivering to ${res.city}`, 'success');
      router.back();
    } catch (e: any) {
      show(e?.message || 'Could not set location', 'error');
    } finally {
      setLoading(false);
    }
  };

  const current = async () => {
    setLocating(true);
    setBlocked(false);
    try {
      const res = await detectCurrentLocation();
      show(`Delivering to ${res.city}`, 'success');
      router.back();
    } catch (e: any) {
      if (e?.code === 'blocked') {
        setBlocked(true);
        show('Location permission is blocked', 'error');
      } else {
        show('Location permission needed to detect your area', 'info');
      }
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Delivery Location</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="location-close"><Feather name="x" size={24} color={colors.onSurface} /></Pressable>
      </View>
      <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bottomOffset={24}>
        <Text style={styles.sub}>Where should we deliver your order?</Text>

        <Pressable style={styles.currentBtn} onPress={current} disabled={locating} testID="use-current-location">
          <View style={styles.currentIcon}><Feather name="navigation" size={18} color={colors.brand} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.currentTitle}>{locating ? 'Detecting location…' : 'Use current location'}</Text>
            <Text style={styles.currentSub}>Detect your delivery area automatically</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.muted} />
        </Pressable>

        {blocked && (
          <Pressable style={styles.settingsBtn} onPress={() => Linking.openSettings()} testID="open-settings">
            <Feather name="settings" size={16} color={colors.brand} />
            <Text style={styles.settingsText}>Open Settings to enable location</Text>
          </Pressable>
        )}

        <View style={styles.divider}><Text style={styles.dividerText}>OR ENTER PIN CODE</Text></View>

        <View style={styles.pinRow}>
          <TextInput
            style={styles.pinInput}
            placeholder="6-digit PIN code"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={6}
            value={pincode}
            onChangeText={(t) => setPincode(t.replace(/[^0-9]/g, ''))}
            testID="location-pin-input"
          />
        </View>
        <Button title="Confirm Location" onPress={applyPin} loading={loading} style={{ marginTop: spacing.lg }} testID="location-confirm" />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  title: { fontFamily: font.extrabold, fontSize: fontSize.xl, color: colors.onSurface },
  content: { padding: spacing.lg },
  sub: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.muted, marginBottom: spacing.lg },
  currentBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  currentIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  currentTitle: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  currentSub: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted, marginTop: 1 },
  settingsBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, alignSelf: 'flex-start' },
  settingsText: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.brand },
  divider: { alignItems: 'center', marginVertical: spacing.xl },
  dividerText: { fontFamily: font.bold, fontSize: fontSize.xs, color: colors.muted, letterSpacing: 1 },
  pinRow: { flexDirection: 'row' },
  pinInput: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, height: 54, fontFamily: font.semibold, fontSize: fontSize.lg, color: colors.onSurface, letterSpacing: 2 },
});
