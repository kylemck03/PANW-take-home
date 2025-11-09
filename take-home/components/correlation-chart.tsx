import React from 'react';
import { StyleSheet, View, ScrollView, Dimensions } from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Correlation } from '@/lib/api';

const { width } = Dimensions.get('window');

interface CorrelationChartProps {
  correlations: Correlation[];
}

export function CorrelationChart({ correlations }: CorrelationChartProps) {
  const tintColor = useThemeColor({}, 'tint');
  const cardBackground = useThemeColor({ light: '#ffffff', dark: '#1a1a1a' }, 'background');

  const getCorrelationColor = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 0.7) return '#ef4444'; // Strong
    if (absValue >= 0.4) return '#f59e0b'; // Moderate
    return '#10b981'; // Weak
  };

  const getStrengthEmoji = (strength: string) => {
    switch (strength.toLowerCase()) {
      case 'strong': return '🔴';
      case 'moderate': return '🟡';
      case 'weak': return '🟢';
      default: return '⚪';
    }
  };

  const formatMetricName = (metric: string) => {
    return metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderCorrelationBar = (correlation: Correlation) => {
    const absValue = Math.abs(correlation.correlation);
    const width = absValue * 100;
    const color = getCorrelationColor(correlation.correlation);
    const isPositive = correlation.correlation > 0;

    return (
      <View key={`${correlation.metric_a}-${correlation.metric_b}`} style={styles.correlationItem}>
        <View style={styles.correlationHeader}>
          <View style={styles.metricLabels}>
            <ThemedText style={styles.metricText} numberOfLines={1}>
              {formatMetricName(correlation.metric_a)}
            </ThemedText>
            <ThemedText style={styles.arrow}>{isPositive ? '↔️' : '⤫'}</ThemedText>
            <ThemedText style={styles.metricText} numberOfLines={1}>
              {formatMetricName(correlation.metric_b)}
            </ThemedText>
          </View>
          <View style={styles.strengthBadge}>
            <ThemedText style={styles.strengthEmoji}>
              {getStrengthEmoji(correlation.strength)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.barContainer}>
          <View
            style={[
              styles.bar,
              {
                width: `${width}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>

        <View style={styles.correlationFooter}>
          <ThemedText style={styles.correlationValue}>
            {correlation.correlation > 0 ? '+' : ''}
            {correlation.correlation.toFixed(2)}
          </ThemedText>
          <ThemedText style={styles.strengthText}>
            {correlation.strength} {correlation.direction}
          </ThemedText>
        </View>
      </View>
    );
  };

  if (correlations.length === 0) {
    return (
      <ThemedView style={[styles.card, { backgroundColor: cardBackground }]}>
        <ThemedText style={styles.emptyText}>No correlations detected yet</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.card, { backgroundColor: cardBackground }]}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>🔗 Key Correlations</ThemedText>
        <ThemedText style={styles.subtitle}>
          Relationships between your health metrics
        </ThemedText>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <ThemedText style={styles.legendText}>Strong (≥0.7)</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
          <ThemedText style={styles.legendText}>Moderate (0.4-0.7)</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <ThemedText style={styles.legendText}>Weak (&lt;0.4)</ThemedText>
        </View>
      </View>

      <View style={styles.correlationsContainer}>
        {correlations.slice(0, 10).map(renderCorrelationBar)}
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
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    opacity: 0.7,
  },
  correlationsContainer: {
    gap: 16,
  },
  correlationItem: {
    marginBottom: 4,
  },
  correlationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  metricText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  arrow: {
    fontSize: 14,
    marginHorizontal: 4,
  },
  strengthBadge: {
    marginLeft: 8,
  },
  strengthEmoji: {
    fontSize: 16,
  },
  barContainer: {
    height: 6,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
  correlationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  correlationValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  strengthText: {
    fontSize: 12,
    opacity: 0.6,
    textTransform: 'capitalize',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    paddingVertical: 20,
  },
});

