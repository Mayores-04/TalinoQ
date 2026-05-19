import React, { createContext, useContext } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
  type TextProps,
  type ViewProps,
} from 'react-native';

type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'link';
type ButtonAction = 'primary' | 'secondary' | 'positive';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonContextValue = {
  action: ButtonAction;
  variant: ButtonVariant;
  size: ButtonSize;
  isDisabled?: boolean;
};

const ButtonContext = createContext<ButtonContextValue>({
  action: 'primary',
  variant: 'solid',
  size: 'md',
});

const buttonBase = 'flex-row items-center justify-center gap-2 rounded-md';
const buttonSize: Record<ButtonSize, string> = {
  sm: 'h-9 px-4',
  md: 'h-11 px-5',
  lg: 'h-12 px-6',
};
const buttonVariant: Record<ButtonVariant, Record<ButtonAction, string>> = {
  solid: {
    primary: 'bg-tq-primary active:bg-tq-primaryPressed shadow-md shadow-tq-primary/20',
    secondary: 'border border-tq-line bg-tq-surface active:bg-tq-page',
    positive: 'bg-tq-green active:bg-emerald-500',
  },
  outline: {
    primary: 'border border-tq-line bg-tq-surface active:bg-tq-primarySoft',
    secondary: 'border border-tq-line bg-tq-surface active:bg-tq-page',
    positive: 'border border-emerald-300 bg-tq-surface active:bg-emerald-50',
  },
  ghost: {
    primary: 'bg-transparent active:bg-tq-primarySoft',
    secondary: 'bg-transparent active:bg-slate-100',
    positive: 'bg-transparent active:bg-emerald-50',
  },
  link: {
    primary: 'h-auto bg-transparent px-0',
    secondary: 'h-auto bg-transparent px-0',
    positive: 'h-auto bg-transparent px-0',
  },
};

export type ButtonProps = PressableProps & {
  action?: ButtonAction;
  className?: string;
  isDisabled?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export const Button = React.forwardRef<View, ButtonProps>(
  (
    {
      action = 'primary',
      className = '',
      disabled,
      isDisabled,
      size = 'md',
      variant = 'solid',
      ...props
    },
    ref
  ) => {
    const resolvedDisabled = disabled || isDisabled;

    return (
      <ButtonContext.Provider value={{ action, variant, size, isDisabled: resolvedDisabled }}>
        <Pressable
          ref={ref}
          disabled={resolvedDisabled}
          className={`${buttonBase} ${buttonSize[size]} ${buttonVariant[variant][action]} ${
            resolvedDisabled ? 'opacity-50' : ''
          } ${className}`}
          {...props}
        />
      </ButtonContext.Provider>
    );
  }
);

Button.displayName = 'Button';

export type ButtonTextProps = TextProps & {
  className?: string;
};

export const ButtonText = React.forwardRef<Text, ButtonTextProps>(
  ({ className = '', ...props }, ref) => {
    const { action, variant, size } = useContext(ButtonContext);
    const sizeClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
    const solidText = action === 'secondary' ? 'text-tq-primary' : 'text-white';
    const tonedText = action === 'positive' ? 'text-emerald-700' : 'text-tq-primary';
    const textColor = variant === 'solid' ? solidText : tonedText;

    return (
      <Text
        ref={ref}
        className={`${sizeClass} font-semibold ${textColor} ${className}`}
        {...props}
      />
    );
  }
);

ButtonText.displayName = 'ButtonText';

export const ButtonSpinner = ActivityIndicator;

export type ButtonIconProps = ViewProps & {
  as?: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  className?: string;
  color?: string;
  size?: number;
};

export const ButtonIcon = ({ as: Icon, color, size = 18, ...props }: ButtonIconProps) => {
  const { action, variant } = useContext(ButtonContext);
  const iconColor =
    color ?? (variant === 'solid' && action !== 'secondary' ? '#ffffff' : '#064e3b');

  if (Icon) {
    return <Icon color={iconColor} size={size} strokeWidth={2.2} />;
  }

  return <View {...props} />;
};

export const ButtonGroup = React.forwardRef<View, ViewProps & { className?: string }>(
  ({ className = '', ...props }, ref) => {
    return <View ref={ref} className={`gap-3 ${className}`} {...props} />;
  }
);

ButtonGroup.displayName = 'ButtonGroup';
