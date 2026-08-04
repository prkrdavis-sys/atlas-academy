"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  CURRENCY_CHANGE_EVENT,
  CURRENCY_RATES_REFRESH_MS,
  CURRENCY_RATES_STORAGE_KEY,
  CURRENCY_STORAGE_KEY,
  DEFAULT_CURRENCY_CODE,
  isCurrencyCode,
  type CurrencyOption,
  type CurrencyRateMap,
  type ExchangeRatesPayload,
} from "@/lib/currency";

const DEFAULT_CURRENCY: CurrencyOption = {
  code: DEFAULT_CURRENCY_CODE,
  name: "United States Dollar",
  symbol: "$",
};

type StoredRates = {
  payload: ExchangeRatesPayload;
  cachedAt: number;
};

type CurrencyContextValue = {
  selectedCurrencyCode: string;
  selectedCurrency: CurrencyOption;
  displayCurrencyCode: string;
  displayCurrency: CurrencyOption;
  displayRate: number;
  rates: CurrencyRateMap;
  options: CurrencyOption[];
  hydrated: boolean;
  ratesReady: boolean;
  ratesLoading: boolean;
  ratesError: string | null;
  ratesAsOf: string | null;
  setCurrency: (code: string) => void;
  refreshRates: () => Promise<void>;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseRatesPayload(value: unknown): ExchangeRatesPayload | null {
  if (!isRecord(value) || value.baseCode !== DEFAULT_CURRENCY_CODE) return null;
  if (!isRecord(value.rates) || !Array.isArray(value.currencies)) return null;

  const rates: CurrencyRateMap = { USD: 1 };
  for (const [code, rate] of Object.entries(value.rates)) {
    if (isCurrencyCode(code) && typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      rates[code] = rate;
    }
  }

  const currencies = value.currencies.filter((item): item is CurrencyOption => {
    if (!isRecord(item)) return false;
    return (
      isCurrencyCode(item.code) &&
      typeof item.name === "string" &&
      typeof item.symbol === "string" &&
      Object.hasOwn(rates, item.code)
    );
  });

  if (currencies.every((currency) => currency.code !== DEFAULT_CURRENCY_CODE)) {
    currencies.push(DEFAULT_CURRENCY);
  }

  if (Object.keys(rates).length === 1) return null;

  return {
    baseCode: "USD",
    rates,
    currencies: currencies.toSorted((a, b) => a.name.localeCompare(b.name)),
    asOf: typeof value.asOf === "string" ? value.asOf : null,
    source: isRecord(value.source)
      ? {
          name: typeof value.source.name === "string" ? value.source.name : "Exchange rate provider",
          url: typeof value.source.url === "string" ? value.source.url : "https://frankfurter.dev/",
        }
      : {
          name: "Frankfurter",
          url: "https://frankfurter.dev/",
        },
  };
}

function readStoredCurrency(): string {
  if (typeof window === "undefined") return DEFAULT_CURRENCY_CODE;
  const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY)?.toUpperCase();
  return stored && isCurrencyCode(stored) ? stored : DEFAULT_CURRENCY_CODE;
}

