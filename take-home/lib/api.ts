/**
 * API Client for Health Insights Backend
 * 
 * Provides typed functions to interact with the FastAPI backend.
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// Types
export interface HealthMetrics {
  sleep_hours?: number;
  step_count?: number;
  exercise_time_minutes?: number;
  active_energy_burned?: number;
  distance_walking_running?: number;
  distance_cycling?: number;
  walking_speed?: number;
  resting_heart_rate?: number;
  heart_rate_avg?: number;
  hrv_sdnn?: number;
  vo2_max?: number;
  dietary_energy_consumed?: number;
  dietary_sugar?: number;
  dietary_water?: number;
  body_mass?: number;
  height?: number;
}

export interface HealthDataSync {
  date: string; // YYYY-MM-DD
  metrics: HealthMetrics;
  source?: string;
}

export interface Correlation {
  metric_a: string;
  metric_b: string;
  correlation: number;
  p_value: number;
  strength: string;
  direction: string;
}

export interface Anomaly {
  date: string;
  primary_metric: string;
  metric_value: number;
  baseline_value?: number;
  z_score: number;
  anomaly_score: number;
  severity: string;
}

export interface Trend {
  metric: string;
  trend_direction: string;
  percent_change: number;
  first_30d_avg: number;
  last_30d_avg: number;
}

export interface Pattern {
  pattern_type: string;
  pattern_name: string;
  predictor_metric: string;
  outcome_metric: string;
  percent_change: number;
  confidence_level: string;
  narrative: string;
}

export interface AnalysisResults {
  user_id: string;
  days_analyzed: number;
  analysis_date: string;
  correlations?: Correlation[];
  anomalies?: Anomaly[];
  trends?: Trend[];
  patterns?: Record<string, Pattern>;
  execution_time_ms?: number;
}

export interface Insight {
  id: string;
  user_id: string;
  insight_type: string;
  title: string;
  narrative: string;
  summary?: string;
  severity?: string;
  priority: number;
  related_date?: string;
  recommendations?: any[];
  is_read: boolean;
  created_at: string;
}

export interface InsightsFeed {
  user_id: string;
  total_count: number;
  unread_count: number;
  insights: Insight[];
}

// API Client
export const api = {
  /**
   * Health Data Endpoints
   */
  healthData: {
    /**
     * Sync daily health data
     */
    sync: async (userId: string, data: HealthDataSync) => {
      const response = await fetch(`${API_BASE_URL}/api/health-data/${userId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to sync health data');
      }

      return response.json();
    },

    /**
     * Batch sync multiple days
     */
    batchSync: async (userId: string, records: HealthDataSync[]) => {
      const response = await fetch(`${API_BASE_URL}/api/health-data/${userId}/batch-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(records),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to batch sync health data');
      }

      return response.json();
    },

    /**
     * Get historical health data
     */
    getHistory: async (
      userId: string,
      days: number = 90,
      startDate?: string,
      endDate?: string
    ) => {
      const params = new URLSearchParams({
        days: days.toString(),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      });

      const response = await fetch(
        `${API_BASE_URL}/api/health-data/${userId}?${params}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch health data');
      }

      return response.json();
    },
  },

  /**
   * Analytics Endpoints
   */
  analytics: {
    /**
     * Run full ML analysis
     */
    analyze: async (userId: string, days: number = 90): Promise<AnalysisResults> => {
      const response = await fetch(
        `${API_BASE_URL}/api/analytics/${userId}/analyze?days=${days}`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to run analysis');
      }

      return response.json();
    },

    /**
     * Get correlations only
     */
    getCorrelations: async (userId: string, days: number = 90) => {
      const response = await fetch(
        `${API_BASE_URL}/api/analytics/${userId}/correlations?days=${days}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch correlations');
      }

      return response.json();
    },

    /**
     * Get anomalies only
     */
    getAnomalies: async (userId: string, days: number = 90) => {
      const response = await fetch(
        `${API_BASE_URL}/api/analytics/${userId}/anomalies?days=${days}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch anomalies');
      }

      return response.json();
    },

    /**
     * Get trends only
     */
    getTrends: async (userId: string, days: number = 90) => {
      const response = await fetch(
        `${API_BASE_URL}/api/analytics/${userId}/trends?days=${days}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch trends');
      }

      return response.json();
    },

    /**
     * Get health summary
     */
    getSummary: async (userId: string, days: number = 7) => {
      const response = await fetch(
        `${API_BASE_URL}/api/analytics/${userId}/summary?days=${days}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch summary');
      }

      return response.json();
    },

    /**
     * Get user baselines
     */
    getBaselines: async (userId: string) => {
      const response = await fetch(
        `${API_BASE_URL}/api/analytics/${userId}/baselines`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch baselines');
      }

      return response.json();
    },
  },

  /**
   * Insights Endpoints
   */
  insights: {
    /**
     * Get daily insights
     */
    getDaily: async (userId: string, userName?: string) => {
      const params = new URLSearchParams({
        ...(userName && { user_name: userName }),
      });

      const response = await fetch(
        `${API_BASE_URL}/api/insights/${userId}/daily?${params}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch daily insights');
      }

      return response.json();
    },

    /**
     * Get weekly digest
     */
    getWeekly: async (userId: string, userName?: string) => {
      const params = new URLSearchParams({
        ...(userName && { user_name: userName }),
      });

      const response = await fetch(
        `${API_BASE_URL}/api/insights/${userId}/weekly?${params}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch weekly digest');
      }

      return response.json();
    },

    /**
     * Get insights feed
     */
    getFeed: async (
      userId: string,
      insightType?: string,
      unreadOnly: boolean = false,
      limit: number = 50
    ): Promise<InsightsFeed> => {
      const params = new URLSearchParams({
        unread_only: unreadOnly.toString(),
        limit: limit.toString(),
        ...(insightType && { insight_type: insightType }),
      });

      const response = await fetch(
        `${API_BASE_URL}/api/insights/${userId}/feed?${params}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch insights feed');
      }

      return response.json();
    },

    /**
     * Mark insight as read
     */
    markAsRead: async (userId: string, insightId: string) => {
      const response = await fetch(
        `${API_BASE_URL}/api/insights/${userId}/mark-read/${insightId}`,
        {
          method: 'PATCH',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to mark insight as read');
      }

      return response.json();
    },

    /**
     * Get correlated narrative explaining metric relationships
     */
    getCorrelatedNarrative: async (
      userId: string,
      healthData: any[],
      correlations: Correlation[],
      days: number = 14,
      userName?: string
    ) => {
      const response = await fetch(
        `${API_BASE_URL}/api/insights/${userId}/correlated-narrative`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            health_data: healthData,
            correlations: correlations,
            days: days,
            user_name: userName,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to generate correlated narrative');
      }

      return response.json();
    },

    /**
     * Get tomorrow prediction
     */
    getTomorrowPrediction: async (userId: string, userName?: string) => {
      const params = new URLSearchParams({
        ...(userName && { user_name: userName }),
      });

      const response = await fetch(
        `${API_BASE_URL}/api/insights/${userId}/tomorrow?${params}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to fetch tomorrow prediction');
      }

      return response.json();
    },
  },

  /**
   * Health Check
   */
  health: async () => {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.json();
  },
};

/**
 * Helper to convert HealthKit data to our format
 */
export const convertHealthKitData = (
  healthKitData: any,
  date: string
): HealthDataSync => {
  return {
    date,
    metrics: {
      sleep_hours: healthKitData.sleepAnalysis?.totalSleepTime,
      step_count: healthKitData.stepCount,
      resting_heart_rate: healthKitData.restingHeartRate,
      hrv_sdnn: healthKitData.heartRateVariability,
      active_energy_burned: healthKitData.activeEnergyBurned,
      // Add more mappings as needed
    },
    source: 'healthkit',
  };
};

/**
 * Error handler wrapper
 */
export const handleApiError = (error: any) => {
  console.error('API Error:', error);
  
  if (error.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

export default api;

