'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './loading-skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  fill?: boolean;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  fill = false,
  quality = 85,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  // Generate blur placeholder if not provided
  const getBlurDataURL = () => {
    if (blurDataURL) return blurDataURL;
    
    // Generate a simple blur placeholder
    return `data:image/svg+xml;base64,${Buffer.from(
      `<svg width="${width || 400}" height="${height || 300}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="sans-serif" font-size="14">
          Loading...
        </text>
      </svg>`
    ).toString('base64')}`;
  };

  if (hasError) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground text-sm",
          className
        )}
        style={{ width, height }}
      >
        Failed to load image
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {isLoading && (
        <Skeleton 
          className="absolute inset-0 z-10" 
          style={{ width, height }}
        />
      )}
      
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={placeholder === 'blur' ? getBlurDataURL() : undefined}
        sizes={sizes || (fill ? '100vw' : undefined)}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          fill ? "object-cover" : ""
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

// Specialized image components
export function AvatarImage({ 
  src, 
  alt, 
  size = 40,
  className,
  ...props 
}: Omit<OptimizedImageProps, 'width' | 'height'> & { size?: number }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-full", className)}
      quality={85}
      {...props}
    />
  );
}

export function CardImage({
  src,
  alt,
  aspectRatio = "16/9",
  className,
  ...props
}: Omit<OptimizedImageProps, 'fill'> & { aspectRatio?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-lg", className)}
      style={{ aspectRatio }}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        quality={90} // Higher quality for card images
        placeholder="blur"
        {...props}
      />
    </div>
  );
}

// Performance-optimized thumbnail component
export function ThumbnailImage({
  src,
  alt,
  size = 80,
  className,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & { size?: number }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded object-cover", className)}
      quality={70} // Lower quality for thumbnails
      placeholder="blur"
      sizes={`${size}px`}
      {...props}
    />
  );
}

// Hero image component with priority loading
export function HeroImage({
  src,
  alt,
  className,
  ...props
}: OptimizedImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      priority={true} // Always prioritize hero images
      quality={95} // Highest quality for hero images
      className={cn("object-cover", className)}
      sizes="100vw"
      placeholder="blur"
      {...props}
    />
  );
}