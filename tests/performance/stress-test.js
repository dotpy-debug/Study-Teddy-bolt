import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

export const options = {
  scenarios: {
    // Gradual stress increase
    stress_ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 25 },   // Ramp up to 25 users
        { duration: '5m', target: 25 },   // Stay at 25 users
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 200 },  // Stress point - 200 users
        { duration: '5m', target: 200 },  // Maintain stress
        { duration: '2m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },

  thresholds: {
    // Stress test thresholds (more lenient than load test)
    http_req_duration: ['p(95)<5000'],     // 95% under 5s (degraded but acceptable)
    http_req_failed: ['rate<0.2'],         // Error rate under 20%
    errors: ['rate<0.15'],                 // Custom error rate under 15%

    // Per-stage thresholds
    'http_req_duration{stage:low}': ['p(95)<2000'],    // Normal performance at low load
    'http_req_duration{stage:medium}': ['p(95)<3000'],  // Slight degradation at medium load
    'http_req_duration{stage:high}': ['p(95)<5000'],    // Acceptable degradation at high load
    'http_req_duration{stage:stress}': ['p(95)<10000'], // Survival mode under stress
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  console.log('Starting stress test...');

  // Pre-populate some test data for more realistic stress testing
  const setupResponse = http.post(`${BASE_URL}/api/test/setup-stress-data`);
  console.log('Setup response:', setupResponse.status);

  return { baseUrl: BASE_URL };
}

export default function (data) {
  const currentVUs = __ENV.K6_VUS || 1;
  let stage = 'low';

  // Determine current load stage
  if (currentVUs <= 25) {
    stage = 'low';
  } else if (currentVUs <= 50) {
    stage = 'medium';
  } else if (currentVUs <= 100) {
    stage = 'high';
  } else {
    stage = 'stress';
  }

  group('Authentication Under Stress', () => {
    stressTestAuth(stage);
  });

  group('Database Operations Under Stress', () => {
    stressTestDatabase(stage);
  });

  group('API Endpoints Under Stress', () => {
    stressTestAPI(stage);
  });

  group('Memory Intensive Operations', () => {
    stressTestMemory(stage);
  });

  // Variable sleep based on load stage
  const sleepTime = stage === 'stress' ? 0.5 : 1;
  sleep(sleepTime);
}

function stressTestAuth(stage) {
  const authPayload = {
    email: `stresstest+${Math.random().toString(36).substr(2, 9)}@studyteddy.com`,
    password: 'StressTest123!',
  };

  group('Rapid Authentication Requests', () => {
    // Multiple rapid auth attempts to stress the auth system
    for (let i = 0; i < 3; i++) {
      const response = http.post(`${BASE_URL}/api/auth/signin`, JSON.stringify(authPayload), {
        headers: { 'Content-Type': 'application/json' },
        tags: { api: 'auth', stage: stage },
      });

      const success = check(response, {
        [`auth status acceptable (stage: ${stage})`]: (r) => r.status === 200 || r.status === 401 || r.status === 429,
        [`auth response time reasonable (stage: ${stage})`]: (r) => {
          const maxTime = stage === 'stress' ? 10000 : 5000;
          return r.timings.duration < maxTime;
        },
      });

      errorRate.add(!success);
      apiResponseTime.add(response.timings.duration);

      if (stage === 'stress') {
        sleep(0.1); // Brief pause during stress
      }
    }
  });
}

function stressTestDatabase(stage) {
  const headers = {
    'Content-Type': 'application/json',
  };

  group('Heavy Database Queries', () => {
    // Simulate heavy database operations
    const queries = [
      { endpoint: '/api/tasks/search', payload: { query: 'math', limit: 100 } },
      { endpoint: '/api/analytics/heavy-report', payload: { dateRange: '30d' } },
      { endpoint: '/api/calendar/events/bulk', payload: { months: 6 } },
    ];

    queries.forEach((query, index) => {
      const response = http.post(`${BASE_URL}${query.endpoint}`, JSON.stringify(query.payload), {
        headers,
        tags: { api: 'database', query: `query_${index}`, stage: stage },
        timeout: '30s', // Extended timeout for stress testing
      });

      check(response, {
        [`database query ${index} survives (stage: ${stage})`]: (r) => r.status < 500,
        [`database query ${index} completes (stage: ${stage})`]: (r) => r.status !== 0,
      });
    });
  });

  group('Concurrent Database Writes', () => {
    // Multiple write operations to stress database locks
    const writeOperations = [];

    for (let i = 0; i < 5; i++) {
      const taskPayload = {
        title: `Stress Task ${i} - ${Math.random().toString(36).substr(2, 9)}`,
        description: `Generated during stress test at stage ${stage}`,
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        dueDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      writeOperations.push(
        http.asyncRequest('POST', `${BASE_URL}/api/tasks`, JSON.stringify(taskPayload), {
          headers,
          tags: { api: 'database_write', stage: stage },
        })
      );
    }

    // Wait for all operations to complete
    const responses = writeOperations.map(op => op.result());

    responses.forEach((response, index) => {
      check(response, {
        [`concurrent write ${index} acceptable (stage: ${stage})`]: (r) => r.status === 201 || r.status === 429 || r.status === 503,
      });
    });
  });
}

function stressTestAPI(stage) {
  group('API Rate Limiting', () => {
    // Rapid-fire requests to test rate limiting
    const rapidRequests = stage === 'stress' ? 20 : 10;

    for (let i = 0; i < rapidRequests; i++) {
      const response = http.get(`${BASE_URL}/api/tasks`, {
        tags: { api: 'rate_limit_test', stage: stage },
        timeout: '10s',
      });

      check(response, {
        [`rapid request ${i} handled (stage: ${stage})`]: (r) => r.status === 200 || r.status === 429,
        [`no server errors (stage: ${stage})`]: (r) => r.status < 500,
      });

      // No sleep to maximize stress
    }
  });

  group('Large Payload Processing', () => {
    // Test with large payloads to stress request processing
    const largePayload = {
      title: 'Large Task Description',
      description: 'A'.repeat(10000), // 10KB description
      metadata: {
        tags: Array.from({ length: 100 }, (_, i) => `tag${i}`),
        notes: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          content: 'B'.repeat(1000),
          timestamp: new Date().toISOString(),
        })),
      },
    };

    const response = http.post(`${BASE_URL}/api/tasks/bulk`, JSON.stringify(largePayload), {
      headers: { 'Content-Type': 'application/json' },
      tags: { api: 'large_payload', stage: stage },
      timeout: '30s',
    });

    check(response, {
      [`large payload processed (stage: ${stage})`]: (r) => r.status < 500,
      [`large payload response time acceptable (stage: ${stage})`]: (r) => {
        const maxTime = stage === 'stress' ? 30000 : 15000;
        return r.timings.duration < maxTime;
      },
    });
  });
}

