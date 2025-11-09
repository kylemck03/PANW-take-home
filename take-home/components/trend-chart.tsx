import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Trend } from '@/lib/api';

interface TrendChartProps {
  trends: Trend[];
}

export function TrendChart({ trends }: TrendChartProps) {
  const tintColor = useThemeColor({}, 'tint');
  const cardBackground = useThemeColor({ light: '#ffffff', dark: '#1a1a1a' }, 'background');

  const getTrendIcon = (direction: string) => {
    switch (direction.toLowerCase()) {
      case 'increasing':
      case 'improving': return '📈';
      case 'decreasing':
      case 'declining': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  };

  const getTrendColor = (direction: string, metric: string) => {
    const isPositiveMetric = [
      'step_count',
      'sleep_hours',
      'hrv_sdnn',
      'vo2_max',
      'dietary_water',
      'exercise_time_minutes',
    ].some(m => metric.includes(m));

    const isIncreasing = direction.toLowerCase().includes('increas') || 
                         direction.toLowerCase().includes('improv');

    if (direction.toLowerCase().includes('stable')) return '#64748b';
    
    if (isPositiveMetric) {
      return isIncreasing ? '#10b981' : '#ef4444';
    } else {
      return isIncreasing ? '#ef4444' : '#10b981';
    }
  };

  const formatMetricName = (metric: string) => {
    return metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatValue = (value: number, metric: string) => {
    if (metric.includes('hours')) return `${value.toFixed(1)}h`;
    if (metric.includes('count') || metric.includes('steps')) return value.toFixed(0);
    if (metric.includes('percent')) return `${value.toFixed(1)}%`;
    return value.toFixed(1);
  };

  const renderTrendCard = (trend: Trend) => {
    const trendColor = getTrendColor(trend.trend_direction, trend.metric);
    const percentChange = Math.abs(trend.percent_change);

    return (
      <View key={trend.metric} style={styles.trendCard}>
        <View style={styles.trendHeader}>
          <ThemedText style={styles.trendIcon}>
            {getTrendIcon(trend.trend_direction)}
          </ThemedText>
          <View style={styles.trendInfo}>
            <ThemedText style={styles.metricName} numberOfLines={1}>
              {formatMetricName(trend.metric)}
            </ThemedText>
            <ThemedText style={styles.trendDirection}>
              {trend.trend_direction}
            </ThemedText>
          </View>
        </View>

        <View style={styles.trendBody}>
          <View style={styles.valueRow}>
            <View style={styles.valueColumn}>
              <ThemedText style={styles.valueLabel}>First 30 Days</ThemedText>
              <ThemedText style={styles.valueText}>
                {formatValue(trend.first_30d_avg, trend.metric)}
              </ThemedText>
            </View>
            <ThemedText style={styles.arrow}>→</ThemedText>
            <View style={styles.valueColumn}>
              <ThemedText style={styles.valueLabel}>Last 30 Days</ThemedText>
              <ThemedText style={[styles.valueText, { color: trendColor }]}>
                {formatValue(trend.last_30d_avg, trend.metric)}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.changeBar, { backgroundColor: trendColor + '20' }]}>
            <View
              style={[
                styles.changeIndicator,
                {
                  width: `${Math.min(percentChange, 100)}%`,
                  backgroundColor: trendColor,
                },
              ]}
            />
          </View>

          <View style={styles.changeRow}>
            <ThemedText style={[styles.changeText, { color: trendColor }]}>
              {trend.percent_change > 0 ? '+' : ''}
              {trend.percent_change.toFixed(1)}% change
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  if (trends.length === 0) {
    return (
      <ThemedView style={[styles.card, { backgroundColor: cardBackground }]}>
        <ThemedText style={styles.emptyText}>No trends detected yet</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.card, { backgroundColor: cardBackground }]}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>📈 Health Trends</ThemedText>
        <ThemedText style={styles.subtitle}>
          Changes in your metrics over the last 60 days
        </ThemedText>
      </View>

      <View style={styles.trendsContainer}>
        {trends.slice(0, 8).map(renderTrendCard)}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.6,
  },
  trendsContainer: {
    gap: 12,
  },
  trendCard: {
    padding: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
    borderRadius: 12,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  trendInfo: {
    flex: 1,
  },
  metricName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  trendDirection: {
    fontSize: 12,
    opacity: 0.6,
    textTransform: 'capitalize',
  },
  trendBody: {
    gap: 10,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueColumn: {
    flex: 1,
  },
  valueLabel: {
    fontSize: 11,
    opacity: 0.6,
    marginBottom: 4,
  },
  valueText: {
    fontSize: 18,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 16,
    marginHorizontal: 8,
    opacity: 0.4,
  },
  changeBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  changeIndicator: {
    height: '100%',
    borderRadius: 2,
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    paddingVertical: 20,
  },
});

