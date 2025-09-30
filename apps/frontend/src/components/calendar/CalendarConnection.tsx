'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import calendarService, { CalendarAccount } from '../services/calendar.service';
import { toast } from 'sonner';

export function CalendarConnection() {
  const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCalendarAccounts();
  }, []);

  const fetchCalendarAccounts = async () => {
    try {
      setFetching(true);
      setError(null);
      const response = await calendarService.getCalendarAccounts();
      if (response.data) {
        setAccounts(response.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch calendar accounts:', err);
      setError('Failed to load calendar accounts');
    } finally {
      setFetching(false);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      setLoading(true);
      setError(null);

      const account = await calendarService.completeCalendarConnection();

      toast.success('Calendar connected successfully!');
      setAccounts(prev => [...prev, account]);
    } catch (err: any) {
      console.error('Failed to connect calendar:', err);
      const errorMessage = err.message || 'Failed to connect calendar';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectCalendar = async (accountId: string) => {
    try {
      setLoading(true);
      await calendarService.disconnectCalendar(accountId);

      toast.success('Calendar disconnected successfully');
      setAccounts(prev => prev.filter(acc => acc.id !== accountId));
    } catch (err: any) {
      console.error('Failed to disconnect calendar:', err);
      toast.error('Failed to disconnect calendar');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (fetching) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Integration
        </CardTitle>
        <CardDescription>
          Connect your Google Calendar to automatically schedule study sessions and avoid conflicts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {accounts.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No calendar connected yet. Connect your Google Calendar to get started.
            </p>
            <Button
              onClick={handleConnectCalendar}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Connect Google Calendar
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{account.accountName}</p>
                      {account.isPrimary && (
                        <Badge variant="secondary" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{account.accountEmail}</p>
                    <div className="flex items-center gap-4 mt-1">
                      {account.syncEnabled ? (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Sync enabled
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                          <AlertCircle className="h-3 w-3" />
                          Sync disabled
                        </div>
                      )}
                      {account.lastSyncAt && (
                        <p className="text-xs text-muted-foreground">
                          Last synced: {formatDate(account.lastSyncAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchCalendarAccounts()}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisconnectCalendar(account.id)}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span className="ml-1">Disconnect</span>
                  </Button>
                </div>
              </div>
            ))}

            {accounts.length < 1 && (
              <div className="text-center pt-4 border-t">
                <Button
                  onClick={handleConnectCalendar}
                  disabled={loading}
                  variant="outline"
                  className="gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4" />
                      Add Another Calendar
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {accounts.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Study Teddy will create a dedicated "Study Teddy" calendar in your Google account
              to organize all your study sessions. Your existing calendars will be used for
              conflict detection only.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}