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
    <View style={{ width: '100%' }}>
      {label ? (
        <Text
          style={{
            marginBottom: 8,
            fontSize: 13,
            fontWeight: '700',
            color: '#334155',
          }}>
          {label}
        </Text>
      ) : null}

      <View
        style={{
          height: 54,
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: isInvalid ? '#ef4444' : '#cbd5e1',
          borderRadius: 16,
          backgroundColor: '#f8fafc',
          paddingHorizontal: 14,
        }}>
        {Icon ? <Icon size={18} color="#64748b" /> : null}

        <TextInput
          {...props}
          placeholderTextColor="#94a3b8"
          style={[
            {
              flex: 1,
              height: 52,
              paddingHorizontal: Icon ? 10 : 0,
              paddingVertical: 0,
              fontSize: 14,
              color: '#0f172a',
              includeFontPadding: false,
              textAlignVertical: 'center',
            },
            style,
          ]}
        />
      </View>
    </View>
  );
}
