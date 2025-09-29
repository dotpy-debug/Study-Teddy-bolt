'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Coffee, CloudRain, Waves, Music } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export type SoundType = 'none' | 'rain' | 'cafe' | 'brown-noise' | 'forest';

interface Sound {
  id: SoundType;
  name: string;
  icon: React.ReactNode;
  color: string;
  url?: string; // In a real app, these would be actual audio file URLs
}

const sounds: Sound[] = [
  {
    id: 'none',
    name: 'None',
    icon: <VolumeX className="h-5 w-5" />,
    color: 'bg-gray-500',
  },
  {
    id: 'rain',
    name: 'Rain',
    icon: <CloudRain className="h-5 w-5" />,
    color: 'bg-blue-500',
    url: '/sounds/rain.mp3',
  },
  {
    id: 'cafe',
    name: 'Café',
    icon: <Coffee className="h-5 w-5" />,
    color: 'bg-orange-500',
    url: '/sounds/cafe.mp3',
  },
  {
    id: 'brown-noise',
    name: 'Brown Noise',
    icon: <Waves className="h-5 w-5" />,
    color: 'bg-purple-500',
    url: '/sounds/brown-noise.mp3',
  },
  {
    id: 'forest',
    name: 'Forest',
    icon: <Music className="h-5 w-5" />,
    color: 'bg-green-500',
    url: '/sounds/forest.mp3',
  },
];

interface BackgroundSoundsProps {
  selectedSound: SoundType;
  volume: number;
  onSoundChange: (sound: SoundType) => void;
  onVolumeChange: (volume: number) => void;
  isPlaying?: boolean;
  className?: string;
}

export function BackgroundSounds({
  selectedSound,
  volume,
  onSoundChange,
  onVolumeChange,
  isPlaying = false,
  className,
}: BackgroundSoundsProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize audio element
  useEffect(() => {
    if (selectedSound !== 'none') {
      const sound = sounds.find(s => s.id === selectedSound);
      if (sound?.url) {
        audioRef.current = new Audio(sound.url);
        audioRef.current.loop = true;
        audioRef.current.volume = volume / 100;
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [selectedSound]);

  // Handle play/pause based on isPlaying prop
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        setIsLoading(true);
        audioRef.current.play()
          .then(() => setIsLoading(false))
          .catch(() => setIsLoading(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const handleSoundSelect = (soundId: SoundType) => {
    onSoundChange(soundId);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Background Sounds
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Sound Selection */}
        <div className="grid grid-cols-5 gap-2">
          {sounds.map((sound) => (
            <motion.div
              key={sound.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant={selectedSound === sound.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleSoundSelect(sound.id)}
                className={cn(
                  'h-16 flex flex-col gap-1 relative overflow-hidden',
                  selectedSound === sound.id && 'ring-2 ring-blue-500 ring-offset-2'
                )}
              >
                {/* Icon */}
                <motion.div
                  animate={
                    selectedSound === sound.id && isPlaying
                      ? { scale: [1, 1.1, 1] }
                      : {}
                  }
                  transition={{
                    repeat: selectedSound === sound.id && isPlaying ? Infinity : 0,
                    duration: 2,
                  }}
                >
                  {sound.icon}
                </motion.div>

                {/* Name */}
                <span className="text-xs font-medium">{sound.name}</span>

                {/* Active indicator */}
                <AnimatePresence>
                  {selectedSound === sound.id && isPlaying && (
                    <motion.div
                      className="absolute bottom-1 left-1/2 -translate-x-1/2"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                    >
                      <div className="h-1 w-6 bg-green-500 rounded-full animate-pulse" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Loading indicator */}
                <AnimatePresence>
                  {selectedSound === sound.id && isLoading && (
                    <motion.div
                      className="absolute inset-0 bg-black/20 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Volume Control */}
        <AnimatePresence>
          {selectedSound !== 'none' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Volume</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {volume}%
                </span>
              </div>

              <div className="flex items-center gap-3">
                <VolumeX className="h-4 w-4 text-gray-400" />
                <Slider
                  value={[volume]}
                  onValueChange={(value) => onVolumeChange(value[0])}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <Volume2 className="h-4 w-4 text-gray-400" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current Sound Info */}
        <AnimatePresence>
          {selectedSound !== 'none' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Currently playing:{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {sounds.find(s => s.id === selectedSound)?.name}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}