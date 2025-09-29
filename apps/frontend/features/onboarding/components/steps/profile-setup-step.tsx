"use client";

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User,
  Camera,
  Globe,
  Bell,
  Mail,
  Moon,
  Sun,
  Monitor,
  Upload,
  X
} from 'lucide-react';
import { OnboardingData } from '../onboarding-wizard';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  timezone: z.string().min(1, 'Please select a timezone'),
  theme: z.enum(['light', 'dark', 'system']),
  notifications: z.boolean(),
  emailUpdates: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileSetupStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip?: () => void;
}

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AEST)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
];

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const defaultAvatars = [
  '🐻', '🦊', '🐯', '🐱', '🐶', '🐰', '🐸', '🐼',
  '🦉', '🐧', '🦄', '🐘', '🦁', '🐴', '🐺', '🐨'
];

export const ProfileSetupStep = ({ data, updateData, onNext }: ProfileSetupStepProps) => {
  const [avatar, setAvatar] = useState<string>(data.profile?.avatar || '🐻');
  const [uploadedAvatar, setUploadedAvatar] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: data.profile?.name || '',
      timezone: data.profile?.timezone || '',
      theme: data.profile?.preferences?.theme || 'system',
      notifications: data.profile?.preferences?.notifications ?? true,
      emailUpdates: data.profile?.preferences?.emailUpdates ?? false,
    },
    mode: 'onChange'
  });

  const watchedTheme = watch('theme');
  const watchedNotifications = watch('notifications');
  const watchedEmailUpdates = watch('emailUpdates');

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedAvatar(result);
        setAvatar(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeUploadedAvatar = () => {
    setUploadedAvatar('');
    setAvatar('🐻');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = (formData: ProfileFormData) => {
    updateData({
      profile: {
        name: formData.name,
        avatar: avatar,
        timezone: formData.timezone,
        preferences: {
          theme: formData.theme,
          notifications: formData.notifications,
          emailUpdates: formData.emailUpdates,
        },
      },
    });
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      <div className="text-center mb-8">
        <User className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Let's personalize your experience
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Tell us a bit about yourself to customize StudyTeddy for your needs
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar Selection */}
        <Card>
          <CardContent className="p-6">
            <Label className="text-base font-semibold">Choose your avatar</Label>
            <p className="text-sm text-gray-500 mb-4">Select an emoji or upload your own image</p>

            <div className="space-y-4">
              {/* Current Avatar Display */}
              <div className="flex items-center justify-center">
                <div className="relative">
                  {uploadedAvatar ? (
                    <div className="relative">
                      <img
                        src={uploadedAvatar}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover border-4 border-blue-200"
                      />
                      <button
                        type="button"
                        onClick={removeUploadedAvatar}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-3xl border-4 border-blue-200">
                      {avatar}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Button */}
              <div className="text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
              </div>

              {/* Default Emoji Avatars */}
              {!uploadedAvatar && (
                <div className="grid grid-cols-8 gap-2">
                  {defaultAvatars.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all hover:scale-110 ${
                        avatar === emoji
                          ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter your full name"
                className="mt-1"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="timezone">Timezone *</Label>
              <Select
                value={watch('timezone')}
                onValueChange={(value) => setValue('timezone', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4" />
                        <span>{tz.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.timezone && (
                <p className="text-sm text-red-500 mt-1">{errors.timezone.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Theme Preferences */}
        <Card>
          <CardContent className="p-6">
            <Label className="text-base font-semibold">Theme Preference</Label>
            <p className="text-sm text-gray-500 mb-4">Choose your preferred color scheme</p>

            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setValue('theme', option.value as any)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    watchedTheme === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <option.icon className="h-6 w-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                  <div className="text-sm font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label className="text-base font-semibold">Notification Preferences</Label>
              <p className="text-sm text-gray-500">Customize how you want to receive updates</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium">Push Notifications</div>
                    <div className="text-sm text-gray-500">
                      Get notified about study reminders and important updates
                    </div>
                  </div>
                </div>
                <Switch
                  checked={watchedNotifications}
                  onCheckedChange={(checked) => setValue('notifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium">Email Updates</div>
                    <div className="text-sm text-gray-500">
                      Receive weekly progress reports and study tips via email
                    </div>
                  </div>
                </div>
                <Switch
                  checked={watchedEmailUpdates}
                  onCheckedChange={(checked) => setValue('emailUpdates', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!isValid}
            className="px-8"
          >
            Continue to Academic Info
          </Button>
        </div>
      </form>
    </motion.div>
  );
};