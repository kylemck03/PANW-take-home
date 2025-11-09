import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { CorrelationChart } from '@/components/correlation-chart';
import { TrendChart } from '@/components/trend-chart';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/auth-context';
import { api, type AnalysisResults } from '@/lib/api';

type TimeRange = 30 | 60 | 90;

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [analysisData, setAnalysisData] = useState<AnalysisResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>(90);
  const [analyzing, setAnalyzing] = useState(false);
  
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({ light: '#f5f5f5', dark: '#1a1a1a' }, 'background');

  useEffect(() => {
    loadAnalytics();
  }, [user?.id, timeRange]);

  const loadAnalytics = async (isRefresh = false) => {
    if (!user?.id) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch data using GET requests instead of running full analysis
      const [correlations, anomalies, trends] = await Promise.all([
        api.analytics.getCorrelations(user.id, timeRange).catch(() => ({ correlations: [] })),
        api.analytics.getAnomalies(user.id, timeRange).catch(() => ({ anomalies: [] })),
        api.analytics.getTrends(user.id, timeRange).catch(() => ({ trends: [] })),
      ]);

      // Combine results into AnalysisResults format
      const results: AnalysisResults = {
        user_id: user.id,
        days_analyzed: timeRange,
        analysis_date: new Date().toISOString(),
        correlations: correlations.correlations || [],
        anomalies: anomalies.anomalies || [],
        trends: trends.trends || [],
      };

      setAnalysisData(results);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const runAnalysis = async () => {
    if (!user?.id || analyzing) return;

    try {
      setAnalyzing(true);
      const results = await api.analytics.analyze(user.id, timeRange);
      setAnalysisData(results);
    } catch (error) {
      console.error('Failed to run analysis:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const onRefresh = () => {
    loadAnalytics(true);
  };

  const timeRangeOptions: TimeRange[] = [30, 60, 90];

  if (loading && !analysisData) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            Analytics
          </ThemedText>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={styles.loadingText}>Analyzing your health data...</ThemedText>
          <ThemedText style={styles.loadingSubtext}>
            This may take a few moments
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const hasData = analysisData && (
    (analysisData.correlations && analysisData.correlations.length > 0) ||
    (analysisData.trends && analysisData.trends.length > 0)
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText type="title" style={styles.headerTitle}>
            Analytics
          </ThemedText>
          {analysisData && (
            <ThemedText style={styles.headerSubtitle}>
              {analysisData.days_analyzed} days analyzed
              {analysisData.execution_time_ms && 
                ` • ${(analysisData.execution_time_ms / 1000).toFixed(1)}s`
              }
            </ThemedText>
          )}
        </View>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <ThemedText style={styles.timeRangeLabel}>Time Range:</ThemedText>
        <View style={styles.timeRangeButtons}>
          {timeRangeOptions.map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => setTimeRange(range)}
              style={[
                styles.timeRangeButton,
                {
                  backgroundColor: timeRange === range ? tintColor : cardBackground,
                },
              ]}
              activeOpacity={0.7}
            >
              <ThemedText
                style={[
                  styles.timeRangeButtonText,
                  { color: timeRange === range ? '#fff' : undefined },
                ]}
              >
                {range} days
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tintColor} />
        }
      >
        {hasData ? (
          <>
            {/* Summary Stats */}
            {analysisData && (
              <View style={[styles.summaryCard, { backgroundColor: cardBackground }]}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <ThemedText style={styles.summaryIcon}>🔗</ThemedText>
                    <ThemedText style={styles.summaryValue}>
                      {analysisData.correlations?.length || 0}
                    </ThemedText>
                    <ThemedText style={styles.summaryLabel}>Correlations</ThemedText>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <ThemedText style={styles.summaryIcon}>⚠️</ThemedText>
                    <ThemedText style={styles.summaryValue}>
                      {analysisData.anomalies?.length || 0}
                    </ThemedText>
                    <ThemedText style={styles.summaryLabel}>Anomalies</ThemedText>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <ThemedText style={styles.summaryIcon}>📈</ThemedText>
                    <ThemedText style={styles.summaryValue}>
                      {analysisData.trends?.length || 0}
                    </ThemedText>
                    <ThemedText style={styles.summaryLabel}>Trends</ThemedText>
                  </View>
                </View>
              </View>
            )}

            {/* Correlations Chart */}
            {analysisData?.correlations && analysisData.correlations.length > 0 && (
              <CorrelationChart correlations={analysisData.correlations} />
            )}

            {/* Trends Chart */}
            {analysisData?.trends && analysisData.trends.length > 0 && (
              <TrendChart trends={analysisData.trends} />
            )}

            {/* Patterns Section */}
            {analysisData?.patterns && Object.keys(analysisData.patterns).length > 0 && (
              <View style={[styles.patternsCard, { backgroundColor: cardBackground }]}>
                <View style={styles.cardHeader}>
                  <ThemedText style={styles.cardTitle}>🔍 Detected Patterns</ThemedText>
                </View>
                {Object.entries(analysisData.patterns).map(([key, pattern]) => (
                  <View key={key} style={styles.patternItem}>
                    <ThemedText style={styles.patternName}>{pattern.pattern_name}</ThemedText>
                    <ThemedText style={styles.patternNarrative}>{pattern.narrative}</ThemedText>
                    <View style={styles.patternMeta}>
                      <ThemedText style={styles.patternMetaText}>
                        {pattern.confidence_level} confidence
                      </ThemedText>
                      {pattern.percent_change && (
                        <ThemedText style={styles.patternMetaText}>
                          {pattern.percent_change > 0 ? '+' : ''}
                          {pattern.percent_change.toFixed(0)}% change
                        </ThemedText>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Run New Analysis Button */}
            <TouchableOpacity
              onPress={runAnalysis}
              disabled={analyzing}
              style={[styles.analyzeButton, { backgroundColor: tintColor }]}
              activeOpacity={0.7}
            >
              {analyzing ? (
                <>
                  <ActivityIndicator color="#fff" size="small" style={styles.buttonSpinner} />
                  <ThemedText style={styles.analyzeButtonText}>Analyzing...</ThemedText>
                </>
              ) : (
                <>
                  <ThemedText style={styles.analyzeButtonIcon}>🔄</ThemedText>
                  <ThemedText style={styles.analyzeButtonText}>Run New Analysis</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyIcon}>📊</ThemedText>
            <ThemedText style={styles.emptyTitle}>No analytics data yet</ThemedText>
            <ThemedText style={styles.emptyText}>
              We need at least 30 days of health data to generate meaningful insights.
              Keep tracking your health metrics!
            </ThemedText>
            <TouchableOpacity
              onPress={runAnalysis}
              disabled={analyzing}
              style={[styles.emptyButton, { backgroundColor: tintColor }]}
              activeOpacity={0.7}
            >
              {analyzing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.emptyButtonText}>Try Analyzing Now</ThemedText>
              )}
            </TouchableOpacity>
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
    paddingBottom: 16,
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
  timeRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  timeRangeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  timeRangeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.8,
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.6,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    marginVertical: 8,
  },
  patternsCard: {
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
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  patternItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.1)',
  },
  patternName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  patternNarrative: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
    marginBottom: 6,
  },
  patternMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  patternMetaText: {
    fontSize: 11,
    opacity: 0.6,
    textTransform: 'capitalize',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  buttonSpinner: {
    marginRight: 8,
  },
  analyzeButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
});

