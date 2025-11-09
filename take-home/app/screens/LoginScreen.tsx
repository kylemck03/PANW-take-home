import React, { useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Animated } from 'react-native';
import Rive, { RiveRef } from 'rive-react-native';
import { supabase } from '@/lib/supabase';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const { width } = Dimensions.get('window');

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const riveRef = useRef<RiveRef>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  React.useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      
      // Check if device supports Google Play (iOS always returns true)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Get the user's ID token
      const userInfo = await GoogleSignin.signIn();
      
      if (userInfo.idToken) {
        // Sign in to Supabase with the ID token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.idToken,
        });

        if (error) {
          Alert.alert('Error', error.message);
        } else {
          console.log('Successfully signed in:', data);
        }
      } else {
        console.error('No ID token in response:', userInfo);
        throw new Error('No ID token received from Google.');
      }
    } catch (error: any) {
      if (error.code === 'SIGN_IN_CANCELLED') {
        console.log('User cancelled the login flow');
      } else {
        console.error('Sign in error:', error);
        Alert.alert('Error', error.message || 'An error occurred during sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Character Section */}
      <Animated.View 
        style={[
          styles.characterSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.characterContainer}>
          <Rive
            ref={riveRef}
            resourceName="beanie_loading"
            autoplay={true}
            style={styles.character}
          />
        </View>
        
        <View style={styles.welcomeContainer}>
          <ThemedText type="title" style={styles.welcomeTitle}>
            Hey there! 👋
          </ThemedText>
          <ThemedText style={styles.welcomeSubtitle}>
            I'm Beanie, your health companion
          </ThemedText>
        </View>
      </Animated.View>

      {/* Content Section */}
      <Animated.View 
        style={[
          styles.contentSection,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <View style={styles.infoContainer}>
          <ThemedText style={styles.infoTitle}>
            Let's get started!
          </ThemedText>
          <ThemedText style={styles.infoText}>
            Track your health metrics, set goals, and stay motivated on your wellness journey.
          </ThemedText>
        </View>

        {/* Sign In Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              { 
                backgroundColor: tintColor,
                opacity: loading ? 0.7 : 1,
              }
            ]}
            onPress={signInWithGoogle}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <GoogleIcon />
                <ThemedText style={styles.buttonText}>
                  Continue with Google
                </ThemedText>
              </>
            )}
          </TouchableOpacity>

          {/* Alternative options placeholder */}
          <View style={styles.alternativeContainer}>
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: textColor, opacity: 0.2 }]} />
              <ThemedText style={styles.dividerText}>or</ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: textColor, opacity: 0.2 }]} />
            </View>
            
            <TouchableOpacity style={styles.guestButton}>
              <ThemedText style={[styles.guestButtonText, { color: tintColor }]}>
                Continue as Guest
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            By continuing, you agree to our{' '}
            <ThemedText style={[styles.footerLink, { color: tintColor }]}>
              Terms of Service
            </ThemedText>
            {' '}and{' '}
            <ThemedText style={[styles.footerLink, { color: tintColor }]}>
              Privacy Policy
            </ThemedText>
          </ThemedText>
        </View>
      </Animated.View>
    </ThemedView>
  );
}

// Google icon component
function GoogleIcon() {
  return (
    <View style={styles.googleIcon}>
      <View style={styles.googleIconInner}>
        <ThemedText style={styles.googleIconText}>G</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  characterSection: {
    flex: 0.45,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  characterContainer: {
    width: width * 0.5,
    height: width * 0.5,
    maxWidth: 250,
    maxHeight: 250,
    marginBottom: 24,
  },
  character: {
    width: '100%',
    height: '100%',
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 18,
    opacity: 0.7,
    textAlign: 'center',
  },
  contentSection: {
    flex: 0.55,
    paddingHorizontal: 32,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  infoContainer: {
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.7,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  googleIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIconInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIconText: {
    color: '#4285F4',
    fontWeight: 'bold',
    fontSize: 16,
  },
  alternativeContainer: {
    gap: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    opacity: 0.5,
  },
  guestButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.5,
    lineHeight: 18,
  },
  footerLink: {
    fontWeight: '600',
  },
});

