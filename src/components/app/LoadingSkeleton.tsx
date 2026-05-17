import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, ViewStyle } from 'react-native';

type LoadingSkeletonProps = {
  height: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function LoadingSkeleton({
  height,
  width = '100%',
  radius = 8,
  style,
}: LoadingSkeletonProps) {
  const opacity = useRef(new Animated.Value(0.42)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 760,
          toValue: 0.88,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 760,
          toValue: 0.42,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          borderRadius: radius,
          height,
          opacity,
          width,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#dbe6ee',
  },
});
