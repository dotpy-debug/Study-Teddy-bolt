'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextBestAction, NextBestActionSettings } from '../components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  Code,
  Settings,
  Lightbulb,
  CheckCircle,
  Clock,
  Target,
  BookOpen,
  Coffee,
  Calendar
} from 'lucide-react';

// Create a query client for the example
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: false, // Disable retry for demo
    },
  },
});

/**
 * Complete example demonstrating the Next Best Action (NBA) component
 *
 * This example shows:
 * 1. Basic usage of the NBA component
 * 2. Integration with settings
 * 3. Custom styling and layout options
 * 4. Feature overview and capabilities
 */
export const NextBestActionExample: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Brain className="w-8 h-8 text-primary" />
            Next Best Action System
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            AI-powered recommendations that intelligently suggest your next study action based on
            performance data, goals, deadlines, and behavioral patterns.
          </p>
        </div>

        <Tabs defaultValue="demo" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="demo">Live Demo</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="integration">Integration</TabsTrigger>
            <TabsTrigger value="customization">Customization</TabsTrigger>
          </TabsList>

          <TabsContent value="demo" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main NBA Component */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        Live Recommendations
                      </CardTitle>
                      <NextBestActionSettings />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <NextBestAction
                      maxItems={4}
                      showRefreshButton={true}
                      showSettings={false}
                      className="space-y-4"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Status Panel */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">System Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">AI Model</span>
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Data Quality</span>
                      <Badge variant="outline">85%</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cache Status</span>
                      <Badge variant="outline" className="text-blue-600">Fresh</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Updated</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Actions Completed Today</span>
                        <span className="font-medium">7</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Success Rate</span>
                        <span className="font-medium">92%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Average Impact</span>
                        <span className="font-medium">8.4/10</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Core Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-500" />
                    AI-Powered Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Machine learning recommendations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Pattern recognition
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Predictive analytics
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Contextual awareness
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    Smart Prioritization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Deadline-aware scheduling
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Impact scoring
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Performance-based ranking
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Goal alignment
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Optimal Timing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Energy level optimization
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Focus peak detection
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Break timing
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Session length suggestions
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-green-500" />
                    Study Categories
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Badge variant="outline" className="mr-2">Study Sessions</Badge>
                    <Badge variant="outline" className="mr-2">Review & Practice</Badge>
                    <Badge variant="outline" className="mr-2">Break Management</Badge>
                    <Badge variant="outline" className="mr-2">Goal Tracking</Badge>
                    <Badge variant="outline" className="mr-2">Scheduling</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-500" />
                    Customization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Personalized preferences
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Notification controls
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Learning style adaptation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Feedback integration
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    Smart Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Performance predictions
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Success probability
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Learning pattern analysis
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Adaptive recommendations
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="integration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Integration Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Usage</h3>
                  <div className="bg-muted rounded-lg p-4">
                    <pre className="text-sm">
{`import { NextBestAction } from '@/features/analytics';

function MyDashboard() {
  return (
    <div>
      <NextBestAction
        maxItems={5}
        showRefreshButton={true}
        showSettings={true}
      />
    </div>
  );
}`}
                    </pre>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">With Custom Context</h3>
                  <div className="bg-muted rounded-lg p-4">
                    <pre className="text-sm">
{`import {
  NextBestAction,
  useRecommendationContext,
  useRecommendations
} from '@/features/analytics';

function AdvancedNBA() {
  const context = useRecommendationContext();
  const { recommendations, refresh } = useRecommendations(context);

  return (
    <NextBestAction
      maxItems={3}
      className="custom-styling"
    />
  );
}`}
                    </pre>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Settings Integration</h3>
                  <div className="bg-muted rounded-lg p-4">
                    <pre className="text-sm">
{`import {
  NextBestAction,
  NextBestActionSettings
} from '@/features/analytics';

function Dashboard() {
  return (
    <div className="flex items-center justify-between">
      <h2>Recommendations</h2>
      <NextBestActionSettings />
    </div>
    <NextBestAction showSettings={false} />
  );
}`}
                    </pre>
                  </div>
                </div>

                <Alert>
                  <Lightbulb className="w-4 h-4" />
                  <AlertDescription>
                    The NBA system automatically integrates with your existing analytics data,
                    AI services, and user preferences. No additional backend setup required
                    for basic functionality.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customization" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Layout Variations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Compact View</h4>
                    <NextBestAction
                      maxItems={2}
                      showRefreshButton={false}
                      showSettings={false}
                      className="scale-90 origin-top-left"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Custom Styling</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                    <NextBestAction
                      maxItems={1}
                      showRefreshButton={false}
                      showSettings={false}
                      className="[&_.group]:bg-white [&_.group]:shadow-md"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Customization Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Display Options</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Maximum items shown</li>
                      <li>• Show/hide refresh button</li>
                      <li>• Show/hide settings</li>
                      <li>• Custom CSS classes</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Behavior Settings</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Auto-refresh intervals</li>
                      <li>• Priority filtering</li>
                      <li>• Category selection</li>
                      <li>• Notification preferences</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Learning Adaptation</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Session length preferences</li>
                      <li>• Break frequency</li>
                      <li>• Energy-based scheduling</li>
                      <li>• Performance adaptation</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center pt-8">
          <p className="text-muted-foreground">
            The Next Best Action system continuously learns from your interactions to provide
            increasingly personalized and effective recommendations.
          </p>
        </div>
      </div>
    </QueryClientProvider>
  );
};

export default NextBestActionExample;