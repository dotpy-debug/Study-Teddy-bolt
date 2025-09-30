// React component types
import { ReactNode, ComponentProps } from 'react';

export interface BaseComponentProps {
  children?: ReactNode;
  className?: string;
}

export interface PageProps {
  params: Record<string, string>;
  searchParams: Record<string, string | string[] | undefined>;
}

export type ComponentWithProps<T = Record<string, unknown>> = React.FC<T & BaseComponentProps>;