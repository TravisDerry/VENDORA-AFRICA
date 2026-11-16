// Explore: businesses loaded from the server 20 at a time. Search and category filtering happen on
// the server, so this works the same with 10 businesses or 10,000. Scrolling down loads the next page.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, type } from '../theme';
import { SearchBar, Chip, EmptyState, IconButton, useStatusBar } from '../components/ui';
import { BusinessCard, BusinessRow } from '../components/BusinessCard';
import { CATEGORIES } from '../data/categories';
import { API_BASE_URL } from '../config';
import { normalizeBusiness } from '../utils/businesses';

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 400;

const BrowseScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  useStatusBar('dark');

  const [selectedCategory, setSelectedCategory] = useState(route?.params?.category || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [layout, setLayout] = useState('list');

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0); // last page loaded
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0); // ignore answers to searches the user has already changed

  // Category chosen on the Home screen
  useEffect(() => {
    if (route?.params?.category) setSelectedCategory(route.params.category);
  }, [route?.params?.category]);

  // Wait until the user stops typing before searching
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchPage = useCallback(async (pageToLoad) => {
    const params = new URLSearchParams({ page: String(pageToLoad), limit: String(PAGE_SIZE) });
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (debouncedQuery) params.set('search', debouncedQuery.slice(0, 100));
    const res = await fetch(`${API_BASE_URL}/api/businesses?${params.toString()}`);
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    return res.json();
  }, [selectedCategory, debouncedQuery]);

  // First page (and whenever the search or category changes)
  const loadFirst = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const json = await fetchPage(1);
      if (id !== requestId.current) return;
      setItems((json.businesses || []).map((b, i) => normalizeBusiness(b, i)));
      setPage(1);
      setPages(json.pagination?.pages || 1);
      setTotal(json.pagination?.total ?? (json.businesses || []).length);
      setStatus('ok');
    } catch (e) {
      // A failed pull-to-refresh keeps the list already shown; a failed new search shows the error
      if (id === requestId.current) setStatus((s) => (s === 'ok' ? 'ok' : 'error'));
    }
  }, [fetchPage]);

  useEffect(() => {
    setStatus('loading');
    loadFirst();
  }, [loadFirst]);

  const loadMore = async () => {
    if (loadingMore || status !== 'ok' || page >= pages) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const json = await fetchPage(page + 1);
      if (id !== requestId.current) return;
      setItems((cur) => {
        const seen = new Set(cur.map((b) => String(b.id)));
        const next = (json.businesses || []).map((b, i) => normalizeBusiness(b, cur.length + i)).filter((b) => !seen.has(String(b.id)));
        return [...cur, ...next];
      });
      setPage(page + 1);
      setPages(json.pagination?.pages || pages);
    } catch (e) {
      // try again when the user scrolls again
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFirst();
    setRefreshing(false);
  }, [loadFirst]);

  const openBusiness = (business) => navigation.navigate('BusinessDetail', { business });

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const isGrid = layout === 'grid';
  const filtering = selectedCategory !== 'all' || !!debouncedQuery;

  const empty =
    status === 'loading' ? (
      <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
    ) : status === 'error' ? (
      <EmptyState
        icon="cloud-offline-outline"
        title="Can't reach Vendora"
        message="Check your internet connection, then pull down to refresh."
        actionLabel="Try again"
        onAction={() => { setStatus('loading'); loadFirst(); }}
      />
    ) : filtering ? (
      <EmptyState
        icon="search"
        title="No businesses found"
        message="Try a different search term or category."
        actionLabel="Clear filters"
        onAction={resetFilters}
      />
    ) : (
      <EmptyState
        icon="storefront-outline"
        title="No businesses yet"
        message="Vendora Africa is just getting started. Own a business? List it free for your first month."
        actionLabel="List your business"
        onAction={() => navigation.navigate('Register')}
      />
    );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[type.h1, { color: colors.text }]}>Explore</Text>
            <Text style={[type.small, { color: colors.textMuted }]}>Businesses across Ghana</Text>
          </View>
          <IconButton
            icon={isGrid ? 'list' : 'grid-outline'}
            background={colors.surfaceAlt}
            color={colors.text}
            size={20}
            accessibilityLabel={isGrid ? 'Show as list' : 'Show as grid'}
            onPress={() => setLayout(isGrid ? 'list' : 'grid')}
          />
        </View>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipScroller}
        >
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.name}
              icon={cat.id === 'all' ? undefined : cat.icon}
              selected={selectedCategory === cat.id}
              onPress={() => setSelectedCategory(cat.id)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        key={layout}
        data={status === 'ok' ? items : []}
        numColumns={isGrid ? 2 : 1}
        keyExtractor={(item) => String(item.id)}
        columnWrapperStyle={isGrid ? { gap: spacing.md } : undefined}
        renderItem={({ item }) =>
          isGrid ? (
            <View style={{ flex: 1 / 2 }}>
              <BusinessCard business={item} onPress={() => openBusiness(item)} />
            </View>
          ) : (
            <BusinessRow business={item} onPress={() => openBusiness(item)} />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          status === 'ok' && items.length > 0 ? (
            <Text style={[type.smallStrong, styles.count]}>
              {total} {total === 1 ? 'business' : 'businesses'}
            </Text>
          ) : null
        }
        ListEmptyComponent={empty}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  chipScroller: { marginTop: spacing.md, marginHorizontal: -spacing.gutter },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.gutter },
  count: { color: colors.textSecondary, marginBottom: spacing.md },
  list: { padding: spacing.gutter, paddingBottom: spacing.xxxl, flexGrow: 1 },
});

export default BrowseScreen;
