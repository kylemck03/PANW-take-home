import React from 'react';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';

export function ProfileHeader() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const tintColor = useThemeColor({}, 'tint');
  const cardBackground = useThemeColor({ light: '#f5f5f5', dark: '#1a1a1a' }, 'background');

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  return (
    <ThemedView 
      style={[
        styles.container, 
        { 
          backgroundColor: cardBackground,
          paddingTop: Math.max(insets.top, 12),
        }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.userInfo}>
          <ThemedText type="subtitle" style={styles.userName}>
            {user?.user_metadata?.full_name || user?.email || 'User'}
          </ThemedText>
          {user?.email && (
            <ThemedText style={styles.email}>{user.email}</ThemedText>
          )}
        </View>
        <TouchableOpacity
          style={[styles.signOutButton, { borderColor: tintColor }]}
          onPress={handleSignOut}
        >
          <ThemedText style={[styles.signOutText, { color: tintColor }]}>
            Sign Out
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
  },
  email: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

