import React from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

type AuthTextFieldProps = TextInputProps & {
  label?: string;
  icon?: LucideIcon;
  isInvalid?: boolean;
};

export function AuthTextField({
  label,
  icon: Icon,
  isInvalid,
  style,
  ...props
}: AuthTextFieldProps) {
  return (
    <View className="w-full">
      {label ? (
        <Text className="mb-2 text-[13px] font-bold text-tq-body">{label}</Text>
      ) : null}

      <View
        className={`h-[54px] w-full flex-row items-center rounded-2xl border bg-tq-page px-[14px] ${
          isInvalid ? 'border-red-500' : 'border-slate-300'
        }`}>
        {Icon ? <Icon size={18} color="#64748b" /> : null}

        <TextInput
          {...props}
          placeholderTextColor="#94a3b8"
          className={`h-[52px] flex-1 py-0 text-sm text-tq-ink ${Icon ? 'px-2.5' : 'px-0'}`}
          style={[{ includeFontPadding: false, textAlignVertical: 'center' }, style]}
        />
      </View>
    </View>
  );
}
