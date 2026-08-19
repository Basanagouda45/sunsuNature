import { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { colors, font, fontSize, radius, spacing } from '@/src/theme';
import { api, ApiError } from '@/src/api/client';
import { Address } from '@/src/types';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { EmptyState } from '@/src/components/EmptyState';
import { Button } from '@/src/components/Button';
import { useToast } from '@/src/context/ToastContext';

const EMPTY = { full_name: '', mobile: '', house: '', street: '', area: '', landmark: '', city: '', state: '', pincode: '', address_type: 'Home', is_default: false };
const TYPES = ['Home', 'Work', 'Other'];

export default function Addresses() {
  const { show } = useToast();
  const sheet = useRef<BottomSheet>(null);
  const [list, setList] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setList(await api.get<Address[]>('/addresses', true)); } catch {}
    setLoading(false);
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const openAdd = () => { setForm(EMPTY); setEditingId(null); sheet.current?.expand(); };
  const openEdit = (a: Address) => { setForm({ ...a }); setEditingId(a.id); sheet.current?.expand(); };

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    for (const f of ['full_name', 'mobile', 'house', 'street', 'city', 'state', 'pincode']) {
      if (!form[f]?.trim()) { show('Please fill all required fields', 'error'); return; }
    }
    setSaving(true);
    try {
      if (editingId) await api.put(`/addresses/${editingId}`, form, true);
      else await api.post('/addresses', form, true);
      show('Address saved', 'success');
      sheet.current?.close();
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : 'Could not save address', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try { await api.del(`/addresses/${id}`, true); show('Address removed', 'info'); load(); } catch {}
  };
  const setDefault = async (id: string) => {
    try { await api.put(`/addresses/${id}/default`, {}, true); load(); } catch {}
  };

  return (
    <View style={styles.wrap}>
      <ScreenHeader title="Saved Addresses" right={<Pressable onPress={openAdd} hitSlop={8} testID="add-address"><Feather name="plus" size={24} color={colors.brand} /></Pressable>} />
      {!loading && list.length === 0 ? (
        <EmptyState icon="map-pin" title="No saved addresses" subtitle="Add an address to speed up checkout." ctaTitle="Add Address" onPress={openAdd} testID="addresses-empty" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
          {list.map((a) => (
            <View key={a.id} style={styles.card} testID={`address-${a.id}`}>
              <View style={styles.cardHead}>
                <View style={styles.typeBadge}><Text style={styles.typeText}>{a.address_type}</Text></View>
                {a.is_default && <View style={styles.defaultBadge}><Text style={styles.defaultText}>DEFAULT</Text></View>}
              </View>
              <Text style={styles.name}>{a.full_name}</Text>
              <Text style={styles.addr}>{a.house}, {a.street}{a.area ? `, ${a.area}` : ''}</Text>
              <Text style={styles.addr}>{a.city}, {a.state} - {a.pincode}</Text>
              <Text style={styles.addr}>Mobile: {a.mobile}</Text>
              <View style={styles.actions}>
                {!a.is_default && <Pressable onPress={() => setDefault(a.id)} testID={`default-${a.id}`}><Text style={styles.actionText}>Set Default</Text></Pressable>}
                <Pressable onPress={() => openEdit(a)} testID={`edit-${a.id}`}><Text style={styles.actionText}>Edit</Text></Pressable>
                <Pressable onPress={() => remove(a.id)} testID={`delete-${a.id}`}><Text style={[styles.actionText, { color: colors.error }]}>Delete</Text></Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <BottomSheet
        ref={sheet}
        index={-1}
        snapPoints={['85%']}
        enablePanDownToClose
        keyboardBehavior="interactive"
        backdropComponent={(p) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />}
        handleIndicatorStyle={{ backgroundColor: colors.borderStrong }}
        backgroundStyle={{ backgroundColor: colors.card }}
      >
        <KeyboardAwareScrollView ScrollViewComponent={BottomSheetScrollView} contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled" bottomOffset={24}>
          <Text style={styles.sheetTitle}>{editingId ? 'Edit Address' : 'Add Address'}</Text>
          <Field label="Full Name *" value={form.full_name} onChange={(v) => set('full_name', v)} testID="af-name" />
          <Field label="Mobile Number *" value={form.mobile} onChange={(v) => set('mobile', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={10} testID="af-mobile" />
          <Field label="House / Flat No. *" value={form.house} onChange={(v) => set('house', v)} testID="af-house" />
          <Field label="Street / Locality *" value={form.street} onChange={(v) => set('street', v)} testID="af-street" />
          <Field label="Area" value={form.area} onChange={(v) => set('area', v)} testID="af-area" />
          <Field label="Landmark" value={form.landmark} onChange={(v) => set('landmark', v)} testID="af-landmark" />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}><Field label="City *" value={form.city} onChange={(v) => set('city', v)} testID="af-city" /></View>
            <View style={{ flex: 1 }}><Field label="State *" value={form.state} onChange={(v) => set('state', v)} testID="af-state" /></View>
          </View>
          <Field label="PIN Code *" value={form.pincode} onChange={(v) => set('pincode', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={6} testID="af-pincode" />
          <Text style={styles.fieldLabel}>Address Type</Text>
          <View style={styles.typeRow}>
            {TYPES.map((t) => (
              <Pressable key={t} style={[styles.typeChip, form.address_type === t && styles.typeChipActive]} onPress={() => set('address_type', t)} testID={`af-type-${t}`}>
                <Text style={[styles.typeChipText, form.address_type === t && { color: colors.brand }]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.defaultToggle} onPress={() => set('is_default', !form.is_default)} testID="af-default">
            <Feather name={form.is_default ? 'check-square' : 'square'} size={20} color={colors.brand} />
            <Text style={styles.defaultToggleText}>Set as default address</Text>
          </Pressable>
          <Button title="Save Address" onPress={save} loading={saving} style={{ marginTop: spacing.lg }} testID="af-save" />
        </KeyboardAwareScrollView>
      </BottomSheet>
    </View>
  );
}

function Field({ label, value, onChange, keyboardType, maxLength, testID }: any) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType={keyboardType} maxLength={maxLength} placeholderTextColor={colors.muted} testID={testID} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  cardHead: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  typeBadge: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  typeText: { fontFamily: font.bold, fontSize: fontSize.xs, color: colors.onSurfaceMuted },
  defaultBadge: { backgroundColor: colors.brandSoft, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  defaultText: { fontFamily: font.bold, fontSize: fontSize.xs, color: colors.brand },
  name: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  addr: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.onSurfaceMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  actionText: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.brand },
  sheet: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  sheetTitle: { fontFamily: font.bold, fontSize: fontSize.xl, color: colors.onSurface, marginBottom: spacing.lg },
  fieldLabel: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.onSurfaceMuted, marginBottom: spacing.xs },
  input: { backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 48, fontFamily: font.medium, fontSize: fontSize.base, color: colors.onSurface },
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  typeChip: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  typeChipActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  typeChipText: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurfaceMuted },
  defaultToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  defaultToggleText: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurface },
});
