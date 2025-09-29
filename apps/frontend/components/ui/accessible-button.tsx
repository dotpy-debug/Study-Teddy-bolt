'use client';

import * as React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export interface AccessibleButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
  ariaDescribedBy?: string;
  tooltipText?: string;
  shortcut?: string;
}

export const AccessibleButton = React.forwardRef<
  HTMLButtonElement,
  AccessibleButtonProps
>(
  (
    {
      className,
      children,
      loading = false,
      loadingText = 'Loading...',
      ariaLabel,
      ariaPressed,
      ariaExpanded,
      ariaControls,
      ariaDescribedBy,
      tooltipText,
      shortcut,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const [isPressed, setIsPressed] = React.useState(false);
    const buttonId = React.useId();
    const tooltipId = React.useId();

    React.useEffect(() => {
      if (!shortcut) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        const keys = shortcut.toLowerCase().split('+');
        const ctrlKey = keys.includes('ctrl') || keys.includes('cmd');
        const shiftKey = keys.includes('shift');
        const altKey = keys.includes('alt');
        const key = keys[keys.length - 1];

        if (
          (ctrlKey && !e.ctrlKey && !e.metaKey) ||
          (shiftKey && !e.shiftKey) ||
          (altKey && !e.altKey)
        ) {
          return;
        }

        if (e.key.toLowerCase() === key) {
          e.preventDefault();
          document.getElementById(buttonId)?.click();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcut, buttonId]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsPressed(true);
      setTimeout(() => setIsPressed(false), 200);
      onClick?.(e);
    };

    return (
      <>
        <Button
          ref={ref}
          id={buttonId}
          className={cn(
            'relative transition-all duration-200',
            isPressed && 'scale-95',
            loading && 'cursor-wait',
            className
          )}
          disabled={disabled || loading}
          onClick={handleClick}
          aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
          aria-pressed={ariaPressed}
          aria-expanded={ariaExpanded}
          aria-controls={ariaControls}
          aria-describedby={cn(
            ariaDescribedBy,
            tooltipText && tooltipId
          )}
          aria-busy={loading}
          data-loading={loading}
          {...props}
        >
          {loading ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" />
              <span className="sr-only">{loadingText}</span>
              <span aria-hidden="true">{loadingText}</span>
            </>
          ) : (
            <>
              {children}
              {shortcut && (
                <kbd
                  className="ml-2 text-xs opacity-60"
                  aria-label={`Keyboard shortcut: ${shortcut}`}
                >
                  {shortcut}
                </kbd>
              )}
            </>
          )}
        </Button>

        {/* Screen reader tooltip */}
        {tooltipText && (
          <span
            id={tooltipId}
            className="sr-only"
            role="tooltip"
          >
            {tooltipText}
          </span>
        )}
      </>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

// Icon button with proper accessibility
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  AccessibleButtonProps & {
    icon: React.ReactNode;
    label: string;
  }
>(({ icon, label, className, ...props }, ref) => {
  return (
    <AccessibleButton
      ref={ref}
      className={cn('h-10 w-10 p-0', className)}
      ariaLabel={label}
      {...props}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="sr-only">{label}</span>
    </AccessibleButton>
  );
});

IconButton.displayName = 'IconButton';