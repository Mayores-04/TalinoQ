import React from 'react';
import { View, type ViewProps } from 'react-native';

type CardProps = ViewProps & {
  className?: string;
};

export const Card = React.forwardRef<View, CardProps>(({ className = '', ...props }, ref) => {
  return (
    <View
      ref={ref}
      className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}
      {...props}
    />
  );
});

Card.displayName = 'Card';
