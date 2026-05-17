import { Image, StyleSheet, Text, View } from 'react-native';

type BrandLogoProps = {
  compact?: boolean;
  showMascot?: boolean;
};

export function BrandLogo({ compact = false, showMascot = true }: BrandLogoProps) {
  return (
    <View className="items-center gap-3">
      {showMascot ? (
        <View
          className={
            compact
              ? 'h-16 w-16 items-center justify-center bg-white'
              : 'h-36 w-36 items-center justify-center bg-white'
          }>
          <Image
            source={require('../../../assets/LightModeAppLogo.png')}
            className={compact ? 'h-14 w-14' : 'h-28 w-28'}
            resizeMode="contain"
            style={compact ? styles.compactMascot : styles.mascot}
          />
        </View>
      ) : null}
      <Text
        className={
          compact
            ? 'text-center text-base font-extrabold text-teal-950'
            : 'text-center text-2xl font-extrabold text-teal-950'
        }>
        TalinoQ
      </Text>
    </View>
  );
}

export function HorizontalLogo() {
  return (
    <View style={styles.lockupFrame}>
      <Image
        source={require('../../../assets/LightModeHorizontalLockupLogo.png')}
        resizeMode="contain"
        style={styles.lockup}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  compactMascot: {
    height: 56,
    width: 56,
  },
  lockup: {
    height: 54,
    width: 82,
  },
  lockupFrame: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    height: 58,
    justifyContent: 'center',
    width: 72,
  },
  mascot: {
    height: 118,
    width: 118,
  },
});
