import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { InsightCard } from '@/components/insight-card';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/auth-context';
import { api, type InsightsFeed, type Insight } from '@/lib/api';

const { width } = Dimensions.get('window');

type FilterType = 'all' | 'daily' | 'weekly' | 'anomaly' | 'pattern' | 'correlation';

export default function InsightsScreen() {
  const { user } = useAuth();
  const [insightsFeed, setInsightsFeed] = useState<InsightsFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({ light: '#f5f5f5', dark: '#1a1a1a' }, 'background');

  useEffect(() => {
    loadInsights();
  }, [user?.id, filter]);

  const loadInsights = async (isRefresh = false) => {
    if (!user?.id) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const insightType = filter === 'all' ? undefined : filter;
      const feed = await api.insights.getFeed(user.id, insightType, false, 50);
      setInsightsFeed(feed);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkAsRead = async (insightId: string) => {
    if (!user?.id) return;

    try {
      await api.insights.markAsRead(user.id, insightId);
      
      // Update local state
      if (insightsFeed) {
        setInsightsFeed({
          ...insightsFeed,
          insights: insightsFeed.insights.map(insight =>
            insight.id === insightId ? { ...insight, is_read: true } : insight
          ),
          unread_count: Math.max(0, insightsFeed.unread_count - 1),
        });
      }
    } catch (error) {
      console.error('Failed to mark insight as read:', error);
    }
  };

  const onRefresh = () => {
    loadInsights(true);
  };

  const filterOptions: { key: FilterType; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: '📋' },
    { key: 'daily', label: 'Daily', icon: '☀️' },
    { key: 'weekly', label: 'Weekly', icon: '📅' },
    { key: 'anomaly', label: 'Anomalies', icon: '⚠️' },
    { key: 'pattern', label: 'Patterns', icon: '🔍' },
    { key: 'correlation', label: 'Correlations', icon: '🔗' },
  ];

  if (loading && !insightsFeed) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            Insights
          </ThemedText>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={styles.loadingText}>Loading insights...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const displayedInsights = insightsFeed?.insights || [];

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText type="title" style={styles.headerTitle}>
            Insights
          </ThemedText>
          {insightsFeed && (
            <ThemedText style={styles.headerSubtitle}>
              {insightsFeed.unread_count} unread • {insightsFeed.total_count} total
            </ThemedText>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              onPress={() => setFilter(option.key)}
              style={[
                styles.filterTab,
                {
                  backgroundColor: filter === option.key ? tintColor : cardBackground,
                  borderWidth: filter === option.key ? 0 : 1,
                  borderColor: filter === option.key ? 'transparent' : (tintColor + '30'),
                },
              ]}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.filterIcon}>{option.icon}</ThemedText>
              <ThemedText
                style={[
                  styles.filterLabel,
                  { color: filter === option.key ? '#fff' : undefined },
                ]}
              >
                {option.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Insights Feed */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tintColor} />
        }
      >
        {displayedInsights.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyIcon}>🔍</ThemedText>
            <ThemedText style={styles.emptyTitle}>No insights yet</ThemedText>
            <ThemedText style={styles.emptyText}>
              {filter === 'all'
                ? 'Your personalized health insights will appear here as we analyze your data.'
                : `No ${filter} insights available yet.`}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.insightsContainer}>
            {displayedInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onMarkRead={() => handleMarkAsRead(insight.id)}
              />
            ))}
          </View>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  filterWrapper: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.1)',
    marginBottom: 8,
  },
  filterContainer: {
    marginBottom: 0,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 10,
    paddingVertical: 4,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    marginRight: 8,
    minHeight: 44,
  },
  filterIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.6,
  },
  insightsContainer: {
    paddingTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 40,
  },
});

