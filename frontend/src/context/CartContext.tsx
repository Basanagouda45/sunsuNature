import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { storage } from '@/src/utils/storage';
import { api } from '@/src/api/client';
import { useAuth } from './AuthContext';
import { CartItem, Product, Totals, Variant } from '@/src/types';

const KEY = 'sunsu_guest_cart';
const FREE_SHIP = 999;
const SHIP = 49;

const emptyTotals = (): Totals => ({
  subtotal: 0,
  mrp_total: 0,
  product_discount: 0,
  coupon_discount: 0,
  coupon_code: null,
  coupon_error: null,
  shipping: 0,
  free_shipping_threshold: FREE_SHIP,
  tax: 0,
  total: 0,
  item_count: 0,
});

function computeGuestTotals(items: CartItem[]): Totals {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const mrp_total = items.reduce((s, i) => s + i.mrp * i.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIP ? 0 : SHIP;
  return {
    subtotal,
    mrp_total,
    product_discount: mrp_total - subtotal,
    coupon_discount: 0,
    coupon_code: null,
    coupon_error: null,
    shipping,
    free_shipping_threshold: FREE_SHIP,
    tax: 0,
    total: subtotal + shipping,
    item_count: items.reduce((s, i) => s + i.quantity, 0),
  };
}

type CartCtx = {
  items: CartItem[];
  totals: Totals;
  itemCount: number;
  loading: boolean;
  addItem: (product: Product, variant: Variant, qty?: number) => Promise<void>;
  updateQty: (product_id: string, variant_id: string, qty: number) => Promise<void>;
  removeItem: (product_id: string, variant_id: string) => Promise<void>;
  clear: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<CartCtx>({} as CartCtx);
export const useCart = () => useContext(Ctx);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { token, ready } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [totals, setTotals] = useState<Totals>(emptyTotals());
  const [loading, setLoading] = useState(false);
  const prevToken = useRef<string | null>(null);

  const persistGuest = async (next: CartItem[]) => {
    setItems(next);
    setTotals(computeGuestTotals(next));
    await storage.setItem(KEY, JSON.stringify(next));
  };

  const loadGuest = async () => {
    const raw = await storage.getItem<string>(KEY, '');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CartItem[];
        setItems(parsed);
        setTotals(computeGuestTotals(parsed));
        return;
      } catch {}
    }
    setItems([]);
    setTotals(emptyTotals());
  };

  const applyServer = (res: { items: CartItem[]; totals: Totals }) => {
    setItems(res.items);
    setTotals(res.totals);
  };

  const refresh = async () => {
    if (token) {
      setLoading(true);
      try {
        applyServer(await api.get('/cart', true));
      } catch {}
      setLoading(false);
    } else {
      await loadGuest();
    }
  };

  // React to auth changes: merge guest cart into server on login
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const wasGuest = prevToken.current === null;
      if (token) {
        if (wasGuest) {
          const raw = await storage.getItem<string>(KEY, '');
          let guest: CartItem[] = [];
          if (raw) {
            try {
              guest = JSON.parse(raw);
            } catch {}
          }
          setLoading(true);
          try {
            if (guest.length) {
              applyServer(
                await api.post(
                  '/cart/merge',
                  guest.map((g) => ({
                    product_id: g.product_id,
                    variant_id: g.variant_id,
                    quantity: g.quantity,
                  })),
                  true,
                ),
              );
              await storage.removeItem(KEY);
            } else {
              applyServer(await api.get('/cart', true));
            }
          } catch {}
          setLoading(false);
        }
      } else {
        // logged out -> guest cart
        await loadGuest();
      }
      prevToken.current = token;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, ready]);

  const addItem = async (product: Product, variant: Variant, qty = 1) => {
    if (token) {
      applyServer(
        await api.post('/cart/items', { product_id: product.id, variant_id: variant.id, quantity: qty }, true),
      );
      return;
    }
    const next = [...items];
    const existing = next.find((i) => i.product_id === product.id && i.variant_id === variant.id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + qty, variant.stock);
      existing.line_total = existing.price * existing.quantity;
    } else {
      next.push({
        product_id: product.id,
        variant_id: variant.id,
        slug: product.slug,
        name: product.name,
        image: product.images?.[0],
        category_slug: product.category_slug,
        weight: variant.weight,
        price: variant.price,
        mrp: variant.mrp,
        quantity: qty,
        available_stock: variant.stock,
        in_stock: variant.stock > 0,
        line_total: variant.price * qty,
      });
    }
    await persistGuest(next);
  };

  const updateQty = async (product_id: string, variant_id: string, qty: number) => {
    if (token) {
      applyServer(await api.put('/cart/items', { product_id, variant_id, quantity: qty }, true));
      return;
    }
    let next = [...items];
    if (qty <= 0) {
      next = next.filter((i) => !(i.product_id === product_id && i.variant_id === variant_id));
    } else {
      const item = next.find((i) => i.product_id === product_id && i.variant_id === variant_id);
      if (item) {
        item.quantity = Math.min(qty, item.available_stock);
        item.line_total = item.price * item.quantity;
      }
    }
    await persistGuest(next);
  };

  const removeItem = async (product_id: string, variant_id: string) => {
    if (token) {
      applyServer(await api.del(`/cart/items?product_id=${product_id}&variant_id=${variant_id}`, true));
      return;
    }
    await persistGuest(items.filter((i) => !(i.product_id === product_id && i.variant_id === variant_id)));
  };

  const clear = async () => {
    if (token) {
      applyServer(await api.del('/cart', true));
      return;
    }
    await persistGuest([]);
  };

  const applyCoupon = async (code: string) => {
    applyServer(await api.post('/cart/apply-coupon', { code }, true));
  };

  const removeCoupon = async () => {
    applyServer(await api.del('/cart/coupon', true));
  };

  return (
    <Ctx.Provider
      value={{
        items,
        totals,
        itemCount: totals.item_count,
        loading,
        addItem,
        updateQty,
        removeItem,
        clear,
        applyCoupon,
        removeCoupon,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
