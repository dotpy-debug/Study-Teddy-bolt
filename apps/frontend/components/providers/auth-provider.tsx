"use client";

import React from 'react';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Auth Provider component that wraps the application
 * Better Auth client handles its own state management,
 * so this is primarily for future extensibility
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  return <>{children}</>;
};

export default AuthProvider;