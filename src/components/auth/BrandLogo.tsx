import { Image, Text, View } from 'react-native';

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
    <View className="h-[58px] w-[72px] items-center justify-center bg-tq-surface">
      <Image
        source={require('../../../assets/LightModeHorizontalLockupLogo.png')}
        className="h-[54px] w-[82px]"
        resizeMode="contain"
      />
    </View>
  );
}
