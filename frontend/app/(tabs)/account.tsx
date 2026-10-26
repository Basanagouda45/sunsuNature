
import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { colors, font, fontSize, radius, shadow, spacing } from "@/src/theme";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { Button } from "@/src/components/Button";
import { SunLogo } from "@/src/components/SunLogo";
import Footer from "./footer";

const MENU: { icon: any; label: string; route: string; auth?: boolean }[] = [
  { icon: "package", label: "My Orders", route: "/orders", auth: true },
  { icon: "heart", label: "Wishlist", route: "/wishlist" },
  {
    icon: "map-pin",
    label: "Saved Addresses",
    route: "/addresses",
    auth: true,
  },
  { icon: "tag", label: "Coupons & Offers", route: "/coupons" },
  { icon: "help-circle", label: "Help & Support", route: "/support" },
  { icon: "file-text", label: "Legal & Policies", route: "/support" },
  { icon: "shield", label: "Admin Portal", route: "/admin" },
];

export default function Account() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, logout, updateProfile } = useAuth();
  const { show } = useToast();
  const editSheet = useRef<BottomSheet>(null);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  const go = (item: (typeof MENU)[number]) => {
    if (item.auth && !token) {
      router.push({ pathname: "/auth", params: { redirect: item.route } });
      return;
    }
    router.push(item.route as any);
  };

  const saveProfile = async () => {
    try {
      await updateProfile({ name, email });
      show("Profile updated", "success");
      editSheet.current?.close();
    } catch {
      show("Could not update profile", "error");
    }
  };
  const CustomBottomSheetScrollView = (props: any) => (
    <BottomSheetScrollView {...props} />
  );

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>Account</Text>
      </View>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        {token && user ? (
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Feather name="user" size={26} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>
                {user.name || "SUNSU Customer"}
              </Text>
              <Text style={styles.profilePhone}>
                {user.phone ? `+91 ${user.phone}` : user.email}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setName(user.name || "");
                setEmail(user.email || "");
                editSheet.current?.expand();
              }}
              hitSlop={8}
              testID="edit-profile"
            >
              <Feather name="edit-2" size={18} color={colors.brand} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.loginCard}>
            <Text style={styles.loginTitle}>Welcome to SUNSU</Text>
            <Text style={styles.loginSub}>
              Log in to track orders, save addresses & unlock offers.
            </Text>
            <Button
              title="Login / Sign Up"
              onPress={() => router.push("/auth")}
              testID="account-login"
              style={{ marginTop: spacing.md }}
            />
          </View>
        )}

        {/* Menu */}
        <View style={styles.menu}>
          {MENU.map((item, i) => (
            <Pressable
              key={item.label}
              style={[styles.menuRow, i < MENU.length - 1 && styles.menuBorder]}
              onPress={() => go(item)}
              testID={`menu-${item.label}`}
            >
              <View style={styles.menuIcon}>
                <Feather name={item.icon} size={18} color={colors.brand} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={20} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        {token && (
          <Pressable
            style={styles.logout}
            onPress={async () => {
              await logout();
              show("Logged out", "info");
            }}
            testID="logout-button"
          >
            <Feather name="log-out" size={18} color={colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        )}

        <View style={styles.brandFooter}>
         <Footer/>
        </View>
      </ScrollView>

      <BottomSheet
        ref={editSheet}
        index={-1}
        snapPoints={[360]}
        enablePanDownToClose
        keyboardBehavior="interactive"
        backdropComponent={(p) => (
          <BottomSheetBackdrop
            {...p}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
          />
        )}
        handleIndicatorStyle={{ backgroundColor: colors.borderStrong }}
        backgroundStyle={{ backgroundColor: colors.card }}
      >
        // Inside your component render:
        <KeyboardAwareScrollView
          ScrollViewComponent={CustomBottomSheetScrollView}
          contentContainerStyle={styles.sheet}
          keyboardShouldPersistTaps="handled"
          bottomOffset={24}
        >
          <Text style={styles.sheetTitle}>Edit Profile</Text>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.muted}
            testID="profile-name"
          />
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            testID="profile-email"
          />
          <Button
            title="Save Changes"
            onPress={saveProfile}
            style={{ marginTop: spacing.lg }}
            testID="profile-save"
          />
        </KeyboardAwareScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: font.extrabold,
    fontSize: fontSize["2xl"],
    color: colors.onSurface,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.soft,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.onSurface,
  },
  profilePhone: {
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.muted,
    marginTop: 2,
  },
  loginCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.soft,
  },
  loginTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.xl,
    color: colors.onSurface,
  },
  loginSub: {
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.muted,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  menu: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontFamily: font.semibold,
    fontSize: fontSize.base,
    color: colors.onSurface,
  },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: {
    fontFamily: font.bold,
    fontSize: fontSize.base,
    color: colors.error,
  },
  brandFooter: {
    alignItems: "center",
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  version: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  sheet: { padding: spacing.lg },
  sheetTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.xl,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontFamily: font.semibold,
    fontSize: fontSize.sm,
    color: colors.onSurfaceMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: font.medium,
    fontSize: fontSize.base,
    color: colors.onSurface,
  },
});