function stressTestMemory(stage) {
  group('Memory Intensive Operations', () => {
    // Simulate memory-intensive operations
    const operations = [
      { endpoint: '/api/analytics/memory-intensive', name: 'analytics' },
      { endpoint: '/api/reports/generate-heavy', name: 'reports' },
      { endpoint: '/api/export/full-data', name: 'export' },
    ];

    operations.forEach(operation => {
      const response = http.get(`${BASE_URL}${operation.endpoint}`, {
        tags: { api: 'memory_intensive', operation: operation.name, stage: stage },
        timeout: '60s',
      });

      check(response, {
        [`${operation.name} operation survives (stage: ${stage})`]: (r) => r.status !== 0,
        [`${operation.name} no memory errors (stage: ${stage})`]: (r) => r.status !== 503 && r.status !== 507,
      });
    });
  });

  group('Garbage Collection Stress', () => {
    // Create many short-lived requests to stress garbage collection
    for (let i = 0; i < 10; i++) {
      const tempData = {
        timestamp: Date.now(),
        data: Array.from({ length: 1000 }, (_, j) => ({ id: j, value: Math.random() })),
      };

      const response = http.post(`${BASE_URL}/api/temp/process`, JSON.stringify(tempData), {
        headers: { 'Content-Type': 'application/json' },
        tags: { api: 'gc_stress', stage: stage },
        timeout: '5s',
      });

      check(response, {
        [`GC stress request ${i} handled (stage: ${stage})`]: (r) => r.status < 500,
      });
    }
  });
}

export function teardown(data) {
  console.log('Stress test completed');

  // Generate stress test report
  const reportData = {
    timestamp: new Date().toISOString(),
    maxVUs: __ENV.K6_VUS_MAX || 200,
    errorRate: data.metrics.errors ? data.metrics.errors.rate : 0,
    avgResponseTime: data.metrics.http_req_duration ? data.metrics.http_req_duration.avg : 0,
    p95ResponseTime: data.metrics.http_req_duration ? data.metrics.http_req_duration['p(95)'] : 0,
  };

  console.log('Stress Test Summary:', JSON.stringify(reportData, null, 2));

  // Cleanup stress test data
  const cleanupResponse = http.post(`${BASE_URL}/api/test/cleanup-stress-data`);
  console.log('Cleanup response:', cleanupResponse.status);
}

export function handleSummary(data) {
  const summary = {
    testType: 'stress',
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs,
    maxVUs: data.state.vusMax,
    totalRequests: data.metrics.http_reqs ? data.metrics.http_reqs.count : 0,
    errorRate: data.metrics.http_req_failed ? data.metrics.http_req_failed.rate : 0,
    avgResponseTime: data.metrics.http_req_duration ? data.metrics.http_req_duration.avg : 0,
    p95ResponseTime: data.metrics.http_req_duration ? data.metrics.http_req_duration['p(95)'] : 0,
    p99ResponseTime: data.metrics.http_req_duration ? data.metrics.http_req_duration['p(99)'] : 0,
    thresholdsPassed: Object.entries(data.metrics)
      .filter(([_, metric]) => metric.thresholds)
      .map(([name, metric]) => ({
        name,
        passed: Object.values(metric.thresholds).every(t => t.ok)
      }))
  };

  return {
    'stress-test-results.json': JSON.stringify(summary, null, 2),
    'stress-test-full.json': JSON.stringify(data),
    stdout: `
      ================================
      STRESS TEST RESULTS
      ================================
      Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s
      Max VUs: ${data.state.vusMax}
      Total Requests: ${summary.totalRequests}
      Error Rate: ${(summary.errorRate * 100).toFixed(2)}%
      Avg Response Time: ${summary.avgResponseTime.toFixed(2)}ms
      95th Percentile: ${summary.p95ResponseTime.toFixed(2)}ms
      99th Percentile: ${summary.p99ResponseTime.toFixed(2)}ms
      ================================
    `
  };
}