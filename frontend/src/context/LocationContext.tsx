import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { storage } from '@/src/utils/storage';
import { api } from '@/src/api/client';

const KEY = 'sunsu_location';

export type DeliveryLocation = {
  city: string;
  pincode: string;
  serviceable: boolean;
  estimated_delivery?: string;
};

type LocationCtx = {
  location: DeliveryLocation | null;
  ready: boolean;
  setByPincode: (pincode: string) => Promise<DeliveryLocation>;
  detectCurrentLocation: () => Promise<DeliveryLocation>;
  clear: () => Promise<void>;
};

const Ctx = createContext<LocationCtx>({} as LocationCtx);
export const useLocation = () => useContext(Ctx);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<DeliveryLocation | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await storage.getItem<string>(KEY, '');
      if (raw) {
        try {
          setLocation(JSON.parse(raw));
        } catch {}
      }
      setReady(true);
    })();
  }, []);

  const persist = async (loc: DeliveryLocation) => {
    setLocation(loc);
    await storage.setItem(KEY, JSON.stringify(loc));
  };

  const setByPincode = async (pincode: string) => {
    const res = await api.get<DeliveryLocation>(`/location/pincode/${pincode}`);
    await persist(res);
    return res;
  };

  const detectCurrentLocation = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    let granted = status === 'granted';
    if (!granted) {
      const req = await Location.requestForegroundPermissionsAsync();
      granted = req.status === 'granted';
      if (!granted) {
        const err: any = new Error('Location permission denied');
        err.code = req.canAskAgain ? 'denied' : 'blocked';
        throw err;
      }
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const geo = await Location.reverseGeocodeAsync({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
    const first = geo[0];
    const pincode = first?.postalCode || '560001';
    try {
      const res = await api.get<DeliveryLocation>(`/location/pincode/${pincode}`);
      const loc = { ...res, city: first?.city || res.city };
      await persist(loc);
      return loc;
    } catch {
      const loc = { city: first?.city || 'Your area', pincode, serviceable: true };
      await persist(loc);
      return loc;
    }
  };

  const clear = async () => {
    setLocation(null);
    await storage.removeItem(KEY);
  };

  return (
    <Ctx.Provider value={{ location, ready, setByPincode, detectCurrentLocation, clear }}>
      {children}
    </Ctx.Provider>
  );
}
