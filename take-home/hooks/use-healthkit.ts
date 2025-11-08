import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
// @ts-ignore - HealthKit types may not be available until after pod install
import HealthKit from '@kingstinct/react-native-healthkit';

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
        [], // write permissions
        [
          'HKQuantityTypeIdentifierStepCount',
          'HKQuantityTypeIdentifierHeartRate',
          'HKQuantityTypeIdentifierRestingHeartRate',
          'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
          'HKQuantityTypeIdentifierActiveEnergyBurned',
          'HKQuantityTypeIdentifierDietaryEnergyConsumed',
          'HKCategoryTypeIdentifierSleepAnalysis',
          'HKCategoryTypeIdentifierMindfulSession',
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

  const fetchHealthData = async () => {
    if (Platform.OS !== 'ios') return;

    try {
      setIsLoading(true);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

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

          setHealthData((prev) => ({
            ...prev,
            sleepAnalysis: {
              asleepHours: totalAsleepMinutes / 60,
              inBedHours: totalInBedMinutes / 60,
              date: new Date(sleepSamples[0].startDate),
            },
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
          setHealthData((prev) => ({
            ...prev,
            heartRate: {
              current: heartRateSamples[0]?.quantity || 0,
              resting: restingHeartRateSamples[0]?.quantity || 0,
            },
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
        setHealthData((prev) => ({
          ...prev,
          dietaryEnergyConsumed: totalDietary,
        }));
      } catch (err) {
        console.log('Dietary energy data not available:', err);
      }

      // Fetch Mindful Sessions (today's total minutes)
      try {
        const mindfulSamples = await HealthKit.queryCategorySamples(
          'HKCategoryTypeIdentifierMindfulSession',
          {
            filter: {
              startDate: startOfDay,
              endDate: endOfDay,
            },
          }
        );

        const totalMinutes = mindfulSamples.reduce((sum: number, sample: any) => {
          const duration = (new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime()) / 1000 / 60;
          return sum + duration;
        }, 0);

        setHealthData((prev) => ({
          ...prev,
          mindfulMinutes: totalMinutes,
        }));
      } catch (err) {
        console.log('Mindful session data not available:', err);
      }

      setIsLoading(false);
    } catch (err) {
      setError(`Failed to fetch health data: ${err}`);
      setIsLoading(false);
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
    refetch: fetchHealthData,
    requestAuthorization,
  };
};
