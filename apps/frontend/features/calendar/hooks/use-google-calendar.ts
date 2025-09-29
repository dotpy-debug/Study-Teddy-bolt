import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  googleCalendarApi,
  oauthUtils
} from '../api/google-calendar';
import {
  GoogleAccount,
  GoogleCalendar,
  GoogleCalendarEvent,
  SyncSettings,
  SyncStatus,
  SyncConflict,
  CalendarIntegrationState
} from '../types/google-calendar';

// Query keys
export const QUERY_KEYS = {
  accounts: ['google-calendar', 'accounts'],
  calendars: (accountId: string) => ['google-calendar', 'calendars', accountId],
  events: (accountId: string, calendarId: string) => [
    'google-calendar', 'events', accountId, calendarId
  ],
  syncSettings: ['google-calendar', 'sync-settings'],
  syncStatus: ['google-calendar', 'sync-status'],
  conflicts: ['google-calendar', 'conflicts'],
} as const;

export function useGoogleAccounts() {
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: QUERY_KEYS.accounts,
    queryFn: googleCalendarApi.getConnectedAccounts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const connectMutation = useMutation({
    mutationFn: oauthUtils.handleOAuthFlow,
    onSuccess: (account) => {
      if (account) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
        toast.success(`Connected Google account: ${account.email}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to connect account: ${error.message}`);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: googleCalendarApi.disconnectAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      toast.success('Account disconnected successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to disconnect account: ${error.message}`);
    },
  });

  const refreshTokenMutation = useMutation({
    mutationFn: googleCalendarApi.refreshAccountToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      toast.success('Account token refreshed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to refresh token: ${error.message}`);
    },
  });

  return {
    accounts: accountsQuery.data || [],
    isLoading: accountsQuery.isLoading,
    error: accountsQuery.error,
    connectAccount: connectMutation.mutate,
    isConnecting: connectMutation.isPending,
    disconnectAccount: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    refreshToken: refreshTokenMutation.mutate,
    isRefreshing: refreshTokenMutation.isPending,
  };
}

export function useGoogleCalendars(accountId?: string) {
  const queryClient = useQueryClient();

  const calendarsQuery = useQuery({
    queryKey: QUERY_KEYS.calendars(accountId!),
    queryFn: () => googleCalendarApi.getCalendars(accountId!),
    enabled: !!accountId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const refreshCalendars = useCallback(() => {
    if (accountId) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendars(accountId) });
    }
  }, [accountId, queryClient]);

  return {
    calendars: calendarsQuery.data || [],
    isLoading: calendarsQuery.isLoading,
    error: calendarsQuery.error,
    refreshCalendars,
  };
}

export function useGoogleCalendarEvents(accountId?: string, calendarId?: string) {
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  });

  const eventsQuery = useQuery({
    queryKey: [...QUERY_KEYS.events(accountId!, calendarId!), dateRange],
    queryFn: () => googleCalendarApi.getCalendarEvents(accountId!, calendarId!, {
      timeMin: dateRange.start,
      timeMax: dateRange.end,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 1000,
    }),
    enabled: !!(accountId && calendarId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    events: eventsQuery.data || [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error,
    dateRange,
    setDateRange,
  };
}

export function useSyncSettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: QUERY_KEYS.syncSettings,
    queryFn: googleCalendarApi.getSyncSettings,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const updateSettingsMutation = useMutation({
    mutationFn: googleCalendarApi.updateSyncSettings,
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(QUERY_KEYS.syncSettings, updatedSettings);
      toast.success('Sync settings updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    error: settingsQuery.error,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
  };
}

export function useSyncOperations() {
  const queryClient = useQueryClient();
  const [activeSyncId, setActiveSyncId] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: QUERY_KEYS.syncStatus,
    queryFn: googleCalendarApi.getSyncStatus,
    refetchInterval: (data) => {
      // Poll every 2 seconds if sync is running, otherwise every 30 seconds
      return data?.isRunning ? 2000 : 30000;
    },
  });

  const startSyncMutation = useMutation({
    mutationFn: googleCalendarApi.startSync,
    onSuccess: (result) => {
      setActiveSyncId(result.syncId);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
      toast.success('Sync started');
    },
    onError: (error: Error) => {
      toast.error(`Failed to start sync: ${error.message}`);
    },
  });

  const stopSyncMutation = useMutation({
    mutationFn: googleCalendarApi.stopSync,
    onSuccess: () => {
      setActiveSyncId(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.syncStatus });
      toast.success('Sync stopped');
    },
    onError: (error: Error) => {
      toast.error(`Failed to stop sync: ${error.message}`);
    },
  });

  const startSync = useCallback((accountId?: string) => {
    startSyncMutation.mutate(accountId);
  }, [startSyncMutation]);

  const stopSync = useCallback(() => {
    if (activeSyncId) {
      stopSyncMutation.mutate(activeSyncId);
    }
  }, [activeSyncId, stopSyncMutation]);

  return {
    status: statusQuery.data,
    isLoadingStatus: statusQuery.isLoading,
    startSync,
    stopSync,
    isStarting: startSyncMutation.isPending,
    isStopping: stopSyncMutation.isPending,
    activeSyncId,
  };
}

