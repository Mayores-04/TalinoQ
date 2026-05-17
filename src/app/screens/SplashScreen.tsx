import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/auth/BrandLogo';

type SplashScreenProps = {
  onDone: () => void;
};

export function SplashScreen({ onDone }: SplashScreenProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const didFinish = useRef(false);

  const beginExit = () => {
    if (didFinish.current) {
      return;
    }

    didFinish.current = true;

    Animated.parallel([
      Animated.timing(opacity, {
        duration: 2000,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onDone();
      }
    });
  };

  useEffect(() => {
    const animation = Animated.timing(progress, {
      duration: 3000,
      toValue: 1,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        beginExit();
      }
    });

    return () => {
      animation.stop();
    };
  }, [onDone, progress]);

  const handleSkip = () => {
    beginExit();
  };

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['12%', '82%'],
  });

  return (
    <Animated.View style={[styles.fill, { opacity }]}>
      <Pressable style={styles.fill} onPress={handleSkip}>
        <LinearGradient
          colors={['#f8fafc', '#ecfdf5', '#f8fafc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}>
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <View style={styles.centerContent}>
              <BrandLogo />
              <Text style={styles.tagline}>Scan. Review. Improve.</Text>
            </View>

            <View style={styles.progressArea}>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width }]} />
              </View>
              <Text style={styles.loadingText}>Preparing your smart study space...</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    width: '100%',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 36,
    width: '100%',
  },
  centerContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  tagline: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 18,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  progressArea: {
    paddingBottom: 20,
    width: '100%',
  },
  progressTrack: {
    alignSelf: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    height: 6,
    overflow: 'hidden',
    width: '82%',
  },
  progressFill: {
    backgroundColor: '#22c55e',
    borderRadius: 999,
    height: '100%',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
});
