import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface TomorrowPrediction {
  user_id: string;
  type: string;
  date: string;
  prediction: string;
  insight_id: string | null;
  based_on: {
    days_analyzed: number;
    trends_count: number;
    patterns_detected: number;
    correlations_count: number;
  };
}

interface PredictionDashboardProps {
  days?: number;
  hideHeader?: boolean;
  embedded?: boolean;
  onPredictionChange?: (hasPrediction: boolean) => void;
}

export interface PredictionDashboardRef {
  refresh: () => void;
  generate: () => void;
}

export const PredictionDashboard = forwardRef<PredictionDashboardRef, PredictionDashboardProps>(
  ({ days = 30, hideHeader = false, embedded = false, onPredictionChange }, ref) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<TomorrowPrediction | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const tintColor = useThemeColor({}, 'tint');
  const cardBackground = useThemeColor({ light: '#ffffff', dark: '#1a1a1a' }, 'background');
  const backgroundColor = useThemeColor({}, 'background');

  const loadPrediction = async (isRefresh = false) => {
    if (!user?.id) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const userName = user?.user_metadata?.full_name?.split(' ')[0] || undefined;
      const response = await api.insights.getTomorrowPrediction(user.id, userName);
      setPrediction(response);
      setHasGenerated(true);
      onPredictionChange?.(true);
    } catch (error) {
      console.error('Failed to load prediction:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleGeneratePrediction = () => {
    loadPrediction();
  };

  const onRefresh = () => {
    loadPrediction(true);
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    refresh: () => loadPrediction(true),
    generate: () => loadPrediction(),
  }));

  // Parse prediction into sections
  const parsePrediction = (text: string): { title: string; content: string }[] => {
    const sections: { title: string; content: string }[] = [];
    
    // Try to find sections by common patterns (Hard coded approach for now)
    const whatToExpectMatch = text.match(/(?:What to Expect|What to expect)[:\s]+(.*?)(?=(?:Actionable|What to Watch|$))/is);
    const actionableMatch = text.match(/(?:Actionable Preparation|Actionable|Preparation)[:\s]+(.*?)(?=(?:What to Watch|$))/is);
    const watchForMatch = text.match(/(?:What to Watch For|What to Watch|Watch For)[:\s]+(.*?)$/is);
    
    if (whatToExpectMatch) {
      sections.push({
        title: 'What to Expect',
        content: whatToExpectMatch[1].trim(),
      });
    }
    
    if (actionableMatch) {
      sections.push({
        title: 'Actionable Tips',
        content: actionableMatch[1].trim(),
      });
    }
    
    if (watchForMatch) {
      sections.push({
        title: 'What to Watch For',
        content: watchForMatch[1].trim(),
      });
    }
    
    // If no sections found, try to split by numbered items or paragraphs
    if (sections.length === 0) {
      // Try splitting by numbered lists (1., 2., 3.)
      const numberedMatch = text.match(/(\d+\.\s+.*?)(?=\d+\.|$)/gs);
      if (numberedMatch && numberedMatch.length > 1) {
        numberedMatch.forEach((item, idx) => {
          sections.push({
            title: `Point ${idx + 1}`,
            content: item.replace(/^\d+\.\s+/, '').trim(),
          });
        });
      } else {
        // Split by double newlines or periods followed by capital letters
        const paragraphs = text.split(/\n\n+|\.\s+(?=[A-Z])/).filter(p => p.trim().length > 0);
        if (paragraphs.length > 1) {
          paragraphs.forEach((para, idx) => {
            sections.push({
              title: idx === 0 ? 'Overview' : `Section ${idx + 1}`,
              content: para.trim(),
            });
          });
        } else {
          sections.push({
            title: 'Your Prediction',
            content: text.trim(),
          });
        }
      }
    }
    
    return sections;
  };

  if (loading && !prediction) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={styles.loadingText}>Generating your prediction...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const predictionSections = prediction?.prediction ? parsePrediction(prediction.prediction) : [];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const formattedDate = tomorrowDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  const content = (
    <>
      {/* Header */}
      {!hideHeader && (
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextContainer}>
              <ThemedText type="title" style={styles.title}>
                Tomorrow's Forecast
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                {formattedDate}
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={() => loadPrediction(true)}
              disabled={refreshing}
              style={[
                styles.refreshButton,
                { borderColor: tintColor + '40' },
                refreshing && styles.refreshButtonDisabled
              ]}
              activeOpacity={0.7}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={tintColor} />
              ) : (
                <Ionicons name="refresh-outline" size={20} color={tintColor} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

        {/* Generate Button or Loading State */}
        {loading && !prediction && (
          <View style={[styles.emptyCard, { backgroundColor: cardBackground }]}>
            <ActivityIndicator size="large" color={tintColor} style={styles.emptyIcon} />
            <ThemedText style={styles.emptyTitle}>Generating Prediction...</ThemedText>
            <ThemedText style={styles.emptyText}>
              Analyzing your health data to create a personalized forecast for tomorrow.
            </ThemedText>
          </View>
        )}

        {/* Generate Button - Show when no prediction exists */}
        {!loading && !prediction && (
          <View style={[styles.emptyCard, { backgroundColor: cardBackground }]}>
            <Ionicons name="sparkles-outline" size={48} color={tintColor} style={styles.emptyIcon} />
            <ThemedText style={styles.emptyTitle}>Generate Tomorrow's Prediction</ThemedText>
            <ThemedText style={styles.emptyText}>
              Get AI-powered insights about what to expect tomorrow based on your health patterns, trends, and correlations.
            </ThemedText>
            <TouchableOpacity
              onPress={handleGeneratePrediction}
              disabled={loading}
              style={[styles.generateButton, { backgroundColor: tintColor }]}
              activeOpacity={0.7}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" style={styles.buttonSpinner} />
                  <ThemedText style={styles.generateButtonText}>Generating...</ThemedText>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#fff" style={styles.buttonIcon} />
                  <ThemedText style={styles.generateButtonText}>Generate Prediction</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Prediction Card */}
        {prediction && prediction.prediction && (
          <View style={[styles.predictionCard, { backgroundColor: tintColor }]}>
            <View style={styles.predictionHeader}>
              <Ionicons name="sparkles-outline" size={24} color="#fff" style={styles.predictionIcon} />
              <ThemedText style={styles.predictionTitle}>Your Personalized Prediction</ThemedText>
            </View>
            <View style={styles.predictionContent}>
              {predictionSections.map((section, idx) => (
                <View key={idx} style={styles.predictionSection}>
                  {predictionSections.length > 1 && (
                    <ThemedText style={styles.predictionSectionTitle}>
                      {section.title}
                    </ThemedText>
                  )}
                  <ThemedText style={styles.predictionText}>
                    {section.content}
                  </ThemedText>
                  {idx < predictionSections.length - 1 && (
                    <View style={styles.predictionDivider} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Metadata Card */}
        {prediction && prediction.based_on && (
          <View style={[styles.metadataCard, { backgroundColor: cardBackground }]}>
            <View style={styles.metadataHeader}>
              <Ionicons name="analytics-outline" size={20} color={tintColor} />
              <ThemedText style={styles.metadataTitle}>Based On</ThemedText>
            </View>
            <View style={styles.metadataGrid}>
              <View style={styles.metadataItem}>
                <ThemedText style={styles.metadataValue}>
                  {prediction.based_on.days_analyzed}
                </ThemedText>
                <ThemedText style={styles.metadataLabel}>Days Analyzed</ThemedText>
              </View>
              <View style={styles.metadataItem}>
                <ThemedText style={styles.metadataValue}>
                  {prediction.based_on.trends_count}
                </ThemedText>
                <ThemedText style={styles.metadataLabel}>Trends</ThemedText>
              </View>
              <View style={styles.metadataItem}>
                <ThemedText style={styles.metadataValue}>
                  {prediction.based_on.patterns_detected}
                </ThemedText>
                <ThemedText style={styles.metadataLabel}>Patterns</ThemedText>
              </View>
              <View style={styles.metadataItem}>
                <ThemedText style={styles.metadataValue}>
                  {prediction.based_on.correlations_count}
                </ThemedText>
                <ThemedText style={styles.metadataLabel}>Correlations</ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: cardBackground }]}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={20} color={tintColor} />
            <ThemedText style={styles.infoTitle}>How It Works</ThemedText>
          </View>
          <ThemedText style={styles.infoText}>
            This prediction is generated using AI analysis of your recent health data, trends, patterns, and correlations. 
            It helps you prepare for tomorrow by identifying what to expect and how to optimize your day.
          </ThemedText>
        </View>

        {!embedded && <View style={styles.bottomSpacing} />}
      </>
  );

  if (embedded) {
    return (
      <View>
        {!hideHeader && (
          <View style={styles.embeddedHeader}>
            <ThemedText style={styles.embeddedDate}>{formattedDate}</ThemedText>
            {prediction ? (
              <TouchableOpacity
                onPress={() => loadPrediction(true)}
                disabled={refreshing || loading}
                style={[
                  styles.embeddedRefreshButton,
                  { borderColor: tintColor + '40' },
                  (refreshing || loading) && styles.refreshButtonDisabled
                ]}
                activeOpacity={0.7}
              >
                {refreshing || loading ? (
                  <ActivityIndicator size="small" color={tintColor} />
                ) : (
                  <Ionicons name="refresh-outline" size={18} color={tintColor} />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleGeneratePrediction}
                disabled={loading}
                style={[
                  styles.embeddedRefreshButton,
                  { borderColor: tintColor + '40', backgroundColor: tintColor + '20' },
                  loading && styles.refreshButtonDisabled
                ]}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={tintColor} />
                ) : (
                  <Ionicons name="sparkles" size={18} color={tintColor} />
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
        {content}
      </View>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tintColor}
            colors={[tintColor]}
          />
        }
      >
        {content}
      </ScrollView>
    </ThemedView>
  );
  }
);

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
  predictionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  predictionIcon: {
    marginRight: 10,
  },
  predictionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  predictionContent: {
    // gap: 16, // Using marginBottom instead for better compatibility
  },
  predictionSection: {
    marginBottom: 16,
  },
  predictionSectionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    opacity: 0.98,
    letterSpacing: 0.2,
  },
  predictionText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.95,
    letterSpacing: 0.1,
  },
  predictionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginTop: 12,
    marginBottom: 4,
  },
  metadataCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  metadataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metadataTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metadataItem: {
    width: (width - 72) / 2,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
    marginBottom: 12,
    alignItems: 'center',
  },
  metadataValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metadataLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 40,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.1)',
    borderStyle: 'dashed',
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonSpinner: {
    marginRight: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
  embeddedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  embeddedDate: {
    fontSize: 14,
    opacity: 0.6,
  },
  embeddedRefreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

