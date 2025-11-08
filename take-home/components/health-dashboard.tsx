import React from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useHealthKit } from '@/hooks/use-healthkit';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface HealthCardProps {
  title: string;
  value: string | number | null;
  unit: string;
  icon: string;
  color: string;
  subtitle?: string;
}

const HealthCard: React.FC<HealthCardProps> = ({ title, value, unit, icon, color, subtitle }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ThemedView style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <IconSymbol name={icon as any} size={24} color={color} />
        </View>
        <ThemedText style={styles.cardTitle}>{title}</ThemedText>
      </View>
      <View style={styles.cardContent}>
        {value !== null ? (
          <>
            <ThemedText style={styles.cardValue}>
              {typeof value === 'number' ? Math.round(value) : value}
            </ThemedText>
            <ThemedText style={styles.cardUnit}>{unit}</ThemedText>
          </>
        ) : (
          <ThemedText style={styles.noData}>No data</ThemedText>
        )}
      </View>
      {subtitle && <ThemedText style={styles.cardSubtitle}>{subtitle}</ThemedText>}
    </ThemedView>
  );
};

export const HealthDashboard: React.FC = () => {
  const { healthData, isLoading, error, refetch, isAuthorized } = useHealthKit();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (isLoading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
        <ThemedText style={styles.loadingText}>Loading health data...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centerContainer}>
        <IconSymbol name="exclamationmark.triangle" size={48} color="#ff3b30" />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </ThemedView>
    );
  }

  if (!isAuthorized) {
    return (
      <ThemedView style={styles.centerContainer}>
        <IconSymbol name="heart.text.square" size={48} color={Colors[colorScheme ?? 'light'].tint} />
        <ThemedText style={styles.errorText}>
          Please authorize HealthKit access in Settings
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <ThemedText type="title">Health Dashboard</ThemedText>
        <TouchableOpacity onPress={refetch} style={styles.refreshButton}>
          <IconSymbol name="arrow.clockwise" size={24} color={Colors[colorScheme ?? 'light'].tint} />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {/* Sleep Analysis */}
        <HealthCard
          title="Sleep"
          value={healthData.sleepAnalysis?.asleepHours ?? null}
          unit="hours"
          icon="moon.stars.fill"
          color="#5e5ce6"
          subtitle={
            healthData.sleepAnalysis
              ? `In bed: ${Math.round(healthData.sleepAnalysis.inBedHours * 10) / 10}h`
              : undefined
          }
        />

        {/* Heart Rate */}
        <HealthCard
          title="Heart Rate"
          value={healthData.heartRate?.current ?? null}
          unit="BPM"
          icon="heart.fill"
          color="#ff3b30"
          subtitle={
            healthData.heartRate?.resting
              ? `Resting: ${Math.round(healthData.heartRate.resting)} BPM`
              : undefined
          }
        />

        {/* HRV */}
        <HealthCard
          title="HRV"
          value={healthData.heartRateVariability}
          unit="ms"
          icon="waveform.path.ecg"
          color="#ff9500"
        />

        {/* Steps */}
        <HealthCard
          title="Steps"
          value={healthData.stepCount}
          unit="steps"
          icon="figure.walk"
          color="#32d74b"
        />

        {/* Active Energy */}
        <HealthCard
          title="Active Energy"
          value={healthData.activeEnergyBurned}
          unit="kcal"
          icon="flame.fill"
          color="#ff2d55"
        />

        {/* Dietary Energy */}
        {healthData.dietaryEnergyConsumed !== null && healthData.dietaryEnergyConsumed > 0 && (
          <HealthCard
            title="Calories Consumed"
            value={healthData.dietaryEnergyConsumed}
            unit="kcal"
            icon="fork.knife"
            color="#ffcc00"
          />
        )}

        {/* Mindful Minutes */}
        <HealthCard
          title="Mindfulness"
          value={healthData.mindfulMinutes}
          unit="minutes"
          icon="brain.head.profile"
          color="#bf5af2"
        />
      </View>

      <ThemedView style={styles.footer}>
        <ThemedText style={styles.footerText}>
          Data synced from Apple Health
        </ThemedText>
        <ThemedText style={styles.footerSubtext}>
          Last updated: {new Date().toLocaleTimeString()}
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  refreshButton: {
    padding: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  card: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginRight: 4,
  },
  cardUnit: {
    fontSize: 16,
    opacity: 0.6,
  },
  cardSubtitle: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  noData: {
    fontSize: 14,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    opacity: 0.6,
  },
  footerSubtext: {
    fontSize: 12,
    opacity: 0.4,
    marginTop: 4,
  },
});

