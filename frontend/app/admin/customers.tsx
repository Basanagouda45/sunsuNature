import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, font, fontSize, radius, spacing, rupee } from '@/src/theme';
import { useAdmin } from '@/src/context/AdminContext';
import { adminApi } from '@/src/api/admin';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Skeleton } from '@/src/components/Skeleton';
import { EmptyState } from '@/src/components/EmptyState';

type Customer = { id: string; name?: string; phone?: string; email?: string; order_count: number; total_spend: number };

export default function AdminCustomers() {
  const router = useRouter();
  const { token, ready } = useAdmin();
  const [list, setList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (ready && !token) router.replace('/admin'); }, [ready, token, router]);

  const load = async () => {
    setLoading(true);
    try { setList(await adminApi.get<Customer[]>('/admin/customers')); } catch {}
    setLoading(false);
  };
  useFocusEffect(useCallback(() => { if (token) load(); }, [token]));

  return (
    <View style={styles.wrap}>
      <ScreenHeader title="Customers" onBack={() => router.replace('/admin/dashboard')} />
      {loading ? (
        <View style={styles.inner}>{[0, 1, 2].map((i) => <Skeleton key={i} height={72} round={radius.md} style={{ marginBottom: spacing.md }} />)}</View>
      ) : list.length === 0 ? (
        <EmptyState icon="users" title="No customers yet" subtitle="Customers appear here after they sign up." />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.inner}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`admin-customer-${item.id}`}>
              <View style={styles.avatar}><Feather name="user" size={18} color={colors.brand} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name || 'SUNSU Customer'}</Text>
                <Text style={styles.meta}>{item.phone ? `+91 ${item.phone}` : item.email || '—'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.spend}>{rupee(item.total_spend)}</Text>
                <Text style={styles.orders}>{item.order_count} orders</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  inner: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: spacing.lg },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  meta: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  spend: { fontFamily: font.extrabold, fontSize: fontSize.base, color: colors.onSurface },
  orders: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
});
