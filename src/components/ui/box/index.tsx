import React from 'react';
import { View, type ViewProps } from 'react-native';

type BoxProps = ViewProps & {
  className?: string;
};

export const Box = React.forwardRef<View, BoxProps>(({ className = '', ...props }, ref) => {
  return <View ref={ref} className={className} {...props} />;
});

Box.displayName = 'Box';

export const Center = React.forwardRef<View, BoxProps>(({ className = '', ...props }, ref) => {
  return <View ref={ref} className={`items-center justify-center ${className}`} {...props} />;
});

Center.displayName = 'Center';

export const VStack = React.forwardRef<View, BoxProps>(({ className = '', ...props }, ref) => {
  return <View ref={ref} className={`flex-col ${className}`} {...props} />;
});

VStack.displayName = 'VStack';

export const HStack = React.forwardRef<View, BoxProps>(({ className = '', ...props }, ref) => {
  return <View ref={ref} className={`flex-row items-center ${className}`} {...props} />;
});

HStack.displayName = 'HStack';

export const Divider = React.forwardRef<View, BoxProps>(({ className = '', ...props }, ref) => {
  return <View ref={ref} className={`h-px bg-slate-200 ${className}`} {...props} />;
});

Divider.displayName = 'Divider';
