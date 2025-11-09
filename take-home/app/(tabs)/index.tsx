import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { HealthDashboard } from '@/components/health-dashboard';
import { ProfileHeader } from '@/components/profile-header';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ProfileHeader />
      <HealthDashboard />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
