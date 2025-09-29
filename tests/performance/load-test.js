import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTimeP95 = new Trend('response_time_p95');
const httpReqFailed = new Rate('http_req_failed');
const loginSuccessRate = new Rate('login_success');
const taskCreationRate = new Rate('task_creation_success');

// Test configuration
export const options = {
  scenarios: {
    // Baseline load test
    baseline_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      tags: { test_type: 'baseline' },
    },

    // Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '30s', target: 100 }, // Spike
        { duration: '1m', target: 20 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'spike' },
    },

    // Stress test
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },

    // Soak test (long-duration)
    soak_test: {
      executor: 'constant-vus',
      vus: 20,
      duration: '1h',
      tags: { test_type: 'soak' },
    },
  },

  thresholds: {
    // Overall performance thresholds
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.1'], // Error rate under 10%

    // API-specific thresholds
    'http_req_duration{api:auth}': ['p(95)<1000'],
    'http_req_duration{api:tasks}': ['p(95)<1500'],
    'http_req_duration{api:calendar}': ['p(95)<2000'],
    'http_req_duration{api:focus}': ['p(95)<1000'],

    // Custom metric thresholds
    errors: ['rate<0.05'],
    login_success: ['rate>0.95'],
    task_creation_success: ['rate>0.9'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const users = [
  { email: 'test1@studyteddy.com', password: 'testpass123' },
  { email: 'test2@studyteddy.com', password: 'testpass123' },
  { email: 'test3@studyteddy.com', password: 'testpass123' },
];

const tasks = [
  { title: 'Study Mathematics', description: 'Algebra homework', priority: 'high' },
  { title: 'Read Physics Chapter', description: 'Quantum mechanics', priority: 'medium' },
  { title: 'Practice Programming', description: 'JavaScript exercises', priority: 'low' },
];

export function setup() {
  console.log('Starting load test setup...');

  // Warm up the application
  const warmupResponse = http.get(`${BASE_URL}/api/health`);
  check(warmupResponse, {
    'warmup successful': (r) => r.status === 200,
  });

  return { baseUrl: BASE_URL };
}

export default function (data) {
  const user = users[Math.floor(Math.random() * users.length)];

  group('Authentication Flow', () => {
    authenticationTest(user);
  });

  group('Task Management', () => {
    taskManagementTest();
  });

  group('Calendar Operations', () => {
    calendarTest();
  });

  group('Focus Session', () => {
    focusSessionTest();
  });

  group('Analytics Dashboard', () => {
    analyticsTest();
  });

  sleep(1);
}

function authenticationTest(user) {
  group('Login', () => {
    const loginPayload = {
      email: user.email,
      password: user.password,
    };

    const response = http.post(`${BASE_URL}/api/auth/signin`, JSON.stringify(loginPayload), {
      headers: { 'Content-Type': 'application/json' },
      tags: { api: 'auth' },
    });

    const success = check(response, {
      'login status is 200': (r) => r.status === 200,
      'login response time < 1000ms': (r) => r.timings.duration < 1000,
      'login returns token': (r) => r.json('token') !== undefined,
    });

    loginSuccessRate.add(success);
    errorRate.add(!success);

    if (success) {
      // Store token for subsequent requests
      const token = response.json('token');
      __ENV.AUTH_TOKEN = token;
    }
  });
}

function taskManagementTest() {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`,
  };

  group('List Tasks', () => {
    const response = http.get(`${BASE_URL}/api/tasks`, {
      headers,
      tags: { api: 'tasks' },
    });

    check(response, {
      'tasks list status is 200': (r) => r.status === 200,
      'tasks response time < 1500ms': (r) => r.timings.duration < 1500,
      'tasks response is array': (r) => Array.isArray(r.json()),
    });
  });

  group('Create Task', () => {
    const task = tasks[Math.floor(Math.random() * tasks.length)];
    const payload = {
      ...task,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const response = http.post(`${BASE_URL}/api/tasks`, JSON.stringify(payload), {
      headers,
      tags: { api: 'tasks' },
    });

    const success = check(response, {
      'task creation status is 201': (r) => r.status === 201,
      'task creation response time < 2000ms': (r) => r.timings.duration < 2000,
      'task has id': (r) => r.json('id') !== undefined,
    });

    taskCreationRate.add(success);
  });

  group('Update Task', () => {
    // First get a task to update
    const listResponse = http.get(`${BASE_URL}/api/tasks`, { headers });
    if (listResponse.status === 200) {
      const tasks = listResponse.json();
      if (tasks.length > 0) {
        const taskId = tasks[0].id;
        const updatePayload = {
          title: 'Updated Task Title',
          completed: true,
        };

        const response = http.put(`${BASE_URL}/api/tasks/${taskId}`, JSON.stringify(updatePayload), {
          headers,
          tags: { api: 'tasks' },
        });

        check(response, {
          'task update status is 200': (r) => r.status === 200,
          'task update response time < 1500ms': (r) => r.timings.duration < 1500,
        });
      }
    }
  });
}

function calendarTest() {
  const headers = {
    'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`,
  };

  group('Calendar Events', () => {
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = http.get(`${BASE_URL}/api/calendar/events?start=${startDate}&end=${endDate}`, {
      headers,
      tags: { api: 'calendar' },
    });

    check(response, {
      'calendar events status is 200': (r) => r.status === 200,
      'calendar response time < 2000ms': (r) => r.timings.duration < 2000,
    });
  });

  group('Create Event', () => {
    const eventPayload = {
      title: 'Study Session',
      description: 'Math homework review',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      type: 'study',
    };

    const response = http.post(`${BASE_URL}/api/calendar/events`, JSON.stringify(eventPayload), {
      headers: { ...headers, 'Content-Type': 'application/json' },
      tags: { api: 'calendar' },
    });

    check(response, {
      'event creation status is 201': (r) => r.status === 201,
      'event creation response time < 2000ms': (r) => r.timings.duration < 2000,
    });
  });
}

function focusSessionTest() {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`,
  };

  group('Start Focus Session', () => {
    const sessionPayload = {
      duration: 25, // 25 minutes
      type: 'pomodoro',
      taskId: null,
    };

    const response = http.post(`${BASE_URL}/api/focus/start`, JSON.stringify(sessionPayload), {
      headers,
      tags: { api: 'focus' },
    });

    check(response, {
      'focus session start status is 200': (r) => r.status === 200,
      'focus session response time < 1000ms': (r) => r.timings.duration < 1000,
      'session has id': (r) => r.json('sessionId') !== undefined,
    });

    if (response.status === 200) {
      const sessionId = response.json('sessionId');

      // Test session status endpoint
      sleep(2);
      const statusResponse = http.get(`${BASE_URL}/api/focus/status/${sessionId}`, {
        headers,
        tags: { api: 'focus' },
      });

      check(statusResponse, {
        'focus status check successful': (r) => r.status === 200,
        'focus status response time < 500ms': (r) => r.timings.duration < 500,
      });
    }
  });

  group('Focus Statistics', () => {
    const response = http.get(`${BASE_URL}/api/focus/stats`, {
      headers,
      tags: { api: 'focus' },
    });

    check(response, {
      'focus stats status is 200': (r) => r.status === 200,
      'focus stats response time < 1500ms': (r) => r.timings.duration < 1500,
    });
  });
}

function analyticsTest() {
  const headers = {
    'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`,
  };

  group('Dashboard Analytics', () => {
    const response = http.get(`${BASE_URL}/api/analytics/dashboard`, {
      headers,
      tags: { api: 'analytics' },
    });

    check(response, {
      'analytics status is 200': (r) => r.status === 200,
      'analytics response time < 3000ms': (r) => r.timings.duration < 3000,
    });
  });

  group('Performance Metrics', () => {
    const response = http.get(`${BASE_URL}/api/analytics/performance`, {
      headers,
      tags: { api: 'analytics' },
    });

    check(response, {
      'performance metrics status is 200': (r) => r.status === 200,
      'performance metrics response time < 2000ms': (r) => r.timings.duration < 2000,
    });
  });
}

