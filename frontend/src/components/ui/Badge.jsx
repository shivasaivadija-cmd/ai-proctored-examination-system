import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const badgeVariants = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  primary: 'badge-primary',
  neutral: 'badge-neutral',
};

export const Badge = ({ 
  variant = 'neutral', 
  children, 
  className,
  dot = false,
  pulse = false,
  ...props 
}) => {
  return (
    <motion.span
      className={cn('badge', badgeVariants[variant], className)}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {dot && (
        <span className={cn(
          'status-dot',
          variant === 'success' && 'status-dot-success',
          variant === 'warning' && 'status-dot-warning',
          variant === 'danger' && 'status-dot-danger',
          pulse && 'animate-pulse'
        )} />
      )}
      {children}
    </motion.span>
  );
};

Badge.displayName = 'Badge';
