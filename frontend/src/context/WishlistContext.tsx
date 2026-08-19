import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '@/src/utils/storage';
import { api } from '@/src/api/client';
import { useAuth } from './AuthContext';
import { Product } from '@/src/types';

const KEY = 'sunsu_wishlist';

type WishlistCtx = {
  ids: string[];
  products: Product[];
  loading: boolean;
  isWishlisted: (id: string) => boolean;
  toggle: (product: Product) => Promise<boolean>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<WishlistCtx>({} as WishlistCtx);
export const useWishlist = () => useContext(Ctx);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { token, ready } = useAuth();
  const [ids, setIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLocal = async () => {
    const raw = await storage.getItem<string>(KEY, '');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Product[];
        setProducts(parsed);
        setIds(parsed.map((p) => p.id));
      } catch {}
    }
  };

  const refresh = async () => {
    if (token) {
      setLoading(true);
      try {
        const res = await api.get<{ product_ids: string[]; products: Product[] }>('/wishlist', true);
        setIds(res.product_ids);
        setProducts(res.products);
      } catch {}
      setLoading(false);
    } else {
      await loadLocal();
    }
  };

  useEffect(() => {
    if (!ready) return;
    (async () => {
      if (token) {
        // merge local into server on login
        const raw = await storage.getItem<string>(KEY, '');
        if (raw) {
          try {
            const local = JSON.parse(raw) as Product[];
            for (const p of local) {
              try {
                await api.post('/wishlist', { product_id: p.id }, true);
              } catch {}
            }
          } catch {}
          await storage.removeItem(KEY);
        }
      }
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, ready]);

  const isWishlisted = (id: string) => ids.includes(id);

  const toggle = async (product: Product) => {
    if (token) {
      const res = await api.post<{ added: boolean; product_ids: string[] }>(
        '/wishlist',
        { product_id: product.id },
        true,
      );
      setIds(res.product_ids);
      await refresh();
      return res.added;
    }
    // guest local
    const exists = ids.includes(product.id);
    let nextProducts: Product[];
    if (exists) {
      nextProducts = products.filter((p) => p.id !== product.id);
    } else {
      nextProducts = [...products, product];
    }
    setProducts(nextProducts);
    setIds(nextProducts.map((p) => p.id));
    await storage.setItem(KEY, JSON.stringify(nextProducts));
    return !exists;
  };

  return (
    <Ctx.Provider value={{ ids, products, loading, isWishlisted, toggle, refresh }}>
      {children}
    </Ctx.Provider>
  );
}
