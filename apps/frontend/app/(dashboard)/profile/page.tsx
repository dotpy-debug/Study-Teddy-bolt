"use client";
import { useAuth } from '@/hooks/use-auth';

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="p-4">Loading profile...</div>;
  if (!user) return <div className="p-4">Not signed in</div>;
  return (
    <div className="p-4 space-y-2">
      <h1 className="text-xl font-semibold">Profile</h1>
      <div>Email: {user.email}</div>
      {user.name && <div>Name: {user.name}</div>}
    </div>
  );
}