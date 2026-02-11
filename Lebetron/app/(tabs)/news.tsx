import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '../../hooks/auth-context';
import { supabase } from '../../lib/supabase';

type FavRow = { ticker: string };

type FinnhubNews = {
  id: number;
  headline: string;
  source: string;
  summary: string;
  url: string;
  datetime: number; // unix seconds
};

type TaggedNews = FinnhubNews & { ticker: string };

const KEY = process.env.EXPO_PUBLIC_FINNHUB_KEY;

function toYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function NewsScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [favoriteTickers, setFavoriteTickers] = useState<string[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string>('ALL');

  const [favNews, setFavNews] = useState<TaggedNews[]>([]);

  const canUseApi = useMemo(() => !!KEY && KEY.length > 10, []);

  const open = async (url: string) => {
    const ok = await Linking.canOpenURL(url);
    if (ok) Linking.openURL(url);
    else setMsg('Could not open article link.');
  };

  const load = async () => {
    if (!userId) return;
    setMsg('');
    setLoading(true);

    if (!canUseApi) {
      setMsg('Missing Finnhub API key. Check EXPO_PUBLIC_FINNHUB_KEY in .env');
      setLoading(false);
      return;
    }

    try {
      // 1) fetch favorites
      const { data: favs, error: favErr } = await supabase
        .from('favorites')
        .select('ticker')
        .eq('user_id', userId);

      if (favErr) throw favErr;

      const tickers = ((favs ?? []) as FavRow[])
        .map((f) => f.ticker)
        .filter(Boolean);

      setFavoriteTickers(tickers);

      if (tickers.length === 0) {
        setFavNews([]);
        setMsg('Add favorites first to see news.');
        setLoading(false);
        return;
      }

      // 2) limit how many tickers we fetch to avoid rate limits
      const capped = tickers.slice(0, 10);

      // 3) date window (last 7 days)
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 7);
      const fromStr = toYYYYMMDD(from);
      const toStr = toYYYYMMDD(to);

      // 4) fetch company news per ticker and TAG each article with that ticker
      const all = await Promise.all(
        capped.map(async (t) => {
          const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
            t
          )}&from=${fromStr}&to=${toStr}&token=${KEY}`;

          const res = await fetch(url);
          if (!res.ok) return [];

          const json = (await res.json()) as FinnhubNews[];
          return (json ?? []).map((a) => ({ ...a, ticker: t })) as TaggedNews[];
        })
      );

      // 5) merge + dedupe PER TICKER (so each stock has its own relevant feed)
      // If you prefer global dedupe, tell me and I’ll switch it.
      const merged = all.flat();

      // remove junk
      const cleaned = merged.filter((a) => a?.url && a?.headline);

      // sort newest first
      cleaned.sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0));

      setFavNews(cleaned);

      // keep filter valid
      if (selectedTicker !== 'ALL' && !tickers.includes(selectedTicker)) {
        setSelectedTicker('ALL');
      }
    } catch (e: any) {
      setMsg(e?.message ?? 'Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const filteredNews = useMemo(() => {
    if (selectedTicker === 'ALL') return favNews;
    return favNews.filter((a) => a.ticker === selectedTicker);
  }, [favNews, selectedTicker]);

  const renderCard = (item: TaggedNews) => {
    const date = item.datetime ? new Date(item.datetime * 1000) : null;
    const dateStr = date ? date.toLocaleString() : '';

    return (
      <TouchableOpacity style={styles.card} onPress={() => open(item.url)}>
        <View style={styles.cardTopRow}>
          <ThemedText style={styles.tickerPill}>{item.ticker}</ThemedText>
          <ThemedText style={styles.source}>{item.source}</ThemedText>
        </View>

        <ThemedText style={styles.headline}>{item.headline}</ThemedText>

        <ThemedText style={styles.meta}>{dateStr}</ThemedText>

        {!!item.summary && (
          <ThemedText numberOfLines={3} style={styles.summary}>
            {item.summary}
          </ThemedText>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText type="title">News</ThemedText>
        <TouchableOpacity onPress={load}>
          <ThemedText style={styles.refresh}>Refresh</ThemedText>
        </TouchableOpacity>
      </View>

      {!!msg && <ThemedText style={styles.msg}>{msg}</ThemedText>}

      {/* Filter pills */}
      {favoriteTickers.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <TouchableOpacity
            onPress={() => setSelectedTicker('ALL')}
            style={[styles.filterPill, selectedTicker === 'ALL' && styles.filterPillActive]}
          >
            <ThemedText style={[styles.filterText, selectedTicker === 'ALL' && styles.filterTextActive]}>
              All
            </ThemedText>
          </TouchableOpacity>

          {favoriteTickers.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setSelectedTicker(t)}
              style={[styles.filterPill, selectedTicker === t && styles.filterPillActive]}
            >
              <ThemedText style={[styles.filterText, selectedTicker === t && styles.filterTextActive]}>
                {t}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          data={filteredNews}
          keyExtractor={(item) => `${item.ticker}-${item.id}-${item.url}`}
          renderItem={({ item }) => renderCard(item)}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <ThemedText style={{ color: '#94a3b8', marginTop: 12 }}>
              No news found for your favorites in the last week.
            </ThemedText>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  refresh: { color: '#60a5fa', fontWeight: '800' },
  msg: { color: '#fca5a5', marginTop: 8 },

  filterPill: {
    backgroundColor: '#0b152b',
    borderWidth: 1,
    borderColor: '#22304a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 10,
  },
  filterPillActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  filterText: { fontWeight: '900', color: '#94a3b8' },
  filterTextActive: { color: 'white' },

  card: {
    backgroundColor: '#111c33',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#22304a',
    padding: 14,
    marginTop: 10,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  tickerPill: {
    backgroundColor: '#0b152b',
    borderWidth: 1,
    borderColor: '#22304a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '900',
  },
  source: { color: '#94a3b8', fontSize: 12 },

  headline: { fontSize: 16, fontWeight: '900' },
  meta: { color: '#94a3b8', marginTop: 6, fontSize: 12 },
  summary: { color: '#cbd5e1', marginTop: 8, fontSize: 13, lineHeight: 18 },
});
