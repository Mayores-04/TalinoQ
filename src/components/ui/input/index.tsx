import React, { createContext, useContext } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type ViewProps,
} from 'react-native';

type InputContextValue = {
  isDisabled?: boolean;
  size: 'sm' | 'md' | 'lg';
};

const InputContext = createContext<InputContextValue>({
  size: 'md',
});

export type InputProps = ViewProps & {
  className?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outline' | 'rounded' | 'underlined';
};

const inputSize = {
  sm: 'h-9',
  md: 'h-11',
  lg: 'h-12',
};

export const Input = React.forwardRef<View, InputProps>(
  ({ className = '', isDisabled, isInvalid, size = 'md', variant = 'outline', ...props }, ref) => {
    const shape =
      variant === 'rounded'
        ? 'rounded-full'
        : variant === 'underlined'
          ? 'rounded-none border-x-0 border-t-0'
          : 'rounded-md';
    const state = isInvalid ? 'border-red-400' : 'border-slate-300 focus:border-teal-700';

    return (
      <InputContext.Provider value={{ isDisabled, size }}>
        <View
          ref={ref}
          className={`flex-row items-center border bg-tq-page ${inputSize[size]} ${shape} ${state} ${
            isDisabled ? 'opacity-50' : ''
          } ${className}`}
          {...props}
        />
      </InputContext.Provider>
    );
  }
);

Input.displayName = 'Input';

export type InputFieldProps = TextInputProps & {
  className?: string;
};

export const InputField = React.forwardRef<TextInput, InputFieldProps>(
  ({ className = '', editable, placeholderTextColor = '#94a3b8', ...props }, ref) => {
    const { isDisabled, size } = useContext(InputContext);
    const textSize = size === 'lg' ? 'text-base' : 'text-sm';

    return (
      <TextInput
        ref={ref}
        editable={editable ?? !isDisabled}
        multiline={false}
        placeholderTextColor={placeholderTextColor}
        className={`flex-1 px-3 py-2 text-tq-ink ${textSize} ${className}`}
        {...props}
      />
    );
  }
);

InputField.displayName = 'InputField';

export type InputSlotProps = PressableProps & {
  className?: string;
};

export const InputSlot = React.forwardRef<View, InputSlotProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <Pressable
        ref={ref}
        className={`h-full items-center justify-center px-3 ${className}`}
        {...props}
      />
    );
  }
);

InputSlot.displayName = 'InputSlot';

export type InputIconProps = ViewProps & {
  as?: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  color?: string;
  size?: number;
};

export const InputIcon = ({ as: Icon, color = '#64748b', size = 18, ...props }: InputIconProps) => {
  if (Icon) {
    return <Icon color={color} size={size} strokeWidth={2} />;
  }

  return <View {...props} />;
};
