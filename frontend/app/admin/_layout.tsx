import { Stack } from 'expo-router';
import { AdminProvider } from '@/src/context/AdminContext';
import { colors } from '@/src/theme';

export default function AdminLayout() {
  return (
    <AdminProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />
    </AdminProvider>
  );
}
