import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Animated, Dimensions } from 'react-native';
import Rive, { RiveRef } from 'rive-react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { HealthDashboard } from '@/components/health-dashboard';
import { ProfileHeader } from '@/components/profile-header';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/auth-context';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();
  const riveRef = useRef<RiveRef>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [greeting, setGreeting] = useState('Good morning');
  
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
  }, []);

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

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
                <ThemedText style={styles.statValue}>7</ThemedText>
                <ThemedText style={styles.statLabel}>Day Streak 🔥</ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: tintColor, opacity: 0.2 }]} />
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>85%</ThemedText>
                <ThemedText style={styles.statLabel}>Goal Progress</ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: tintColor, opacity: 0.2 }]} />
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>12</ThemedText>
                <ThemedText style={styles.statLabel}>Achievements</ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Daily Tip from Beanie */}
        <View style={[styles.tipCard, { backgroundColor: tintColor }]}>
          <View style={styles.tipHeader}>
            <ThemedText style={styles.tipTitle}>💡 Tip from Beanie</ThemedText>
          </View>
          <ThemedText style={styles.tipText}>
            "Remember to stay hydrated! Aim for at least 8 glasses of water throughout the day."
          </ThemedText>
        </View>

        {/* Health Dashboard */}
        <View style={styles.dashboardSection}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Your Health Overview
            </ThemedText>
            <TouchableOpacity>
              <ThemedText style={[styles.seeAllText, { color: tintColor }]}>
                See All
              </ThemedText>
            </TouchableOpacity>
          </View>
          <HealthDashboard />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Quick Actions
          </ThemedText>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: cardBackground }]}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: tintColor + '20' }]}>
                <ThemedText style={styles.actionEmoji}>🏃</ThemedText>
              </View>
              <ThemedText style={styles.actionTitle}>Log Activity</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: cardBackground }]}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: tintColor + '20' }]}>
                <ThemedText style={styles.actionEmoji}>🎯</ThemedText>
              </View>
              <ThemedText style={styles.actionTitle}>Set Goal</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: cardBackground }]}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: tintColor + '20' }]}>
                <ThemedText style={styles.actionEmoji}>📊</ThemedText>
              </View>
              <ThemedText style={styles.actionTitle}>View Stats</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: cardBackground }]}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: tintColor + '20' }]}>
                <ThemedText style={styles.actionEmoji}>🏆</ThemedText>
              </View>
              <ThemedText style={styles.actionTitle}>Challenges</ThemedText>
            </TouchableOpacity>
          </View>
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
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    maxWidth: (width - 52) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionEmoji: {
    fontSize: 28,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 20,
  },
});

