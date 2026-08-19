import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, font, fontSize, radius, shadow, spacing, rupee } from '@/src/theme';
import { useAdmin } from '@/src/context/AdminContext';
import { adminApi } from '@/src/api/admin';
import { Skeleton } from '@/src/components/Skeleton';

const { width } = Dimensions.get('window');
const CONTENT = Math.min(width, 900);
const STAT_W = (CONTENT - spacing.lg * 2 - spacing.md) / 2;

type Dash = {
  revenue: number; total_orders: number; customers: number; products: number;
  average_order_value: number; best_sellers: { name: string; units: number }[];
  low_stock: { name: string; weight: string; stock: number }[];
};

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, ready, admin, logout } = useAdmin();
  const [data, setData] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !token) router.replace('/admin');
  }, [ready, token, router]);

  const load = async () => {
    setLoading(true);
    try { setData(await adminApi.get<Dash>('/admin/dashboard')); } catch {}
    setLoading(false);
  };
  useFocusEffect(useCallback(() => { if (token) load(); }, [token]));

  const stats = data
    ? [
        { label: 'Revenue', value: rupee(data.revenue), icon: 'trending-up', color: colors.brand },
        { label: 'Orders', value: String(data.total_orders), icon: 'shopping-bag', color: colors.accent },
        { label: 'Customers', value: String(data.customers), icon: 'users', color: colors.info },
        { label: 'Avg Order Value', value: rupee(data.average_order_value), icon: 'bar-chart-2', color: colors.warning },
      ]
    : [];

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerInner}>
          <View>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.hi}>{admin?.email}</Text>
          </View>
          <Pressable onPress={async () => { await logout(); router.replace('/admin'); }} style={styles.logout} testID="admin-logout">
            <Feather name="log-out" size={18} color={colors.error} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
      >
        <View style={styles.inner}>
          {/* Stat cards */}
          <View style={styles.statGrid}>
            {loading
              ? [0, 1, 2, 3].map((i) => <Skeleton key={i} width={STAT_W} height={92} round={radius.md} />)
              : stats.map((s) => (
                  <View key={s.label} style={[styles.stat, { width: STAT_W }]}>
                    <View style={[styles.statIcon, { backgroundColor: s.color + '22' }]}>
                      <Feather name={s.icon as any} size={18} color={s.color} />
                    </View>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
          </View>

          {/* Nav */}
          <Pressable style={styles.navBtn} onPress={() => router.push('/admin/orders')} testID="admin-nav-orders">
            <View style={styles.navIcon}><Feather name="package" size={20} color={colors.brand} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Manage Orders</Text>
              <Text style={styles.navSub}>View orders & update tracking status</Text>
            </View>
            <Feather name="chevron-right" size={22} color={colors.muted} />
          </Pressable>
          <Pressable style={styles.navBtn} onPress={() => router.push('/admin/customers')} testID="admin-nav-customers">
            <View style={styles.navIcon}><Feather name="users" size={20} color={colors.brand} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>Customers</Text>
              <Text style={styles.navSub}>{data?.customers ?? 0} registered customers</Text>
            </View>
            <Feather name="chevron-right" size={22} color={colors.muted} />
          </Pressable>

          {/* Best sellers */}
          <Text style={styles.sectionTitle}>Best Sellers</Text>
          <View style={styles.listCard}>
            {(data?.best_sellers || []).length === 0 && !loading ? (
              <Text style={styles.empty}>No sales yet</Text>
            ) : (
              (data?.best_sellers || []).map((b, i) => (
                <View key={b.name} style={[styles.listRow, i > 0 && styles.listBorder]}>
                  <Text style={styles.listName}>{b.name}</Text>
                  <Text style={styles.listVal}>{b.units} sold</Text>
                </View>
              ))
            )}
          </View>

          {/* Low stock */}
          <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
          <View style={styles.listCard}>
            {(data?.low_stock || []).length === 0 && !loading ? (
              <Text style={styles.empty}>All items well stocked</Text>
            ) : (
              (data?.low_stock || []).map((l, i) => (
                <View key={`${l.name}-${l.weight}`} style={[styles.listRow, i > 0 && styles.listBorder]}>
                  <Text style={styles.listName}>{l.name} • {l.weight}</Text>
                  <Text style={[styles.listVal, { color: l.stock <= 5 ? colors.error : colors.warning }]}>{l.stock} left</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: spacing.md },
  headerInner: { width: '100%', maxWidth: 900, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  title: { fontFamily: font.extrabold, fontSize: fontSize['2xl'], color: colors.onSurface },
  hi: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted },
  logout: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: spacing.xxxl },
  inner: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: spacing.lg },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, ...shadow.soft },
  statIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statValue: { fontFamily: font.extrabold, fontSize: fontSize.xl, color: colors.onSurface },
  statLabel: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginTop: spacing.md },
  navIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.onSurface },
  navSub: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.muted, marginTop: 1 },
  sectionTitle: { fontFamily: font.bold, fontSize: fontSize.lg, color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.md },
  listCard: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  listBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  listName: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.onSurface, flex: 1 },
  listVal: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.brand },
  empty: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.muted, paddingVertical: spacing.lg, textAlign: 'center' },
});
