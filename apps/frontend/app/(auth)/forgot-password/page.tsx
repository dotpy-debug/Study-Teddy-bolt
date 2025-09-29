import { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = {
  title: 'Forgot Password | Study Teddy',
  description: 'Reset your Study Teddy password',
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Study Teddy</h1>
          <p className="text-gray-600">Your AI-powered study companion</p>
        </div>

        <ForgotPasswordForm />
      </div>
    </div>
  );
}