function readStoredRates(): StoredRates | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CURRENCY_RATES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { payload?: unknown; cachedAt?: unknown };
    const payload = parseRatesPayload(parsed.payload);
    if (!payload || typeof parsed.cachedAt !== "number" || !Number.isFinite(parsed.cachedAt)) {
      return null;
    }
    return { payload, cachedAt: parsed.cachedAt };
  } catch {
    return null;
  }
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState(DEFAULT_CURRENCY_CODE);
  const [payload, setPayload] = useState<ExchangeRatesPayload>({
    baseCode: "USD",
    rates: { USD: 1 },
    currencies: [DEFAULT_CURRENCY],
    asOf: null,
    source: {
      name: "Frankfurter",
      url: "https://frankfurter.dev/",
    },
  });
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const requestRef = useRef<Promise<void> | null>(null);
  const lastRefreshAtRef = useRef(0);

  const storePayload = useCallback((nextPayload: ExchangeRatesPayload, nextCachedAt: number) => {
    setPayload(nextPayload);
    setCachedAt(nextCachedAt);
    try {
      window.localStorage.setItem(
        CURRENCY_RATES_STORAGE_KEY,
        JSON.stringify({ payload: nextPayload, cachedAt: nextCachedAt }),
      );
    } catch {
      // Keep live rates in memory when localStorage is unavailable or full.
    }
  }, []);

  const refreshRates = useCallback(async () => {
    if (requestRef.current) return requestRef.current;

    const request = (async () => {
      setRatesLoading(true);
      try {
        const response = await fetch("/api/exchange-rates", { cache: "no-store" });
        if (!response.ok) throw new Error("Exchange rate request failed");
        const nextPayload = parseRatesPayload(await response.json());
        if (!nextPayload) throw new Error("Exchange rate response was invalid");

        const now = Date.now();
        storePayload(nextPayload, now);
        lastRefreshAtRef.current = now;
        setRatesError(null);
      } catch {
        setRatesError("Live rates are unavailable. Using saved rates when available.");
      } finally {
        setRatesLoading(false);
      }
    })();

    requestRef.current = request;
    try {
      await request;
    } finally {
      if (requestRef.current === request) requestRef.current = null;
    }
  }, [storePayload]);

  useEffect(() => {
    const storedCurrency = readStoredCurrency();
    const storedRates = readStoredRates();

    // Hydrate client-only preferences after the first matching server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCurrencyCode(storedCurrency);
    if (storedRates) {
      setPayload(storedRates.payload);
      setCachedAt(storedRates.cachedAt);
      lastRefreshAtRef.current = storedRates.cachedAt;
    }
    setHydrated(true);
    void refreshRates();
  }, [refreshRates]);

  useEffect(() => {
    function handleCurrencyChange() {
      const next = readStoredCurrency();
      if (!isCurrencyCode(next)) return;
      setSelectedCurrencyCode(next);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === CURRENCY_STORAGE_KEY) handleCurrencyChange();
    }

    window.addEventListener(CURRENCY_CHANGE_EVENT, handleCurrencyChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(CURRENCY_CHANGE_EVENT, handleCurrencyChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const timeout = window.setTimeout(() => {
      void refreshRates();
    }, CURRENCY_RATES_REFRESH_MS);

    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastRefreshAtRef.current >= 3_600_000
      ) {
        void refreshRates();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hydrated, cachedAt, refreshRates]);

  const options = useMemo(() => {
    const available = payload.currencies;
    if (available.some((currency) => currency.code === selectedCurrencyCode)) return available;
    if (selectedCurrencyCode === DEFAULT_CURRENCY_CODE) return available;
    return [
      ...available,
      { code: selectedCurrencyCode, name: selectedCurrencyCode, symbol: "" },
    ].toSorted((a, b) => a.name.localeCompare(b.name));
  }, [payload.currencies, selectedCurrencyCode]);

  const selectedCurrency =
    options.find((currency) => currency.code === selectedCurrencyCode) ?? DEFAULT_CURRENCY;
  const selectedRate =
    selectedCurrencyCode === DEFAULT_CURRENCY_CODE
      ? 1
      : payload.rates[selectedCurrencyCode];
  const displayCurrencyCode =
    typeof selectedRate === "number" && Number.isFinite(selectedRate) && selectedRate > 0
      ? selectedCurrencyCode
      : DEFAULT_CURRENCY_CODE;
  const displayCurrency =
    options.find((currency) => currency.code === displayCurrencyCode) ?? DEFAULT_CURRENCY;

  const setCurrency = useCallback((code: string) => {
    const normalized = code.toUpperCase();
    if (!isCurrencyCode(normalized)) return;
    setSelectedCurrencyCode(normalized);
    try {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, normalized);
      window.dispatchEvent(new Event(CURRENCY_CHANGE_EVENT));
    } catch {
      // The in-memory preference still applies if localStorage is unavailable.
    }
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      selectedCurrencyCode,
      selectedCurrency,
      displayCurrencyCode,
      displayCurrency,
      displayRate:
        displayCurrencyCode === DEFAULT_CURRENCY_CODE
          ? 1
          : payload.rates[displayCurrencyCode] ?? 1,
      rates: payload.rates,
      options,
      hydrated,
      ratesReady: Object.keys(payload.rates).length > 1,
      ratesLoading,
      ratesError,
      ratesAsOf: payload.asOf,
      setCurrency,
      refreshRates,
    }),
    [
      selectedCurrencyCode,
      selectedCurrency,
      displayCurrencyCode,
      displayCurrency,
      payload,
      options,
      hydrated,
      ratesLoading,
      ratesError,
      setCurrency,
      refreshRates,
    ],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used within CurrencyProvider");
  return context;
}
