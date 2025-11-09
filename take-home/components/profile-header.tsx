import React from 'react';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from './themed-text';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';

export function ProfileHeader() {
  const { user, signOut } = useAuth();
  const tintColor = useThemeColor({}, 'tint');

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
    <View style={styles.container}>
      <View style={styles.userInfo}>
        <ThemedText type="subtitle">
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  userInfo: {
    flex: 1,
  },
  email: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
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

