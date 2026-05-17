import { Text, View } from 'react-native';

type AuthStatusProps = {
  message?: string;
  tone?: 'info' | 'error' | 'success';
};

const containerClasses = {
  error: 'border-red-200 bg-red-50',
  info: 'border-teal-100 bg-teal-50',
  success: 'border-emerald-200 bg-emerald-50',
};

const textClasses = {
  error: 'text-red-700',
  info: 'text-teal-800',
  success: 'text-emerald-700',
};

export function AuthStatus({ message, tone = 'info' }: AuthStatusProps) {
  if (!message) {
    return null;
  }

  return (
    <View className={`rounded-md border px-3 py-2 ${containerClasses[tone]}`}>
      <Text className={`text-xs leading-5 ${textClasses[tone]}`}>{message}</Text>
    </View>
  );
}
