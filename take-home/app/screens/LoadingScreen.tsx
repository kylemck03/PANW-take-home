import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Rive, { RiveRef } from 'rive-react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

const { width, height } = Dimensions.get('window');

export default function LoadingScreen() {
  const riveRef = useRef<RiveRef>(null);
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');

  useEffect(() => {
    // Auto-play the animation when component mounts
    if (riveRef.current) {
      riveRef.current.play();
    }
  }, []);

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        {/* Rive Animation */}
        <View style={styles.animationContainer}>
          <Rive
            ref={riveRef}
            resourceName="beanie_loading"
            autoplay={true}
            style={styles.animation}
          />
        </View>

        {/* Loading text */}
        <View style={styles.textContainer}>
          <ThemedText type="title" style={styles.loadingText}>
            Loading...
          </ThemedText>
          <View style={styles.dotsContainer}>
            <View style={[styles.dot, { backgroundColor: tintColor }]} />
            <View style={[styles.dot, { backgroundColor: tintColor }]} />
            <View style={[styles.dot, { backgroundColor: tintColor }]} />
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  animationContainer: {
    width: width * 0.6,
    height: width * 0.6,
    maxWidth: 300,
    maxHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.7,
  },
});

