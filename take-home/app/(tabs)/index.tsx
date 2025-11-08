import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { HealthDashboard } from '@/components/health-dashboard';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <HealthDashboard />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
