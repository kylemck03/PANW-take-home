import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Dimensions, Platform, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useHealthKit } from '@/hooks/use-healthkit';
import { useAuth } from '@/contexts/auth-context';
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore - HealthKit types may not be available until after pod install
import HealthKit from '@kingstinct/react-native-healthkit';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

type HealthMetric = {
  id: string;
  title: string;
  value: string;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  progress?: number;
  isLoading?: boolean;
};

// Helper function to format numbers with commas
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '--';
  return Math.round(num).toLocaleString();
};

// Helper function to format decimals
const formatDecimal = (num: number | null | undefined, decimals: number = 1): string => {
  if (num === null || num === undefined) return '--';
  return num.toFixed(decimals);
};

export function HealthDashboard() {
  const { user } = useAuth();
  const { healthData, isLoading, syncToSupabase, isSyncing, syncError } = useHealthKit();
  const [waterCups, setWaterCups] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [loadingWater, setLoadingWater] = useState(false);
  const [loadingWeight, setLoadingWeight] = useState(false);
  const [hasSyncedToday, setHasSyncedToday] = useState(false);
  const cardBackground = useThemeColor({ light: '#f5f5f5', dark: '#1a1a1a' }, 'background');

  // Fetch water data
  useEffect(() => {
    const fetchWater = async () => {
      if (Platform.OS !== 'ios') return;
      
      try {
        setLoadingWater(true);
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const waterSamples = await HealthKit.queryQuantitySamples(
          'HKQuantityTypeIdentifierDietaryWater',
          {
            filter: {
              startDate: startOfDay,
              endDate: endOfDay,
            },
          }
        );

        // Convert liters to cups (1 liter ≈ 4.22675 cups)
        const totalLiters = waterSamples.reduce((sum: number, sample: any) => sum + sample.quantity, 0);
        const cups = totalLiters * 4.22675;
        setWaterCups(cups);
      } catch (err) {
        console.log('Water data not available:', err);
      } finally {
        setLoadingWater(false);
      }
    };

    fetchWater();
  }, []);

  // Fetch weight data (most recent)
  useEffect(() => {
    const fetchWeight = async () => {
      if (Platform.OS !== 'ios') return;
      
      try {
        setLoadingWeight(true);
        const weightSamples = await HealthKit.queryQuantitySamples(
          'HKQuantityTypeIdentifierBodyMass',
          {
            limit: 1,
            ascending: false,
          }
        );

        if (weightSamples.length > 0) {
          // Convert kg to lbs (1 kg = 2.20462 lbs)
          const kg = weightSamples[0].quantity;
          const lbs = kg * 2.20462;
          setWeight(lbs);
        }
      } catch (err) {
        console.log('Weight data not available:', err);
      } finally {
        setLoadingWeight(false);
      }
    };

    fetchWeight();
  }, []);

  // Sync health data to Supabase when data is loaded and user is available
  useEffect(() => {
    const syncData = async () => {
      // Only sync if:
      // 1. User is logged in
      // 2. Health data has been loaded (not loading)
      // 3. We have some data to sync
      // 4. We haven't already synced today
      if (
        user?.id &&
        !isLoading &&
        !isSyncing &&
        !hasSyncedToday &&
        (healthData.stepCount !== null || healthData.activeEnergyBurned !== null || healthData.sleepAnalysis !== null)
      ) {
        try {
          const success = await syncToSupabase(user.id);
          if (success) {
            setHasSyncedToday(true);
            console.log('✅ Health data synced to Supabase');
          } else if (syncError) {
            console.warn('⚠️ Failed to sync health data:', syncError);
          }
        } catch (error) {
          console.error('Error syncing health data:', error);
        }
      }
    };

    syncData();
  }, [user?.id, isLoading, isSyncing, healthData, hasSyncedToday, syncToSupabase, syncError]);

  // Reset sync flag at the start of a new day
  useEffect(() => {
    const checkNewDay = async () => {
      try {
        const today = new Date().toDateString();
        const lastSyncDate = await AsyncStorage.getItem('lastHealthSyncDate');
        if (lastSyncDate !== today) {
          setHasSyncedToday(false);
          await AsyncStorage.setItem('lastHealthSyncDate', today);
        }
      } catch (error) {
        console.error('Error checking sync date:', error);
      }
    };

    checkNewDay();
    // Check every minute to catch day changes
    const interval = setInterval(checkNewDay, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate metrics from HealthKit data
  const steps = healthData.stepCount;
  const stepsGoal = 10000;
  const stepsProgress = steps ? Math.min(100, Math.round((steps / stepsGoal) * 100)) : undefined;
  const stepsValue = formatNumber(steps);
  const stepsUnit = `/ ${stepsGoal.toLocaleString()}`;

  const calories = healthData.activeEnergyBurned;
  const caloriesValue = formatNumber(calories);
  const caloriesUnit = 'kcal';

  const waterGoal = 8;
  const waterProgress = waterCups ? Math.min(100, Math.round((waterCups / waterGoal) * 100)) : undefined;
  const waterValue = waterCups ? formatDecimal(waterCups, 1) : '--';
  const waterUnit = `/ ${waterGoal} cups`;

  const sleepHours = healthData.sleepAnalysis?.asleepHours;
  const sleepGoal = 8;
  const sleepProgress = sleepHours ? Math.min(100, Math.round((sleepHours / sleepGoal) * 100)) : undefined;
  const sleepValue = sleepHours ? formatDecimal(sleepHours, 1) : '--';
  const sleepUnit = 'hours';

  const heartRate = healthData.heartRate?.current || healthData.heartRate?.resting;
  const heartRateValue = heartRate ? formatNumber(heartRate) : '--';
  const heartRateUnit = 'bpm';

  const weightValue = weight ? formatDecimal(weight, 1) : '--';
  const weightUnit = 'lbs';

  const healthMetrics: HealthMetric[] = [
    {
      id: 'steps',
      title: 'Steps',
      value: stepsValue,
      unit: stepsUnit,
      icon: 'footsteps-outline',
      color: '#FF6B6B',
      progress: stepsProgress,
      isLoading: isLoading,
    },
    {
      id: 'sleep',
      title: 'Sleep',
      value: sleepValue,
      unit: sleepUnit,
      icon: 'moon-outline',
      color: '#9B59B6',
      progress: sleepProgress,
      isLoading: isLoading,
    },
    {
      id: 'water',
      title: 'Water',
      value: waterValue,
      unit: waterUnit,
      icon: 'water-outline',
      color: '#4FC3F7',
      progress: waterProgress,
      isLoading: loadingWater,
    },
    {
      id: 'heart',
      title: 'Heart Rate',
      value: heartRateValue,
      unit: heartRateUnit,
      icon: 'heart-outline',
      color: '#E91E63',
      isLoading: isLoading,
    },
    {
      id: 'weight',
      title: 'Weight',
      value: weightValue,
      unit: weightUnit,
      icon: 'analytics-outline',
      color: '#66BB6A',
      isLoading: loadingWeight,
    },
  ];

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      snapToInterval={CARD_WIDTH + 12}
      decelerationRate="fast"
    >
      {healthMetrics.map((metric, index) => (
        <MetricCard 
          key={metric.id} 
          metric={metric} 
          cardBackground={cardBackground}
          isLast={index === healthMetrics.length - 1}
        />
      ))}
    </ScrollView>
  );
}

type MetricCardProps = {
  metric: HealthMetric;
  cardBackground: string;
  isLast: boolean;
};

function MetricCard({ metric, cardBackground, isLast }: MetricCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: cardBackground }, isLast && styles.lastCard]}>
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: metric.color + '20' }]}>
        {metric.isLoading ? (
          <ActivityIndicator size="small" color={metric.color} />
        ) : (
          <Ionicons name={metric.icon} size={24} color={metric.color} />
        )}
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <ThemedText style={styles.metricTitle}>{metric.title}</ThemedText>
        
        <View style={styles.valueContainer}>
          {metric.isLoading ? (
            <ActivityIndicator size="small" color={metric.color} style={styles.loader} />
          ) : (
            <>
              <ThemedText 
                style={styles.metricValue}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {metric.value}
              </ThemedText>
              <ThemedText 
                style={styles.metricUnit}
                numberOfLines={1}
              >
                {metric.unit}
              </ThemedText>
            </>
          )}
        </View>

        {/* Progress bar if available */}
        {metric.progress !== undefined && !metric.isLoading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${metric.progress}%`,
                    backgroundColor: metric.color,
                  }
                ]} 
              />
            </View>
            <ThemedText style={styles.progressText}>{metric.progress}%</ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingRight: 16,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    minHeight: 160,
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
    overflow: 'visible',
  },
  lastCard: {
    marginRight: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  metricTitle: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
    width: '100%',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    flexShrink: 1,
    maxWidth: '100%',
  },
  metricUnit: {
    fontSize: 12,
    opacity: 0.6,
    flexShrink: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBackground: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
    minWidth: 35,
  },
  loader: {
    marginRight: 8,
  },
});

