import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
// @ts-ignore - HealthKit types may not be available until after pod install
import HealthKit from '@kingstinct/react-native-healthkit';
import { api, type HealthDataSync } from '@/lib/api';

export interface HealthData {
  sleepAnalysis: {
    asleepHours: number;
    inBedHours: number;
    date: Date;
  } | null;
  heartRate: {
    current: number;
    resting: number;
  } | null;
  heartRateVariability: number | null;
  stepCount: number | null;
  activeEnergyBurned: number | null;
  dietaryEnergyConsumed: number | null;
  mindfulMinutes: number | null;
}

export const useHealthKit = () => {
  const [healthData, setHealthData] = useState<HealthData>({
    sleepAnalysis: null,
    heartRate: null,
    heartRateVariability: null,
    stepCount: null,
    activeEnergyBurned: null,
    dietaryEnergyConsumed: null,
    mindfulMinutes: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const requestAuthorization = async () => {
    if (Platform.OS !== 'ios') {
      setError('HealthKit is only available on iOS');
      setIsLoading(false);
      return false;
    }

    try {
      const isAvailable = await HealthKit.isHealthDataAvailableAsync();
      if (!isAvailable) {
        setError('HealthKit is not available on this device');
        setIsLoading(false);
        return false;
      }

      // Request permissions for all the health data types we need
      await HealthKit.requestAuthorization(
        [
          // Write permissions for user-input data
          'HKQuantityTypeIdentifierBodyMass',              // Weight
          'HKQuantityTypeIdentifierHeight',                // Height
          'HKQuantityTypeIdentifierDietaryEnergyConsumed', // Dietary Energy
          'HKQuantityTypeIdentifierDietarySugar',          // Dietary Sugar
          'HKQuantityTypeIdentifierDietaryWater',          // Water
          'HKCategoryTypeIdentifierSleepAnalysis',         // Sleep
        ],
        [
          // Read permissions
          'HKQuantityTypeIdentifierStepCount',
          'HKQuantityTypeIdentifierHeartRate',
          'HKQuantityTypeIdentifierRestingHeartRate',
          'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
          'HKQuantityTypeIdentifierActiveEnergyBurned',
          'HKQuantityTypeIdentifierDietaryEnergyConsumed',
          'HKQuantityTypeIdentifierDietarySugar',
          'HKQuantityTypeIdentifierDietaryWater',
          'HKQuantityTypeIdentifierBodyMass',              // Weight
          'HKQuantityTypeIdentifierHeight',                // Height
          'HKQuantityTypeIdentifierVO2Max',                // Cardio Fitness
          'HKQuantityTypeIdentifierWalkingSpeed',          // Walking Speed
          'HKQuantityTypeIdentifierAppleExerciseTime',     // Exercise Minutes
          'HKQuantityTypeIdentifierDistanceCycling',       // Activity distances
          'HKQuantityTypeIdentifierDistanceWalkingRunning',
          'HKCategoryTypeIdentifierSleepAnalysis',
        ]
      );

      setIsAuthorized(true);
      return true;
    } catch (err) {
      setError(`Authorization failed: ${err}`);
      setIsLoading(false);
      return false;
    }
  };

  const fetchHealthData = async (): Promise<HealthData | null> => {
    if (Platform.OS !== 'ios') return null;

    try {
      setIsLoading(true);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      
      // Create a fresh data object to return
      const freshData: HealthData = {
        sleepAnalysis: null,
        heartRate: null,
        heartRateVariability: null,
        stepCount: null,
        activeEnergyBurned: null,
        dietaryEnergyConsumed: null,
        mindfulMinutes: null,
      };

      // Fetch Sleep Analysis (last night)
      const yesterdayStart = new Date(startOfDay);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      yesterdayStart.setHours(20, 0, 0, 0); // Start from 8 PM yesterday
      
      try {
        const sleepSamples = await HealthKit.queryCategorySamples(
          'HKCategoryTypeIdentifierSleepAnalysis',
          {
            filter: {
              startDate: yesterdayStart,
              endDate: endOfDay,
            },
          }
        );

        if (sleepSamples.length > 0) {
          let totalAsleepMinutes = 0;
          let totalInBedMinutes = 0;

          sleepSamples.forEach((sample: any) => {
            const duration = (new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime()) / 1000 / 60;
            // value 0 = inBed, value 1 = asleep, value 2 = awake
            if (sample.value === 0) {
              totalInBedMinutes += duration;
            } else if (sample.value === 1) {
              totalAsleepMinutes += duration;
            }
          });

          const sleepData = {
            asleepHours: totalAsleepMinutes / 60,
            inBedHours: totalInBedMinutes / 60,
            date: new Date(sleepSamples[0].startDate),
          };
          freshData.sleepAnalysis = sleepData;
          setHealthData((prev) => ({
            ...prev,
            sleepAnalysis: sleepData,
          }));
        }
      } catch (err) {
        console.log('Sleep data not available:', err);
      }

      // Fetch Heart Rate (most recent)
      try {
        const heartRateSamples = await HealthKit.queryQuantitySamples(
          'HKQuantityTypeIdentifierHeartRate',
          {
            filter: {
              startDate: startOfDay,
              endDate: endOfDay,
            },
            limit: 1,
            ascending: false,
          }
        );

        const restingHeartRateSamples = await HealthKit.queryQuantitySamples(
          'HKQuantityTypeIdentifierRestingHeartRate',
          {
            filter: {
              startDate: startOfDay,
              endDate: endOfDay,
            },
            limit: 1,
            ascending: false,
          }
        );

        if (heartRateSamples.length > 0 || restingHeartRateSamples.length > 0) {
          const heartRateData = {
            current: heartRateSamples[0]?.quantity || 0,
            resting: restingHeartRateSamples[0]?.quantity || 0,
          };
          freshData.heartRate = heartRateData;
          setHealthData((prev) => ({
            ...prev,
            heartRate: heartRateData,
          }));
        }
      } catch (err) {
        console.log('Heart rate data not available:', err);
      }

      // Fetch Heart Rate Variability (most recent)
      try {
        const hrvSamples = await HealthKit.queryQuantitySamples(
          'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
          {
            filter: {
              startDate: startOfDay,
              endDate: endOfDay,
            },
            limit: 1,
            ascending: false,
          }
        );

        if (hrvSamples.length > 0) {
          freshData.heartRateVariability = hrvSamples[0].quantity;
          setHealthData((prev) => ({
            ...prev,
            heartRateVariability: hrvSamples[0].quantity,
          }));
        }
      } catch (err) {
        console.log('HRV data not available:', err);
      }

      // Fetch Step Count (today's total)
      try {
        const stepSamples = await HealthKit.queryQuantitySamples(
          'HKQuantityTypeIdentifierStepCount',
          {
            filter: {
              startDate: startOfDay,
              endDate: endOfDay,
            },
          }
        );

        const totalSteps = stepSamples.reduce((sum: number, sample: any) => sum + sample.quantity, 0);
        freshData.stepCount = totalSteps;
        setHealthData((prev) => ({
          ...prev,
          stepCount: totalSteps,
        }));
      } catch (err) {
        console.log('Step count data not available:', err);
      }

      // Fetch Active Energy Burned (today's total)
      try {
        const energySamples = await HealthKit.queryQuantitySamples(
          'HKQuantityTypeIdentifierActiveEnergyBurned',
          {
            filter: {
              startDate: startOfDay,
              endDate: endOfDay,
            },
          }
        );

        const totalEnergy = energySamples.reduce((sum: number, sample: any) => sum + sample.quantity, 0);
        freshData.activeEnergyBurned = totalEnergy;
        setHealthData((prev) => ({
          ...prev,
          activeEnergyBurned: totalEnergy,
        }));
      } catch (err) {
        console.log('Active energy data not available:', err);
      }

      // Fetch Dietary Energy Consumed (today's total)
      try {
        const dietarySamples = await HealthKit.queryQuantitySamples(
          'HKQuantityTypeIdentifierDietaryEnergyConsumed',
          {
            filter: {
              startDate: startOfDay,
              endDate: endOfDay,
            },
          }
        );

        const totalDietary = dietarySamples.reduce((sum: number, sample: any) => sum + sample.quantity, 0);
        freshData.dietaryEnergyConsumed = totalDietary;
        setHealthData((prev) => ({
          ...prev,
          dietaryEnergyConsumed: totalDietary,
        }));
      } catch (err) {
        console.log('Dietary energy data not available:', err);
      }


      setIsLoading(false);
      return freshData;
    } catch (err) {
      setError(`Failed to fetch health data: ${err}`);
      setIsLoading(false);
      return null;
    }
  };

  /**
   * Convert HealthKit data to API format for syncing to Supabase
   */
  const convertToApiFormat = (data: HealthData, date: string): HealthDataSync => {
    const metrics: Record<string, any> = {};

    // Map HealthKit data to API metrics format
    if (data.sleepAnalysis?.asleepHours !== null && data.sleepAnalysis?.asleepHours !== undefined) {
      metrics.sleep_hours = data.sleepAnalysis.asleepHours;
    }

    if (data.stepCount !== null && data.stepCount !== undefined) {
      metrics.step_count = Math.round(data.stepCount);
    }

    if (data.heartRate?.resting !== null && data.heartRate?.resting !== undefined) {
      metrics.resting_heart_rate = Math.round(data.heartRate.resting);
    }

    if (data.heartRate?.current !== null && data.heartRate?.current !== undefined) {
      metrics.heart_rate_avg = Math.round(data.heartRate.current);
    }

    if (data.heartRateVariability !== null && data.heartRateVariability !== undefined) {
      metrics.hrv_sdnn = data.heartRateVariability;
    }

    if (data.activeEnergyBurned !== null && data.activeEnergyBurned !== undefined) {
      metrics.active_energy_burned = Math.round(data.activeEnergyBurned);
    }

    if (data.dietaryEnergyConsumed !== null && data.dietaryEnergyConsumed !== undefined) {
      metrics.dietary_energy_consumed = Math.round(data.dietaryEnergyConsumed);
    }

    if (data.mindfulMinutes !== null && data.mindfulMinutes !== undefined) {
      metrics.exercise_time_minutes = Math.round(data.mindfulMinutes);
    }

    return {
      date,
      metrics,
      source: 'healthkit',
    };
  };

  /**
   * Sync today's health data to Supabase
   * @param userId - User ID from Supabase auth
   * @param date - Optional date string (YYYY-MM-DD). Defaults to today
   */
  const syncToSupabase = async (userId: string, date?: string): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
      setSyncError('HealthKit is only available on iOS');
      return false;
    }

    if (!isAuthorized) {
      setSyncError('HealthKit not authorized');
      return false;
    }

    try {
      setIsSyncing(true);
      setSyncError(null);

      // Always refetch to get the latest data before syncing
      const freshData = await fetchHealthData();
      if (!freshData) {
        setSyncError('Failed to fetch health data');
        return false;
      }

      // Get today's date in YYYY-MM-DD format
      const today = date || new Date().toISOString().split('T')[0];

      // Convert to API format using fresh data
      const syncData = convertToApiFormat(freshData, today);

      // Sync to backend (which persists to Supabase)
      await api.healthData.sync(userId, syncData);

      // If we have sleep data, also sync it with the correct date (yesterday, since sleep is from last night)
      if (freshData.sleepAnalysis?.asleepHours && freshData.sleepAnalysis?.date) {
        const sleepDate = new Date(freshData.sleepAnalysis.date);
        const sleepDateStr = sleepDate.toISOString().split('T')[0];
        
        // Only sync sleep separately if it's a different date than today
        if (sleepDateStr !== today) {
          const sleepSyncData: HealthDataSync = {
            date: sleepDateStr,
            metrics: {
              sleep_hours: freshData.sleepAnalysis.asleepHours,
            },
            source: 'healthkit',
          };
          await api.healthData.sync(userId, sleepSyncData);
          console.log('✅ Also synced sleep data for', sleepDateStr);
        }
      }

      console.log('Successfully synced health data to Supabase');
      return true;
    } catch (err: any) {
      const errorMessage = err?.message || `Failed to sync health data: ${err}`;
      setSyncError(errorMessage);
      console.error('Error syncing health data:', err);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const initHealthKit = async () => {
      const authorized = await requestAuthorization();
      if (authorized) {
        await fetchHealthData();
      }
    };

    initHealthKit();
  }, []);

  return {
    healthData,
    isLoading,
    error,
    isAuthorized,
    isSyncing,
    syncError,
    refetch: fetchHealthData,
    requestAuthorization,
    syncToSupabase,
  };
};