export function useSyncConflicts() {
  const queryClient = useQueryClient();

  const conflictsQuery = useQuery({
    queryKey: QUERY_KEYS.conflicts,
    queryFn: googleCalendarApi.getSyncConflicts,
    staleTime: 30 * 1000, // 30 seconds
  });

  const resolveConflictMutation = useMutation({
    mutationFn: ({ conflictId, resolution }: {
      conflictId: string;
      resolution: 'keep_google' | 'keep_local' | 'merge' | 'skip';
    }) => googleCalendarApi.resolveConflict(conflictId, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflicts });
      toast.success('Conflict resolved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to resolve conflict: ${error.message}`);
    },
  });

  const resolveAllConflictsMutation = useMutation({
    mutationFn: googleCalendarApi.resolveAllConflicts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflicts });
      toast.success('All conflicts resolved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to resolve all conflicts: ${error.message}`);
    },
  });

  return {
    conflicts: conflictsQuery.data || [],
    isLoading: conflictsQuery.isLoading,
    error: conflictsQuery.error,
    resolveConflict: resolveConflictMutation.mutate,
    resolveAllConflicts: resolveAllConflictsMutation.mutate,
    isResolving: resolveConflictMutation.isPending,
    isResolvingAll: resolveAllConflictsMutation.isPending,
  };
}

export function useCalendarIntegration(): CalendarIntegrationState {
  const accounts = useGoogleAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const calendars = useGoogleCalendars(selectedAccountId);
  const syncSettings = useSyncSettings();
  const syncOperations = useSyncOperations();
  const conflicts = useSyncConflicts();

  const selectedAccount = accounts.accounts.find(acc => acc.id === selectedAccountId);

  return {
    connectedAccounts: accounts.accounts,
    selectedAccount,
    calendars: calendars.calendars,
    syncSettings: syncSettings.settings || {
      direction: 'bidirectional',
      frequency: 'manual',
      autoSync: false,
      conflictResolution: 'ask',
      syncPastEvents: true,
      syncFutureEvents: true,
      pastEventsDays: 30,
      futureEventsDays: 90,
      selectedCalendars: [],
    },
    eventMapping: {
      googleEventTypes: [],
      studyEventType: 'study',
      subjectMapping: {},
      locationMapping: {},
      defaultDuration: 60,
      includeDescription: true,
      includeLocation: true,
      includeAttendees: false,
    },
    syncStatus: syncOperations.status || {
      isRunning: false,
      lastSyncStatus: 'success',
      eventsSynced: 0,
      eventsSkipped: 0,
      conflictsFound: 0,
    },
    conflicts: conflicts.conflicts,
    isLoading: accounts.isLoading || calendars.isLoading || syncSettings.isLoading,
    error: accounts.error?.message || calendars.error?.message || syncSettings.error?.message,
  };
}

export function useConnectionTest() {
  const testConnectionMutation = useMutation({
    mutationFn: googleCalendarApi.testConnection,
    onSuccess: (result) => {
      if (result.connected) {
        toast.success('Connection test successful');
      } else {
        toast.error(result.error || 'Connection test failed');
      }
    },
    onError: (error: Error) => {
      toast.error(`Connection test failed: ${error.message}`);
    },
  });

  return {
    testConnection: testConnectionMutation.mutate,
    isTestingConnection: testConnectionMutation.isPending,
    testResult: testConnectionMutation.data,
  };
}