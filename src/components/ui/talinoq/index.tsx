import React from 'react';
import { Text, TouchableOpacity, View, type TextProps, type ViewProps } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { APP_CARD_CLASS, APP_TEXT_MUTED_CLASS, APP_TEXT_TITLE_CLASS } from '@/styles/appTheme';

type ClassNameProp = {
  className?: string;
};

export function TqCard({ className = '', ...props }: ViewProps & ClassNameProp) {
  return <View className={`${APP_CARD_CLASS} ${className}`} {...props} />;
}

export function TqSection({
  children,
  className = '',
  title,
}: ViewProps & ClassNameProp & { title?: string }) {
  return (
    <View className={className}>
      {title ? (
        <Text className="mb-2 px-4 text-xs font-black tracking-[0.8px] text-tq-primary">
          {title}
        </Text>
      ) : null}
      <TqCard className="overflow-hidden rounded-2xl border-0 shadow-sm">{children}</TqCard>
    </View>
  );
}

export function TqTitle({ className = '', ...props }: TextProps & ClassNameProp) {
  return <Text className={`${APP_TEXT_TITLE_CLASS} ${className}`} {...props} />;
}

export function TqMutedText({ className = '', ...props }: TextProps & ClassNameProp) {
  return <Text className={`${APP_TEXT_MUTED_CLASS} ${className}`} {...props} />;
}

export function TqDivider({ className = '' }: ClassNameProp) {
  return <View className={`mx-4 h-px bg-slate-200 ${className}`} />;
}

export function TqIconButton({
  children,
  className = '',
  label,
  onPress,
}: ClassNameProp & {
  children: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      activeOpacity={0.84}
      className={`h-10 w-10 items-center justify-center rounded-full bg-tq-primarySoft ${className}`}
      onPress={onPress}>
      {children}
    </TouchableOpacity>
  );
}

export function TqListRow({
  icon,
  iconClassName = 'bg-slate-100',
  onPress,
  rightText,
  subtitle,
  subtitleClassName = 'text-tq-muted',
  title,
}: {
  icon: React.ReactNode;
  iconClassName?: string;
  onPress?: () => void;
  rightText?: string;
  subtitle?: string;
  subtitleClassName?: string;
  title: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      className="flex-row items-center px-4 py-4"
      onPress={onPress}>
      <View className={`mr-3 h-9 w-9 items-center justify-center rounded-full ${iconClassName}`}>
        {icon}
      </View>

      <View className="flex-1">
        <Text className="text-sm font-bold text-slate-800">{title}</Text>
        {subtitle ? (
          <Text className={`mt-0.5 text-xs font-medium ${subtitleClassName}`}>{subtitle}</Text>
        ) : null}
      </View>

      {rightText ? <Text className="mr-2 text-xs font-semibold text-tq-muted">{rightText}</Text> : null}
      <ChevronRight size={17} color="#94a3b8" />
    </TouchableOpacity>
  );
}
