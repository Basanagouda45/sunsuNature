export type Variant = {
  id: string;
  weight: string;
  price: number;
  mrp: number;
  stock: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  short_description?: string;
  description?: string;
  category_slug: string;
  category_name?: string;
  needs: string[];
  dietary: string[];
  ingredients: string[];
  nutrition: { label: string; value: string }[];
  benefits: string[];
  how_to_use: string[];
  storage?: string;
  shelf_life?: string;
  allergen_info?: string;
  faqs: { q: string; a: string }[];
  images: string[];
  variants: Variant[];
  rating: number;
  review_count: number;
  is_best_seller: boolean;
  is_new: boolean;
  related?: Product[];
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  image?: string;
  accent?: string;
};

export type Banner = {
  id: string;
  title: string;
  subtitle?: string;
  cta_text?: string;
  cta_target?: string;
  image: string;
  accent?: string;
};

export type CartItem = {
  product_id: string;
  variant_id: string;
  slug: string;
  name: string;
  image?: string;
  category_slug: string;
  weight: string;
  price: number;
  mrp: number;
  quantity: number;
  available_stock: number;
  in_stock: boolean;
  line_total: number;
};

export type Totals = {
  subtotal: number;
  mrp_total: number;
  product_discount: number;
  coupon_discount: number;
  coupon_code: string | null;
  coupon_error: string | null;
  shipping: number;
  free_shipping_threshold: number;
  tax: number;
  total: number;
  item_count: number;
};

export type Address = {
  id: string;
  full_name: string;
  mobile: string;
  house: string;
  street: string;
  area?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  address_type: string;
  is_default: boolean;
};

export type Order = {
  id: string;
  order_number: string;
  items: CartItem[];
  address: Address;
  subtotal: number;
  discount: number;
  coupon_discount: number;
  coupon_code?: string;
  shipping: number;
  tax: number;
  total: number;
  payment_method: string;
  payment_status: string;
  status: string;
  status_history: { status: string; at: string }[];
  tracking_number?: string;
  estimated_delivery?: string;
  created_at: string;
  status_flow?: string[];
};
