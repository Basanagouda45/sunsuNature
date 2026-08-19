import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, font, fontSize, radius, spacing } from '@/src/theme';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useFetch } from '@/src/hooks/useFetch';

const FAQS = [
  { q: 'How are SUNSU powders made?', a: 'We gently dehydrate fresh fruits and vegetables at low temperatures to preserve their natural nutrients, then finely mill them into powder — with no added sugar, colours or preservatives.' },
  { q: 'How do I use the powders?', a: 'Add 1–2 tsp to smoothies, milk, water, yogurt or your favourite recipes. Each product includes usage suggestions on its page.' },
  { q: 'What is the shelf life?', a: 'Our powders stay fresh for 12 months from manufacture when stored in a cool, dry place. Always reseal after use.' },
  { q: 'What are the delivery charges?', a: 'Shipping is ₹49 on orders below ₹999, and completely FREE above ₹999 across India.' },
  { q: 'Can I return a product?', a: 'Due to the nature of food products, we accept returns only for damaged or incorrect items. Contact support within 48 hours of delivery.' },
];

const LEGAL = ['Privacy Policy', 'Terms & Conditions', 'Shipping Policy', 'Return & Refund Policy', 'Cancellation Policy'];

export default function Support() {
  const { data: settings } = useFetch<any>('/settings');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const email = settings?.support_email || 'care@sunsu.in';
  const phone = settings?.support_phone || '+91 90000 00000';
  const whatsapp = settings?.whatsapp || '+919000000000';

  return (
    <View style={styles.wrap}>
      <ScreenHeader title="Help & Support" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <Text style={styles.sectionTitle}>Get in touch</Text>
        <View style={styles.contactRow}>
          <ContactCard icon="message-circle" label="WhatsApp" onPress={() => Linking.openURL(`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`)} testID="contact-whatsapp" />
          <ContactCard icon="phone" label="Call Us" onPress={() => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)} testID="contact-call" />
          <ContactCard icon="mail" label="Email" onPress={() => Linking.openURL(`mailto:${email}`)} testID="contact-email" />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Frequently Asked Questions</Text>
        <View style={styles.faqBox}>
          {FAQS.map((f, i) => (
            <View key={i} style={[styles.faqItem, i < FAQS.length - 1 && styles.faqBorder]}>
              <Pressable style={styles.faqHead} onPress={() => setOpenFaq(openFaq === i ? null : i)} testID={`faq-${i}`}>
                <Text style={styles.faqQ}>{f.q}</Text>
                <Feather name={openFaq === i ? 'minus' : 'plus'} size={18} color={colors.brand} />
              </Pressable>
              {openFaq === i && <Text style={styles.faqA}>{f.a}</Text>}
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Legal & Policies</Text>
        <View style={styles.legalBox}>
          {LEGAL.map((l, i) => (
            <Pressable key={l} style={[styles.legalRow, i < LEGAL.length - 1 && styles.faqBorder]} testID={`legal-${i}`}>
              <Text style={styles.legalText}>{l}</Text>
              <Feather name="chevron-right" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
        <Text style={styles.disclaimer}>
          SUNSU products are food items intended to support everyday wellness as part of a balanced diet. They are not intended to diagnose, treat, cure or prevent any disease.
        </Text>
      </ScrollView>
    </View>
  );
}

function ContactCard({ icon, label, onPress, testID }: { icon: any; label: string; onPress: () => void; testID: string }) {
  return (
    <Pressable style={styles.contactCard} onPress={onPress} testID={testID}>
      <View style={styles.contactIcon}><Feather name={icon} size={20} color={colors.brand} /></View>
      <Text style={styles.contactLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  sectionTitle: { fontFamily: font.bold, fontSize: fontSize.lg, color: colors.onSurface, marginBottom: spacing.md },
  contactRow: { flexDirection: 'row', gap: spacing.md },
  contactCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  contactIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.onSurface },
  faqBox: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  faqItem: { paddingHorizontal: spacing.lg },
  faqBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.lg },
  faqQ: { flex: 1, fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface, marginRight: spacing.md },
  faqA: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.onSurfaceMuted, lineHeight: 21, paddingBottom: spacing.lg },
  legalBox: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  legalText: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurface },
  disclaimer: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.muted, lineHeight: 18, marginTop: spacing.xl },
});
