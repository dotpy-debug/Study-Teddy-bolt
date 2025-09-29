'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Home, ArrowLeft, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Separate component to handle client-side only data
function DebugInfo() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
          Debug Information (Development)
        </summary>
        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Loading...</strong>
          </p>
        </div>
      </details>
    );
  }

  return (
    <details className="mt-6">
      <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
        Debug Information (Development)
      </summary>
      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Current URL:</strong> {window.location.href}
        </p>
        <p className="text-xs text-gray-600">
          <strong>Pathname:</strong> {window.location.pathname}
        </p>
        <p className="text-xs text-gray-600">
          <strong>Timestamp:</strong> {new Date().toISOString()}
        </p>
      </div>
    </details>
  );
}

export default function NotFound() {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search page or dashboard with search query
      window.location.href = `/dashboard?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  const suggestedLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/tasks', label: 'My Tasks', icon: FileQuestion },
    { href: '/ai', label: 'Teddy AI', icon: Search },
    { href: '/analytics', label: 'Analytics', icon: FileQuestion },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <FileQuestion className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-4xl font-bold text-gray-900 mb-2">
            404
          </CardTitle>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Page Not Found
          </CardTitle>
          <CardDescription className="text-gray-600">
            Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you entered the wrong URL.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Looking for something specific?
              </label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  type="text"
                  placeholder="Search for tasks, notes, or features..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={!searchQuery.trim()}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>

          {/* Navigation Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={goBack} variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button asChild className="w-full">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </div>

          {/* Suggested Links */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Popular destinations:
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {suggestedLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Button
                    key={link.href}
                    asChild
                    variant="ghost"
                    className="justify-start h-auto p-3"
                  >
                    <Link href={link.href}>
                      <Icon className="h-4 w-4 mr-2" />
                      {link.label}
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Help Section */}
          <div className="border-t pt-6">
            <div className="text-center text-sm text-gray-600">
              <p>Still need help?</p>
              <Button variant="link" className="p-0 text-sm" asChild>
                <Link href="mailto:support@studyteddy.com">
                  Contact Support
                </Link>
              </Button>
              {' or '}
              <Button variant="link" className="p-0 text-sm" asChild>
                <Link href="/help">
                  Visit Help Center
                </Link>
              </Button>
            </div>
          </div>

          {/* URL Information for Development */}
          {process.env.NODE_ENV === 'development' && (
            <DebugInfo />
          )}
        </CardContent>
      </Card>
    </div>
  );
}