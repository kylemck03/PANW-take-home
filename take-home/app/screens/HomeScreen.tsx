import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Animated, Dimensions, ActivityIndicator } from 'react-native';
import Rive, { RiveRef } from 'rive-react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { HealthDashboard } from '@/components/health-dashboard';
import { ProfileHeader } from '@/components/profile-header';
import { PredictionDashboard, type PredictionDashboardRef } from '@/components/prediction-dashboard';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/auth-context';
import { useHealthKit } from '@/hooks/use-healthkit';
import { api, type Insight } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();
  const { syncToSupabase, isSyncing, syncError, refetch } = useHealthKit();
  const riveRef = useRef<RiveRef>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const predictionDashboardRef = useRef<PredictionDashboardRef>(null);
  const [predictionExists, setPredictionExists] = useState(false);
  const [greeting, setGreeting] = useState('Good morning');
  const [dailyInsight, setDailyInsight] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [dayStreak, setDayStreak] = useState<number | null>(null);
  const [correlationsCount, setCorrelationsCount] = useState<number | null>(null);
  const [anomaliesCount, setAnomaliesCount] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({ light: '#f5f5f5', dark: '#1a1a1a' }, 'background');

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }

    // Entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Load insights from backend
    loadInsights();
    // Load stats (streak, correlations, anomalies)
    loadStats();
  }, [user?.id]);

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  const loadInsights = async () => {
    if (!user?.id) return;

    try {
      setInsightsLoading(true);
      setInsightsError(null);

      // Fetch daily insights from backend
      const response = await api.insights.getDaily(user.id, userName);
      
      // Extract the insight text from the response
      if (response.insights) {
        setDailyInsight(response.insights);
      } else if (response.narrative) {
        setDailyInsight(response.narrative);
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
      setInsightsError('Unable to load insights. Using default tip.');
      // Keep default tip on error
      setDailyInsight(null);
    } finally {
      setInsightsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user?.id) return;

    try {
      setStatsLoading(true);

      // Calculate day streak from health data
      const healthDataResponse = await api.healthData.getHistory(user.id, 90);
      if (healthDataResponse.data && healthDataResponse.data.length > 0) {
        const streak = calculateDayStreak(healthDataResponse.data);
        setDayStreak(streak);
      } else {
        setDayStreak(0);
      }

      // Fetch correlations count
      try {
        const correlationsResponse = await api.analytics.getCorrelations(user.id, 90);
        if (correlationsResponse.correlations) {
          setCorrelationsCount(correlationsResponse.correlations.length);
        } else {
          setCorrelationsCount(0);
        }
      } catch (error) {
        console.error('Failed to load correlations:', error);
        setCorrelationsCount(0);
      }

      // Fetch anomalies count
      try {
        const anomaliesResponse = await api.analytics.getAnomalies(user.id, 90);
        if (anomaliesResponse.anomalies) {
          setAnomaliesCount(anomaliesResponse.anomalies.length);
        } else {
          setAnomaliesCount(0);
        }
      } catch (error) {
        console.error('Failed to load anomalies:', error);
        setAnomaliesCount(0);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Set defaults on error
      setDayStreak(0);
      setCorrelationsCount(0);
      setAnomaliesCount(0);
    } finally {
      setStatsLoading(false);
    }
  };

  const calculateDayStreak = (healthData: any[]): number => {
    if (!healthData || healthData.length === 0) return 0;

    // Sort by date descending (most recent first)
    const sortedData = [...healthData].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let currentDate = new Date(today);

    // Check if today has data
    const todayStr = currentDate.toISOString().split('T')[0];
    const hasTodayData = sortedData.some(record => {
      const recordDate = new Date(record.date).toISOString().split('T')[0];
      return recordDate === todayStr;
    });

    if (!hasTodayData) {
      // If today doesn't have data, start from yesterday
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Count consecutive days with data
    for (let i = 0; i < 365; i++) { // Max 365 days
      const dateStr = currentDate.toISOString().split('T')[0];
      const hasData = sortedData.some(record => {
        const recordDate = new Date(record.date).toISOString().split('T')[0];
        return recordDate === dateStr;
      });

      if (hasData) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  const handleSyncHealthData = async () => {
    if (!user?.id) return;

    try {
      setSyncSuccess(false);
      // First refetch to get latest HealthKit data
      await refetch();
      // Then sync to Supabase
      const success = await syncToSupabase(user.id);
      if (success) {
        setSyncSuccess(true);
        // Reload stats after successful sync
        loadStats();
        // Clear success message after 3 seconds
        setTimeout(() => setSyncSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error syncing health data:', error);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <ProfileHeader />

        {/* Character Greeting Section */}
        <Animated.View style={[styles.greetingSection, { opacity: fadeAnim }]}>
          <View style={[styles.greetingCard, { backgroundColor: cardBackground }]}>
            <View style={styles.greetingContent}>
              <View style={styles.greetingTextContainer}>
                <ThemedText type="title" style={styles.greetingTitle}>
                  {greeting}, {userName}! 
                </ThemedText>
                <ThemedText style={styles.greetingSubtitle}>
                  Ready to crush your health goals today?
                </ThemedText>
              </View>
              
              <View style={styles.characterMini}>
                <Rive
                  ref={riveRef}
                  resourceName="beanie_loading"
                  autoplay={true}
                  style={styles.characterAnimation}
                />
              </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                {statsLoading ? (
                  <ActivityIndicator size="small" color={tintColor} />
                ) : (
                  <ThemedText style={styles.statValue}>
                    {dayStreak !== null ? dayStreak : '--'}
                  </ThemedText>
                )}
                <ThemedText style={styles.statLabel}>Day Streak 🔥</ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: tintColor, opacity: 0.2 }]} />
              <View style={styles.statItem}>
                {statsLoading ? (
                  <ActivityIndicator size="small" color={tintColor} />
                ) : (
                  <ThemedText style={styles.statValue}>
                    {correlationsCount !== null ? correlationsCount : '--'}
                  </ThemedText>
                )}
                <ThemedText style={styles.statLabel}>Correlations</ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: tintColor, opacity: 0.2 }]} />
              <View style={styles.statItem}>
                {statsLoading ? (
                  <ActivityIndicator size="small" color={tintColor} />
                ) : (
                  <ThemedText style={styles.statValue}>
                    {anomaliesCount !== null ? anomaliesCount : '--'}
                  </ThemedText>
                )}
                <ThemedText style={styles.statLabel}>Anomalies</ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Daily Tip from Beanie */}
        <View style={[styles.tipCard, { backgroundColor: tintColor }]}>
          <View style={styles.tipHeader}>
            <ThemedText style={styles.tipTitle}>
              {insightsLoading ? '✨ Loading insights...' : '💡 Tip from Beanie'}
            </ThemedText>
          </View>
          {insightsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" size="small" />
              <ThemedText style={styles.tipText}>Analyzing your health data...</ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.tipText}>
              {dailyInsight || '"Remember to stay hydrated! Aim for at least 8 glasses of water throughout the day."'}
            </ThemedText>
          )}
          {insightsError && !insightsLoading && (
            <TouchableOpacity onPress={loadInsights} style={styles.retryButton}>
              <ThemedText style={styles.retryText}>Tap to retry</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Health Dashboard */}
        <View style={styles.dashboardSection}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Your Health Overview
            </ThemedText>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                onPress={handleSyncHealthData}
                disabled={isSyncing}
                style={[
                  styles.syncButton, 
                  { borderColor: tintColor + '40' },
                  isSyncing && styles.syncButtonDisabled
                ]}
                activeOpacity={0.7}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color={tintColor} />
                ) : (
                  <Ionicons name="sync-outline" size={18} color={tintColor} />
                )}
                <ThemedText style={[styles.syncButtonText, { color: tintColor }]}>
                  {isSyncing ? 'Syncing...' : syncSuccess ? 'Synced!' : 'Sync'}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.seeAllButton}>
                <ThemedText style={[styles.seeAllText, { color: tintColor }]}>
                  See All
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          {syncError && (
            <View style={styles.syncErrorContainer}>
              <ThemedText style={styles.syncErrorText}>
                ⚠️ {syncError}
              </ThemedText>
            </View>
          )}
          <HealthDashboard />
        </View>

        {/* Tomorrow's Prediction */}
        <View style={styles.predictionSection}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Tomorrow's Forecast
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                if (predictionDashboardRef.current) {
                  if (predictionExists) {
                    predictionDashboardRef.current.refresh();
                  } else {
                    predictionDashboardRef.current.generate();
                  }
                }
              }}
              style={[
                styles.refreshButtonSmall,
                { 
                  borderColor: tintColor + '40',
                  backgroundColor: predictionExists ? 'transparent' : tintColor + '20',
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={predictionExists ? "refresh-outline" : "sparkles"} 
                size={18} 
                color={tintColor} 
              />
            </TouchableOpacity>
          </View>
          <PredictionDashboard 
            ref={predictionDashboardRef}
            days={30} 
            hideHeader={true} 
            embedded={true}
            onPredictionChange={(hasPrediction) => setPredictionExists(hasPrediction)}
          />
        </View>

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  greetingSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  greetingCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  greetingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  greetingSubtitle: {
    fontSize: 15,
    opacity: 0.7,
    lineHeight: 22,
  },
  characterMini: {
    width: 80,
    height: 80,
  },
  characterAnimation: {
    width: '100%',
    height: '100%',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  tipCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
  },
  tipHeader: {
    marginBottom: 8,
  },
  tipTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tipText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.95,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  dashboardSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  seeAllButton: {
    paddingVertical: 6,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncErrorContainer: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  syncErrorText: {
    fontSize: 12,
    color: '#FFC107',
  },
  predictionSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  bottomSpacing: {
    height: 20,
  },
});

