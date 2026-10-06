import { SunLogo } from "@/src/components/SunLogo";
import { colors, font, fontSize, spacing } from "@/src/theme";
import { useRouter } from "expo-router"; // Added for router.push
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"; // Added Text and StyleSheet

export default function Footer() {
    const router = useRouter(); // Initialized the router
    const FOOTER_LINKS = ['About Sunsu', 'Contact', 'FAQ', 'Shipping', 'Returns', 'Privacy Policy', 'Terms', 'Refund Policy'];

    return (
      <View>
        <ScrollView>
          <View style={styles.footer}>
                <SunLogo size={18} />
                <Text style={styles.footerTag}>Nature, Dehydrated. Goodness, Preserved.</Text>
                <View style={styles.footerLinks}>
                  {FOOTER_LINKS.map((l) => (
                    <Pressable key={l} onPress={() => router.push('/support')}>
                      <Text style={styles.footerLink}>{l}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.footerCopy}>© 2026 SUNSU • Made in India</Text>
          </View>
        </ScrollView>
      </View>
    );
};

const styles = StyleSheet.create({
   footer: { marginTop: spacing.xxl, paddingHorizontal: spacing.lg, alignItems: 'center', gap: spacing.md },
   footerTag: { fontFamily: font.medium, fontSize: fontSize.xs, color: colors.muted },
   footerLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
   footerLink: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.onSurfaceMuted },
   footerCopy: { fontFamily: font.regular, fontSize: 10, color: colors.muted, marginTop: spacing.xs },
});