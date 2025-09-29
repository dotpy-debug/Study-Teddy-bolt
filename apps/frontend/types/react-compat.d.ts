// React 19 compatibility helpers

import { ReactNode } from 'react';

// Button props compatibility
export interface ButtonProps {
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

// Loading component type
export type LoadingComponent = () => ReactNode;

// Teddy mood type
export type TeddyMood = 'happy' | 'excited' | 'focused' | 'encouraging' | 'sleepy' | 'confused';
