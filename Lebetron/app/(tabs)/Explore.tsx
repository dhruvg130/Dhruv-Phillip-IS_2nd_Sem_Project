import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '../../hooks/auth-context';
import { supabase } from '../../lib/supabase';

type SearchItem = { symbol: string; description: string };
type FavRow = { id: number; ticker: string };

const FINNHUB_KEY = process.env.EXPO_PUBLIC_FINNHUB_KEY;

export default function FavoritesScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [msg, setMsg] = useState('');

  const [favorites, setFavorites] = useState<FavRow[]>([]);
  const [favLoading, setFavLoading] = useState(false);

  const [quotes, setQuotes] = useState<Record<string, { c: number; dp: number }>>({}); // c=current, dp=%change

  const canUseApi = useMemo(() => !!FINNHUB_KEY && FINNHUB_KEY.length > 10, []);

  // Load favorites from Supabase
  const loadFavorites = async () => {
    if (!userId) return;
    setFavLoading(true);
    setMsg('');

    const { data, error } = await supabase
      .from('favorites')
      .select('id, ticker')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) setMsg(error.message);
    setFavorites((data ?? []) as FavRow[]);
    setFavLoading(false);
  };

  useEffect(() => {
    loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    setMsg('');

    if (!q) {
      setSearchResults([]);
      return;
    }
    if (!canUseApi) {
      setMsg('Missing FINNHUB API key.');
      return;
    }

    const t = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${FINNHUB_KEY}`;
        const res = await fetch(url);
        const json = await res.json();

        const list: SearchItem[] = (json?.result ?? [])
          .filter((r: any) => r?.symbol && r?.description)
          .slice(0, 12)
          .map((r: any) => ({ symbol: r.symbol, description: r.description }));

        setSearchResults(list);
      } catch (e: any) {
        setMsg(e?.message ?? 'Search failed');
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [query, canUseApi]);

  // Fetch quotes for favorites
  useEffect(() => {
    const run = async () => {
      if (!canUseApi) return;
      const tickers = favorites.map((f) => f.ticker);
      if (tickers.length === 0) return;

      const next: Record<string, { c: number; dp: number }> = {};
      await Promise.all(
        tickers.map(async (ticker) => {
          try {
            const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_KEY}`;
            const res = await fetch(url);
            const q = await res.json();
            if (typeof q?.c === 'number') next[ticker] = { c: q.c, dp: q.dp ?? 0 };
          } catch {}
        })
      );
      setQuotes(next);
    };

    run();
  }, [favorites, canUseApi]);

  const addFavorite = async (ticker: string) => {
    if (!userId) return;
    setMsg('');

    // prevent dupes locally
    if (favorites.some((f) => f.ticker === ticker)) {
      setMsg(`${ticker} is already in favorites.`);
      return;
    }

    const { error } = await supabase.from('favorites').insert({
      user_id: userId,
      ticker,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setQuery('');
    setSearchResults([]);
    await loadFavorites();
  };

  const removeFavorite = async (rowId: number) => {
    setMsg('');
    const { error } = await supabase.from('favorites').delete().eq('id', rowId);
    if (error) setMsg(error.message);
    await loadFavorites();
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Favorites
      </ThemedText>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search stocks (AAPL, TSLA, Apple...)"
        placeholderTextColor="#94a3b8"
        style={styles.search}
        autoCapitalize="characters"
      />

      {msg ? <ThemedText style={styles.msg}>{msg}</ThemedText> : null}

      {searchLoading ? <ActivityIndicator style={{ marginTop: 10 }} /> : null}

      {searchResults.length > 0 && (
        <ThemedView style={styles.resultsBox}>
          {searchResults.map((item) => (
            <TouchableOpacity
              key={item.symbol}
              style={styles.resultRow}
              onPress={() => addFavorite(item.symbol)}
            >
              <ThemedText style={styles.symbol}>{item.symbol}</ThemedText>
              <ThemedText style={styles.desc} numberOfLines={1}>
                {item.description}
              </ThemedText>
              <ThemedText style={styles.add}>＋</ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>
      )}

      <ThemedView style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Your favorites</ThemedText>
        <TouchableOpacity onPress={loadFavorites}>
          <ThemedText style={styles.refresh}>Refresh</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {favLoading ? (
        <ActivityIndicator style={{ marginTop: 12 }} />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const q = quotes[item.ticker];
            return (
              <ThemedView style={styles.favRow}>
                <ThemedText style={styles.favTicker}>{item.ticker}</ThemedText>

                <ThemedView style={{ flex: 1 }} />

                <ThemedText style={styles.price}>
                  {q ? `$${q.c.toFixed(2)}` : '—'}
                </ThemedText>
                <ThemedText style={styles.change}>
                  {q ? `${q.dp.toFixed(2)}%` : ''}
                </ThemedText>

                <TouchableOpacity onPress={() => removeFavorite(item.id)} style={styles.removeBtn}>
                  <ThemedText style={styles.removeText}>Remove</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            );
          }}
          ListEmptyComponent={
            <ThemedText style={{ marginTop: 14, color: '#94a3b8' }}>
              No favorites yet — search a stock and tap it to add.
            </ThemedText>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  
});
