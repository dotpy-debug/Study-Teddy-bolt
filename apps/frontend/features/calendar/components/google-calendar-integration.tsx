"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Settings,
  Play,
  Square,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Download,
  Upload,
  FileDown,
  FileUp,
  MoreVertical,
  User,
  ExternalLink,
  Trash2,
  AlertCircle,
  Zap,
  Loader2,
  Plus
} from "lucide-react";
import { CalendarList } from "./calendar-list";
import { SyncSettingsComponent } from "./sync-settings";
import { ConflictResolver } from "./conflict-resolver";
import { EventMapper } from "./event-mapper";
import {
  useGoogleAccounts,
  useGoogleCalendars,
  useSyncSettings,
  useSyncOperations,
  useSyncConflicts,
  useConnectionTest
} from "../hooks/use-google-calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

interface GoogleCalendarIntegrationProps {
  className?: string;
}

export function GoogleCalendarIntegration({ className }: GoogleCalendarIntegrationProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [showDisconnectDialog, setShowDisconnectDialog] = useState<string | null>(null);
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);
  const [hasUnsavedMapping, setHasUnsavedMapping] = useState(false);

  // Hooks
  const accounts = useGoogleAccounts();
  const calendars = useGoogleCalendars(selectedAccountId);
  const syncSettings = useSyncSettings();
  const syncOperations = useSyncOperations();
  const conflicts = useSyncConflicts();
  const connectionTest = useConnectionTest();

  // Set first account as selected by default
  useEffect(() => {
    if (accounts.accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts.accounts[0].id);
    }
  }, [accounts.accounts, selectedAccountId]);

  const selectedAccount = accounts.accounts.find(acc => acc.id === selectedAccountId);

  const handleAccountConnect = useCallback(() => {
    accounts.connectAccount();
  }, [accounts]);

  const handleAccountDisconnect = useCallback((accountId: string) => {
    accounts.disconnectAccount(accountId);
    setShowDisconnectDialog(null);
    if (selectedAccountId === accountId) {
      setSelectedAccountId(undefined);
    }
  }, [accounts, selectedAccountId]);

  const handleSync = useCallback(() => {
    if (selectedAccountId) {
      syncOperations.startSync(selectedAccountId);
    } else {
      syncOperations.startSync();
    }
  }, [selectedAccountId, syncOperations]);

  const handleSyncSettings = useCallback((newSettings: any) => {
    syncSettings.updateSettings(newSettings);
    setHasUnsavedSettings(false);
  }, [syncSettings]);

  const handleCalendarSelection = useCallback((calendarIds: string[]) => {
    if (syncSettings.settings) {
      const updatedSettings = {
        ...syncSettings.settings,
        selectedCalendars: calendarIds
      };
      syncSettings.updateSettings(updatedSettings);
    }
  }, [syncSettings]);

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'partial':
        return 'text-yellow-600';
      case 'cancelled':
        return 'text-gray-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatLastSync = (date?: string) => {
    if (!date) return 'Never';
    const syncDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
    return format(syncDate, 'MMM d, yyyy');
  };

  if (accounts.isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar Integration
          </CardTitle>
          <div className="flex items-center gap-2">
            {accounts.accounts.length > 0 && (
              <Select value={selectedAccountId || ''} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span>{account.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              onClick={handleAccountConnect}
              disabled={accounts.isConnecting}
              size="sm"
            >
              {accounts.isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Connect Account
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {accounts.accounts.length === 0 ? (
          // No accounts connected state
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Connect Your Google Account</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Connect your Google account to sync your calendars with Study Teddy.
              Keep your study schedule organized across all platforms.
            </p>
            <Button onClick={handleAccountConnect} disabled={accounts.isConnecting} size="lg">
              {accounts.isConnecting ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Calendar className="h-5 w-5 mr-2" />
              )}
              Connect Google Calendar
            </Button>
          </div>
        ) : (
          // Connected accounts interface
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="calendars">Calendars</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="conflicts">
                <div className="flex items-center gap-1">
                  Conflicts
                  {conflicts.conflicts.length > 0 && (
                    <Badge variant="destructive" className="ml-1 text-xs">
                      {conflicts.conflicts.length}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger value="mapping">Mapping</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Account Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{selectedAccount?.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedAccount?.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{calendars.calendars.length} Calendars</p>
                        <p className="text-sm text-muted-foreground">
                          {syncSettings.settings?.selectedCalendars.length || 0} selected for sync
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                        {getSyncStatusIcon(syncOperations.status?.lastSyncStatus || 'success')}
                      </div>
                      <div>
                        <p className="font-medium">Last Sync</p>
                        <p className={cn("text-sm", getSyncStatusColor(syncOperations.status?.lastSyncStatus || 'success'))}>
                          {formatLastSync(syncOperations.status?.lastSyncAt)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sync Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sync Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {syncOperations.status?.isRunning && (
                    <Alert>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <AlertDescription>
                        Sync in progress... {syncOperations.status.eventsSynced} events synced
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Manual Sync</p>
                      <p className="text-sm text-muted-foreground">
                        Sync your calendars now
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleSync}
                        disabled={syncOperations.isStarting || syncOperations.status?.isRunning}
                        size="sm"
                      >
                        {syncOperations.isStarting || syncOperations.status?.isRunning ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        {syncOperations.status?.isRunning ? 'Syncing...' : 'Sync Now'}
                      </Button>
                      {syncOperations.status?.isRunning && (
                        <Button
                          onClick={syncOperations.stopSync}
                          disabled={syncOperations.isStopping}
                          variant="outline"
                          size="sm"
                        >
                          <Square className="h-4 w-4 mr-2" />
                          Stop
                        </Button>
                      )}
                    </div>
                  </div>

                  {syncOperations.status?.lastSyncAt && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Events synced:</span>
                        <span>{syncOperations.status.eventsSynced}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Events skipped:</span>
                        <span>{syncOperations.status.eventsSkipped}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Conflicts found:</span>
                        <span>{syncOperations.status.conflictsFound}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Account Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {accounts.accounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {account.picture ? (
                            <img
                              src={account.picture}
                              alt={account.name}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{account.name}</p>
                            <p className="text-sm text-muted-foreground">{account.email}</p>
                          </div>
                          {account.isActive && (
                            <Badge variant="outline" className="text-xs">Active</Badge>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => connectionTest.testConnection(account.id)}>
                              <Zap className="h-4 w-4 mr-2" />
                              Test Connection
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => accounts.refreshToken(account.id)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Refresh Token
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setShowDisconnectDialog(account.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Disconnect
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calendars" className="mt-6">
              <CalendarList
                calendars={calendars.calendars}
                selectedCalendars={syncSettings.settings?.selectedCalendars || []}
                onCalendarSelectionChange={handleCalendarSelection}
                onRefresh={calendars.refreshCalendars}
                isLoading={calendars.isLoading}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              {syncSettings.settings && (
                <SyncSettingsComponent
                  settings={syncSettings.settings}
                  onSettingsChange={(newSettings) => {
                    syncSettings.updateSettings(newSettings);
                    setHasUnsavedSettings(false);
                  }}
                  onSave={() => handleSyncSettings(syncSettings.settings)}
                  isSaving={syncSettings.isUpdating}
                  hasUnsavedChanges={hasUnsavedSettings}
                />
              )}
            </TabsContent>

            <TabsContent value="conflicts" className="mt-6">
              <ConflictResolver
                conflicts={conflicts.conflicts}
                onResolveConflict={conflicts.resolveConflict}
                onResolveAllConflicts={conflicts.resolveAllConflicts}
                isResolving={conflicts.isResolving}
                isResolvingAll={conflicts.isResolvingAll}
              />
            </TabsContent>

            <TabsContent value="mapping" className="mt-6">
              {syncSettings.settings && (
                <EventMapper
                  mapping={{
                    googleEventTypes: [],
                    studyEventType: 'study',
                    subjectMapping: {},
                    locationMapping: {},
                    defaultDuration: 60,
                    includeDescription: true,
                    includeLocation: true,
                    includeAttendees: false,
                  }}
                  onMappingChange={() => setHasUnsavedMapping(true)}
                  onSave={() => setHasUnsavedMapping(false)}
                  hasUnsavedChanges={hasUnsavedMapping}
                />
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Disconnect Account Dialog */}
        <Dialog open={!!showDisconnectDialog} onOpenChange={() => setShowDisconnectDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disconnect Google Account</DialogTitle>
              <DialogDescription>
                Are you sure you want to disconnect this Google account? This will stop syncing
                calendars and remove access to Google Calendar data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDisconnectDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => showDisconnectDialog && handleAccountDisconnect(showDisconnectDialog)}
                disabled={accounts.isDisconnecting}
              >
                {accounts.isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}