export function teardown(data) {
  console.log('Load test completed');

  // Cleanup test data if needed
  const cleanupResponse = http.post(`${BASE_URL}/api/test/cleanup`, null, {
    headers: { 'Authorization': `Bearer ${__ENV.AUTH_TOKEN}` },
  });

  console.log('Cleanup response:', cleanupResponse.status);
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data),
    'load-test-summary.html': generateHtmlReport(data),
  };
}

function generateHtmlReport(data) {
  const metrics = data.metrics;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Load Test Results - Study Teddy</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
        .passed { background-color: #d4edda; }
        .failed { background-color: #f8d7da; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>Load Test Results</h1>
      <h2>Summary</h2>
      <p>Test Duration: ${data.state.testRunDurationMs}ms</p>
      <p>Virtual Users: ${data.state.vusMax}</p>

      <h2>Key Metrics</h2>
      <table>
        <tr>
          <th>Metric</th>
          <th>Value</th>
          <th>Threshold</th>
          <th>Status</th>
        </tr>
        ${Object.entries(metrics).map(([name, metric]) => `
          <tr>
            <td>${name}</td>
            <td>${metric.value || 'N/A'}</td>
            <td>${metric.thresholds ? Object.keys(metric.thresholds).join(', ') : 'None'}</td>
            <td class="${metric.thresholds && Object.values(metric.thresholds).every(t => t.ok) ? 'passed' : 'failed'}">
              ${metric.thresholds && Object.values(metric.thresholds).every(t => t.ok) ? 'PASS' : 'FAIL'}
            </td>
          </tr>
        `).join('')}
      </table>

      <h2>Request Details</h2>
      <p>Total Requests: ${metrics.http_reqs ? metrics.http_reqs.count : 'N/A'}</p>
      <p>Failed Requests: ${metrics.http_req_failed ? (metrics.http_req_failed.rate * 100).toFixed(2) + '%' : 'N/A'}</p>
      <p>Average Response Time: ${metrics.http_req_duration ? metrics.http_req_duration.avg.toFixed(2) + 'ms' : 'N/A'}</p>
      <p>95th Percentile: ${metrics.http_req_duration ? metrics.http_req_duration['p(95)'].toFixed(2) + 'ms' : 'N/A'}</p>
    </body>
    </html>
  `;
}