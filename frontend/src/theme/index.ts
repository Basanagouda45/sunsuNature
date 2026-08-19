// SUNSU design tokens — sourced from design_guidelines.json
export const colors = {
  surface: '#F7F5F0',
  onSurface: '#172017',
  card: '#FFFFFF',
  surfaceTertiary: '#EAE7DF',
  onSurfaceMuted: '#3B473B',
  inverse: '#172017',
  onInverse: '#F7F5F0',

  brand: '#15803D',
  brandDark: '#166534',
  onBrand: '#FFFFFF',
  brandSoft: '#DCFCE7',
  onBrandSoft: '#15803D',

  accent: '#E65100', // warm fruit orange
  onAccent: '#FFFFFF',
  accentSoft: '#FDE8D6',

  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#0891B2',

  border: '#E5E2D9',
  borderStrong: '#C2BDB0',
  divider: '#EAE7DF',

  star: '#F59E0B',
  muted: '#8A927F',
  overlay: 'rgba(23,32,23,0.55)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const font = {
  regular: 'PlusJakarta-Regular',
  medium: 'PlusJakarta-Medium',
  semibold: 'PlusJakarta-SemiBold',
  bold: 'PlusJakarta-Bold',
  extrabold: 'PlusJakarta-ExtraBold',
};

export const fontSize = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 34,
};

export const shadow = {
  card: {
    shadowColor: '#172017',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  soft: {
    shadowColor: '#172017',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  float: {
    shadowColor: '#172017',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
};

export const rupee = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
