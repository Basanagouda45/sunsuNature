import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, radius, spacing } from '@/src/theme';
import { useAdmin } from '@/src/context/AdminContext';
import { AdminApiError } from '@/src/api/admin';
import { Button } from '@/src/components/Button';
import { useToast } from '@/src/context/ToastContext';

export default function AdminLogin() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, ready, login } = useAdmin();
  const { show } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && token) router.replace('/admin/dashboard');
  }, [ready, token, router]);

  const submit = async () => {
    if (!email.trim() || !password) {
      show('Enter email and password', 'error');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/admin/dashboard');
    } catch (e) {
      show(e instanceof AdminApiError ? e.message : 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView style={styles.wrap} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: insets.top }} keyboardShouldPersistTaps="handled" bottomOffset={24}>
        <View style={styles.card}>
          <View style={styles.logo}>
            <Feather name="shield" size={28} color={colors.onBrand} />
          </View>
          <Text style={styles.title}>SUNSU Admin</Text>
          <Text style={styles.sub}>Sign in to manage orders, products & coupons</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@sunsu.in"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            testID="admin-email"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            secureTextEntry
            testID="admin-password"
          />
          <Button title="Sign In" onPress={submit} loading={loading} style={{ marginTop: spacing.lg }} testID="admin-login-submit" />
        </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  card: { width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, margin: spacing.lg },
  logo: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { fontFamily: font.extrabold, fontSize: fontSize['2xl'], color: colors.onSurface, textAlign: 'center', marginTop: spacing.lg },
  sub: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.muted, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },
  label: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.onSurfaceMuted, marginBottom: spacing.xs, marginTop: spacing.md },
  input: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 50, fontFamily: font.medium, fontSize: fontSize.base, color: colors.onSurface },
});
