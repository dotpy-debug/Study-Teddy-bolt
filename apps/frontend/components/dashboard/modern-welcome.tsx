"use client";
import { useAuth } from '@/hooks/use-auth';

export function ModernWelcome() {
  const { user } = useAuth();
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">Welcome{user?.name ? `, ${user.name}` : ''}!</h2>
    </div>
  );
}