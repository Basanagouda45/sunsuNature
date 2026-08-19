import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, font, fontSize, radius, spacing } from '@/src/theme';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { ApiError } from '@/src/api/client';
import { Button } from '@/src/components/Button';
import { SunLogo } from '@/src/components/SunLogo';

export default function Auth() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const { sendOtp, verifyOtp } = useAuth();
  const { show } = useToast();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const otpRef = useRef<TextInput>(null);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const onSend = async () => {
    if (phone.length !== 10) {
      show('Enter a valid 10-digit mobile number', 'error');
      return;
    }
    setLoading(true);
    try {
      const res: any = await sendOtp(phone);
      setStep('otp');
      setTimer(30);
      setDevOtp(res.dev_otp || null);
      setTimeout(() => otpRef.current?.focus(), 300);
      show('OTP sent successfully', 'success');
    } catch (e) {
      show(e instanceof ApiError ? e.message : 'Could not send OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (otp.length !== 6) {
      show('Enter the 6-digit OTP', 'error');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(phone, otp);
      show('Logged in successfully', 'success');
      const target = params.redirect ? String(params.redirect) : '/(tabs)';
      try {
        // @ts-ignore - dismiss any presented modal so navigation is reliable on native
        if (router.canDismiss?.()) router.dismissAll();
      } catch {}
      router.replace(target as any);
    } catch (e) {
      show(e instanceof ApiError ? e.message : 'Invalid OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (timer > 0) return;
    await onSend();
  };

  return (
    <View style={styles.wrap}>
      <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bottomOffset={24}>
        <View style={[styles.top, { paddingTop: insets.top + spacing.md }]}>
          <Pressable onPress={() => router.back()} hitSlop={10} testID="auth-close">
            <Feather name="x" size={24} color={colors.onSurface} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <SunLogo size={26} />
          <Text style={styles.heading}>{step === 'phone' ? 'Login or Sign up' : 'Verify your number'}</Text>
          <Text style={styles.sub}>
            {step === 'phone'
              ? 'Enter your mobile number to continue. We’ll send you a one-time password.'
              : `Enter the 6-digit code sent to +91 ${phone}`}
          </Text>

          {step === 'phone' ? (
            <View style={styles.phoneRow}>
              <View style={styles.prefix}>
                <Text style={styles.prefixText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ''))}
                autoFocus
                testID="phone-input"
              />
            </View>
          ) : (
            <>
              <TextInput
                ref={otpRef}
                style={styles.otpInput}
                placeholder="• • • • • •"
                placeholderTextColor={colors.border}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ''))}
                testID="otp-input"
              />
              {devOtp && (
                <View style={styles.devHint} testID="dev-otp-hint">
                  <Feather name="info" size={14} color={colors.info} />
                  <Text style={styles.devHintText}>Dev OTP: {devOtp}</Text>
                </View>
              )}
              <Pressable onPress={resend} disabled={timer > 0} testID="resend-otp">
                <Text style={[styles.resend, timer > 0 && { color: colors.muted }]}>
                  {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          title={step === 'phone' ? 'Send OTP' : 'Verify & Continue'}
          onPress={step === 'phone' ? onSend : onVerify}
          loading={loading}
          testID="auth-submit"
        />
        {step === 'otp' && (
          <Pressable onPress={() => { setStep('phone'); setOtp(''); }} style={styles.changeNumber}>
            <Text style={styles.changeNumberText}>Change mobile number</Text>
          </Pressable>
        )}
      </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  top: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  heading: { fontFamily: font.extrabold, fontSize: fontSize['3xl'], color: colors.onSurface, marginTop: spacing.xl },
  sub: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.muted, marginTop: spacing.sm, lineHeight: 21 },
  phoneRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  prefix: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  prefixText: { fontFamily: font.bold, fontSize: fontSize.lg, color: colors.onSurface },
  phoneInput: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, height: 54, fontFamily: font.semibold, fontSize: fontSize.lg, color: colors.onSurface },
  otpInput: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, height: 60, fontFamily: font.bold, fontSize: 26, letterSpacing: 8, textAlign: 'center', color: colors.onSurface, marginTop: spacing.xl },
  devHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, alignSelf: 'flex-start', backgroundColor: '#E0F2FE', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm },
  devHintText: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.info },
  resend: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.brand, marginTop: spacing.lg },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  changeNumber: { alignSelf: 'center', paddingVertical: spacing.xs },
  changeNumberText: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurfaceMuted },
});
