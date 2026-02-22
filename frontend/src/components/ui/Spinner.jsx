import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  return (
    <Loader2
      className={`animate-spin text-current ${className}`}
      size={sizeClasses[size] || sizeClasses.md}
    />
  );
}
