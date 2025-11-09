import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/auth-context';
import { api, type Correlation, type HealthMetrics } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const METRIC_CARD_WIDTH = (width - 48) / 2;

interface MetricData {
  date: string;
  value: number;
}

interface CorrelatedMetric {
  name: string;
  displayName: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  data: MetricData[];
  latestValue: number | null;
  unit: string;
  category: 'sleep' | 'activity' | 'nutrition' | 'other';
}

interface CorrelatedDashboardProps {
  days?: number;
}

export function CorrelatedDashboard({ days = 30 }: CorrelatedDashboardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  const tintColor = useThemeColor({}, 'tint');
  const cardBackground = useThemeColor({ light: '#ffffff', dark: '#1a1a1a' }, 'background');
  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id, days]);

  const loadDashboardData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Fetch health data and correlations in parallel
      // Use at least 30 days for correlations (ML service requirement)
      const correlationDays = Math.max(days, 30);
      
      const [dataResponse, correlationsResponse] = await Promise.all([
        api.healthData.getHistory(user.id, days).catch(() => ({ data: [] })),
        api.analytics.getCorrelations(user.id, correlationDays).catch((error) => {
          console.error('Correlation analysis error:', error);
          // If insufficient data, return empty correlations instead of failing
          if (error.message?.includes('Insufficient data') || error.message?.includes('400')) {
            return { correlations: [] };
          }
          return { correlations: [] };
        }),
      ]);

      const data = dataResponse.data || [];
      setHealthData(data);
      setCorrelations(correlationsResponse.correlations || []);

      // Load narrative (only if we have correlations or data)
      if (data.length > 0) {
        await loadNarrative(data, correlationsResponse.correlations || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNarrative = async (data: any[], correlations: Correlation[]) => {
    if (!user?.id) return;

    try {
      setNarrativeLoading(true);
      const userName = user?.user_metadata?.full_name?.split(' ')[0] || undefined;
      const response = await api.insights.getCorrelatedNarrative(
        user.id,
        data,
        correlations,
        days,
        userName
      );
      setNarrative(response.narrative);
    } catch (error) {
      console.error('Failed to load narrative:', error);
      // Generate a simple narrative from correlations if API fails
      setNarrative(generateSimpleNarrative(correlations));
    } finally {
      setNarrativeLoading(false);
    }
  };

  const generateSimpleNarrative = (correlations: Correlation[]): string => {
    if (correlations.length === 0) {
      return 'Your health metrics are being analyzed. As more data is collected, we\'ll show you how sleep, activity, and nutrition relate to each other.';
    }

    const topCorrelation = correlations[0];
    const metricA = formatMetricName(topCorrelation.metric_a);
    const metricB = formatMetricName(topCorrelation.metric_b);
    const direction = topCorrelation.direction.toLowerCase();
    const strength = topCorrelation.strength.toLowerCase();

    return `Your data shows a ${strength} ${direction} relationship between ${metricA} and ${metricB}. This means when one changes, the other tends to ${direction === 'positive' ? 'move in the same direction' : 'move in the opposite direction'}.`;
  };

  const formatMetricName = (metric: string): string => {
    return metric
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getMetricIcon = (metric: string): keyof typeof Ionicons.glyphMap => {
    if (metric.includes('sleep')) return 'moon-outline';
    if (metric.includes('step') || metric.includes('exercise')) return 'footsteps-outline';
    if (metric.includes('calorie') || metric.includes('energy')) return 'flame-outline';
    if (metric.includes('sugar') || metric.includes('dietary')) return 'nutrition-outline';
    if (metric.includes('heart') || metric.includes('hrv')) return 'heart-outline';
    if (metric.includes('water')) return 'water-outline';
    return 'analytics-outline';
  };

  const getMetricColor = (metric: string): string => {
    if (metric.includes('sleep')) return '#9B59B6';
    if (metric.includes('step') || metric.includes('exercise')) return '#FF6B6B';
    if (metric.includes('calorie') || metric.includes('energy')) return '#FFA500';
    if (metric.includes('sugar') || metric.includes('dietary')) return '#E74C3C';
    if (metric.includes('heart') || metric.includes('hrv')) return '#E91E63';
    if (metric.includes('water')) return '#4FC3F7';
    return '#66BB6A';
  };

  const getMetricUnit = (metric: string): string => {
    if (metric.includes('hours')) return 'h';
    if (metric.includes('count') || metric.includes('steps')) return '';
    if (metric.includes('calorie') || metric.includes('energy')) return 'kcal';
    if (metric.includes('sugar')) return 'g';
    if (metric.includes('water')) return 'L';
    if (metric.includes('heart') || metric.includes('hrv')) return 'bpm';
    return '';
  };

  const processMetrics = (): CorrelatedMetric[] => {
    if (!healthData || healthData.length === 0) return [];

    // Key metrics to show
    const keyMetrics = [
      'sleep_hours',
      'step_count',
      'active_energy_burned',
      'dietary_sugar',
      'dietary_water',
      'resting_heart_rate',
    ];

    const processed: CorrelatedMetric[] = [];

    keyMetrics.forEach((metricKey) => {
      const data: MetricData[] = [];
      let latestValue: number | null = null;

      healthData.forEach((record) => {
        const value = record.metrics?.[metricKey] || record[metricKey];
        if (value !== null && value !== undefined && !isNaN(value)) {
          data.push({
            date: record.date,
            value: Number(value),
          });
          latestValue = Number(value);
        }
      });

      if (data.length > 0) {
        const category =
          metricKey.includes('sleep')
            ? 'sleep'
            : metricKey.includes('step') || metricKey.includes('exercise') || metricKey.includes('energy')
            ? 'activity'
            : metricKey.includes('dietary') || metricKey.includes('sugar') || metricKey.includes('water')
            ? 'nutrition'
            : 'other';

        processed.push({
          name: metricKey,
          displayName: formatMetricName(metricKey),
          icon: getMetricIcon(metricKey),
          color: getMetricColor(metricKey),
          data: data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
          latestValue,
          unit: getMetricUnit(metricKey),
          category,
        });
      }
    });

    return processed;
  };

  const metrics = processMetrics();

  const getRelevantCorrelations = (metricName: string): Correlation[] => {
    return correlations.filter(
      (c) => c.metric_a === metricName || c.metric_b === metricName
    );
  };

  // Parse narrative into sections for better readability
  const parseNarrative = (text: string): { title: string; content: string }[] => {
    const sections: { title: string; content: string }[] = [];
    
    // Try to split by common section markers
    const bigPictureMatch = text.match(/Big picture[:\s]+(.*?)(?=Specific relationships|$)/is);
    const specificMatch = text.match(/Specific relationships[:\s]+(.*?)$/is);
    
    if (bigPictureMatch) {
      sections.push({
        title: 'Big Picture',
        content: bigPictureMatch[1].trim(),
      });
    }
    
    if (specificMatch) {
      sections.push({
        title: 'Specific Relationships',
        content: specificMatch[1].trim(),
      });
    }
    
    // If no sections found, return the whole text as one section
    if (sections.length === 0) {
      // Try to split by double newlines or periods followed by capital letters
      const paragraphs = text.split(/\n\n+|\.\s+(?=[A-Z])/).filter(p => p.trim().length > 0);
      if (paragraphs.length > 1) {
        sections.push({
          title: 'Overview',
          content: paragraphs[0].trim(),
        });
        sections.push({
          title: 'Details',
          content: paragraphs.slice(1).join('. ').trim(),
        });
      } else {
        sections.push({
          title: 'Your Health Story',
          content: text.trim(),
        });
      }
    }
    
    return sections;
  };

  const renderMetricCard = (metric: CorrelatedMetric, totalCount: number) => {
    const isSelected = selectedMetric === metric.name;
    const relevantCorrelations = getRelevantCorrelations(metric.name);
    const isFullWidth = totalCount === 1;

    return (
      <TouchableOpacity
        key={metric.name}
        onPress={() => setSelectedMetric(isSelected ? null : metric.name)}
        style={[
          styles.metricCard,
          { backgroundColor: cardBackground },
          isSelected && { borderColor: metric.color, borderWidth: 2 },
          isFullWidth && styles.metricCardFullWidth,
        ]}
        activeOpacity={0.7}
      >
        <View style={[
          styles.metricIconContainer, 
          { backgroundColor: metric.color + '20' },
          isFullWidth && styles.metricIconContainerCentered
        ]}>
          <Ionicons name={metric.icon} size={24} color={metric.color} />
        </View>

        <ThemedText style={[
          styles.metricName,
          isFullWidth && styles.metricNameCentered
        ]} numberOfLines={1}>
          {metric.displayName}
        </ThemedText>

        {metric.latestValue !== null && (
          <ThemedText style={[
            styles.metricValue, 
            { color: metric.color },
            isFullWidth && styles.metricValueCentered
          ]}>
            {metric.latestValue.toFixed(metric.latestValue % 1 === 0 ? 0 : 1)}
            {metric.unit && ` ${metric.unit}`}
          </ThemedText>
        )}

        {relevantCorrelations.length > 0 && (
          <View style={[
            styles.correlationBadge,
            isFullWidth && styles.correlationBadgeCentered
          ]}>
            <ThemedText style={styles.correlationBadgeText}>
              {relevantCorrelations.length} correlation{relevantCorrelations.length !== 1 ? 's' : ''}
            </ThemedText>
          </View>
        )}

        {(isSelected || isFullWidth) && relevantCorrelations.length > 0 && (
          <View style={styles.correlationsList}>
            {relevantCorrelations.slice(0, 3).map((corr, idx) => {
              const otherMetric =
                corr.metric_a === metric.name ? corr.metric_b : corr.metric_a;
              return (
                <View key={idx} style={[
                  styles.correlationItem,
                  isFullWidth && styles.correlationItemCentered
                ]}>
                  <ThemedText style={[
                    styles.correlationText,
                    isFullWidth && styles.correlationTextCentered
                  ]} numberOfLines={1}>
                    {formatMetricName(otherMetric)}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.correlationValue,
                      { color: corr.correlation > 0 ? '#10b981' : '#ef4444' },
                    ]}
                  >
                    {Math.abs(Math.round(corr.correlation * 100))}%
                  </ThemedText>
                </View>
              );
            })}
          </View>
        )}
      </TouchableOpacity>
    );
  };


  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={styles.loadingText}>Loading your health story...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const sleepMetrics = metrics.filter((m) => m.category === 'sleep');
  const activityMetrics = metrics.filter((m) => m.category === 'activity');
  const nutritionMetrics = metrics.filter((m) => m.category === 'nutrition');
  const otherMetrics = metrics.filter((m) => m.category === 'other');

  const narrativeSections = narrative ? parseNarrative(narrative) : [];

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadDashboardData}
            tintColor={tintColor}
            colors={[tintColor]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextContainer}>
              <ThemedText type="title" style={styles.title}>
                Your Health Story
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                See how sleep, activity, and nutrition connect
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={loadDashboardData}
              disabled={loading}
              style={[
                styles.refreshButton,
                { borderColor: tintColor + '40' },
                loading && styles.refreshButtonDisabled
              ]}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color={tintColor} />
              ) : (
                <Ionicons name="refresh-outline" size={20} color={tintColor} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Narrative Card */}
        {narrative && (
          <View style={[styles.narrativeCard, { backgroundColor: tintColor }]}>
            <View style={styles.narrativeHeader}>
              <Ionicons name="book-outline" size={24} color="#fff" style={styles.narrativeIcon} />
              <ThemedText style={styles.narrativeTitle}>The Story</ThemedText>
            </View>
            {narrativeLoading ? (
              <ActivityIndicator color="#fff" size="small" style={styles.narrativeLoader} />
            ) : (
              <View style={styles.narrativeContent}>
                {narrativeSections.map((section, idx) => (
                  <View key={idx} style={styles.narrativeSection}>
                    {narrativeSections.length > 1 && (
                      <ThemedText style={styles.narrativeSectionTitle}>
                        {section.title}
                      </ThemedText>
                    )}
                    <ThemedText style={styles.narrativeText}>
                      {section.content}
                    </ThemedText>
                    {idx < narrativeSections.length - 1 && (
                      <View style={styles.narrativeDivider} />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Sleep Metrics */}
        {sleepMetrics.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>😴 Sleep</ThemedText>
            </View>
            <View style={styles.metricsGrid}>
              {sleepMetrics.map((metric) => renderMetricCard(metric, sleepMetrics.length))}
            </View>
          </View>
        )}

        {/* Activity Metrics */}
        {activityMetrics.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>🏃 Activity</ThemedText>
            </View>
            <View style={styles.metricsGrid}>
              {activityMetrics.map((metric) => renderMetricCard(metric, activityMetrics.length))}
            </View>
          </View>
        )}

        {/* Nutrition Metrics */}
        {nutritionMetrics.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>🥗 Nutrition</ThemedText>
            </View>
            <View style={styles.metricsGrid}>
              {nutritionMetrics.map((metric) => renderMetricCard(metric, nutritionMetrics.length))}
            </View>
          </View>
        )}

        {/* Other Metrics */}
        {otherMetrics.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>📊 Other Metrics</ThemedText>
            </View>
            <View style={styles.metricsGrid}>
              {otherMetrics.map((metric) => renderMetricCard(metric, otherMetrics.length))}
            </View>
          </View>
        )}

        {/* Key Correlations */}
        {correlations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>🔗 Key Relationships</ThemedText>
            </View>
            <View style={[styles.correlationsCard, { backgroundColor: cardBackground }]}>
              {correlations.slice(0, 5).map((corr, idx) => (
                <View key={idx} style={styles.correlationRow}>
                  <View style={styles.correlationMetrics}>
                    <ThemedText style={styles.correlationMetricName} numberOfLines={2}>
                      {formatMetricName(corr.metric_a)}
                    </ThemedText>
                    <ThemedText style={styles.correlationArrow}>
                      {corr.direction === 'Positive' ? '↔️' : '⤫'}
                    </ThemedText>
                    <ThemedText style={styles.correlationMetricName} numberOfLines={2}>
                      {formatMetricName(corr.metric_b)}
                    </ThemedText>
                  </View>
                  <View style={styles.correlationInfo}>
                    <ThemedText
                      style={[
                        styles.correlationStrength,
                        {
                          color:
                            corr.strength === 'Strong'
                              ? '#ef4444'
                              : corr.strength === 'Moderate'
                              ? '#f59e0b'
                              : '#10b981',
                        },
                      ]}
                    >
                      {corr.strength}
                    </ThemedText>
                    <ThemedText style={styles.correlationCoeff}>
                      {Math.abs(Math.round(corr.correlation * 100))}%
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {metrics.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={64} color={tintColor} style={styles.emptyIcon} />
            <ThemedText style={styles.emptyTitle}>No data yet</ThemedText>
            <ThemedText style={styles.emptyText}>
              Start tracking your health metrics to see how they relate to each other. Sync your HealthKit data to get started!
            </ThemedText>
          </View>
        )}

        {!narrative && !narrativeLoading && metrics.length > 0 && (
          <View style={[styles.emptyNarrativeContainer, { backgroundColor: cardBackground }]}>
            <Ionicons name="book-outline" size={32} color={tintColor} style={styles.emptyNarrativeIcon} />
            <ThemedText style={styles.emptyNarrativeText}>
              Your health story will appear here once we have enough data to analyze relationships.
            </ThemedText>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.6,
  },
  narrativeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  narrativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  narrativeIcon: {
    marginRight: 10,
  },
  narrativeTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  narrativeContent: {
    // gap: 16, // Using marginBottom instead for better compatibility
  },
  narrativeSection: {
    marginBottom: 16,
    // gap: 8, // Using marginBottom instead for better compatibility
  },
  narrativeSectionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    opacity: 0.98,
    letterSpacing: 0.2,
  },
  narrativeText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.95,
    letterSpacing: 0.1,
  },
  narrativeDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginTop: 12,
    marginBottom: 4,
  },
  narrativeLoader: {
    marginVertical: 8,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.15)',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: METRIC_CARD_WIDTH,
    padding: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.1)',
    marginBottom: 12,
  },
  metricCardFullWidth: {
    width: width - 32, // Full width minus horizontal padding
    alignItems: 'center',
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIconContainerCentered: {
    alignSelf: 'center',
  },
  metricName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  metricNameCentered: {
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  metricValueCentered: {
    textAlign: 'center',
  },
  correlationBadge: {
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  correlationBadgeCentered: {
    alignSelf: 'center',
  },
  correlationBadgeText: {
    fontSize: 11,
    opacity: 0.7,
  },
  correlationsList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  correlationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  correlationItemCentered: {
    justifyContent: 'center',
    gap: 12,
  },
  correlationText: {
    fontSize: 13,
    opacity: 0.9,
    flex: 1,
    marginRight: 8,
    fontWeight: '500',
  },
  correlationTextCentered: {
    flex: 0,
    marginRight: 0,
    textAlign: 'center',
  },
  correlationValue: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'right',
  },
  correlationsCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  correlationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.1)',
  },
  correlationMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
    paddingRight: 12,
    // gap: 8, // Using marginHorizontal instead for better compatibility
  },
  correlationMetricName: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  correlationArrow: {
    fontSize: 14,
    marginHorizontal: 6,
    flexShrink: 0,
  },
  correlationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    // gap: 12, // Using marginLeft instead for better compatibility
  },
  correlationStrength: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  correlationCoeff: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 20,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyNarrativeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.1)',
    borderStyle: 'dashed',
  },
  emptyNarrativeIcon: {
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyNarrativeText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 20,
  },
});

