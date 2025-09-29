'use client';

import React, { useState } from 'react';
import { Bell, Check, X, Settings, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/contexts/notification-context';
import { Notification } from '@/types/notification';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

function NotificationItem({ notification }: { notification: Notification }) {
  const { markAsRead, deleteNotification } = useNotifications();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      case 'warning':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-blue-500 rounded-full" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  return (
    <div
      className={`group p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
        !notification.read ? 'bg-blue-50/50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getTypeIcon(notification.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={`text-sm font-medium text-gray-900 ${!notification.read ? 'font-semibold' : ''}`}>
                {notification.title}
              </h4>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {notification.message}
              </p>

              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={`text-xs ${getPriorityColor(notification.priority)}`}
                >
                  {notification.priority}
                </Badge>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                </span>
              </div>

              {notification.actionUrl && notification.actionLabel && (
                <Link
                  href={notification.actionUrl}
                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 mt-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {notification.actionLabel} →
                </Link>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!notification.read && (
                  <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                    <Check className="h-4 w-4 mr-2" />
                    Mark as read
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => deleteNotification(notification.id)}
                  className="text-red-600"
                >
                  <X className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    clearAll,
    loading,
    refreshNotifications
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleClearAll = () => {
    clearAll();
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-500"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <DropdownMenuLabel className="p-0 font-semibold">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-xs text-gray-500 font-normal">
                ({unreadCount} unread)
              </span>
            )}
          </DropdownMenuLabel>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshNotifications}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {notifications.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {unreadCount > 0 && (
                    <DropdownMenuItem onClick={handleMarkAllRead}>
                      <Check className="h-4 w-4 mr-2" />
                      Mark all as read
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleClearAll} className="text-red-600">
                    <X className="h-4 w-4 mr-2" />
                    Clear all
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings/notifications">
                      <Settings className="h-4 w-4 mr-2" />
                      Notification settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-4 text-center text-gray-500">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs text-gray-400 mt-1">
              You'll see updates about your study progress here
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </ScrollArea>
        )}

        {notifications.length > 0 && (
          <div className="p-3 border-t border-gray-100">
            <Link
              href="/notifications"
              className="block text-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}