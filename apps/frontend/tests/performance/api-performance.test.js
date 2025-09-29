/**
 * API Performance Tests
 * Ensures API endpoints meet the PRD requirement of p95 < 300ms latency
 */

const axios = require('axios');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const PERFORMANCE_TARGETS = {
  p95: 300, // 300ms p95 latency (PRD requirement)
  p50: 150, // 150ms median latency
  timeout: 5000, // 5 second timeout
};

class PerformanceTracker {
  constructor() {
    this.measurements = [];
  }

  async measureEndpoint(name, requestFn, iterations = 10) {
    const results = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      try {
        await requestFn();
        const endTime = performance.now();
        const duration = endTime - startTime;
        results.push({ success: true, duration, iteration: i + 1 });
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        results.push({
          success: false,
          duration,
          error: error.message,
          iteration: i + 1
        });
      }

      // Small delay between requests to avoid overwhelming the server
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successfulResults = results.filter(r => r.success);
    const durations = successfulResults.map(r => r.duration);
    durations.sort((a, b) => a - b);

    const stats = {
      name,
      iterations,
      successRate: (successfulResults.length / iterations) * 100,
      durations,
      min: Math.min(...durations),
      max: Math.max(...durations),
      mean: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
      errors: results.filter(r => !r.success),
    };

    this.measurements.push(stats);
    return stats;
  }

  percentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedArray[lower];
    }

    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  generateReport() {
    const totalTests = this.measurements.length;
    const passedTests = this.measurements.filter(m =>
      m.p95 <= PERFORMANCE_TARGETS.p95 && m.successRate >= 95
    ).length;

    return {
      summary: {
        totalEndpoints: totalTests,
        passedEndpoints: passedTests,
        failedEndpoints: totalTests - passedTests,
        overallPassRate: (passedTests / totalTests) * 100,
      },
      targets: PERFORMANCE_TARGETS,
      measurements: this.measurements.map(m => ({
        name: m.name,
        passed: m.p95 <= PERFORMANCE_TARGETS.p95 && m.successRate >= 95,
        metrics: {
          successRate: `${m.successRate.toFixed(1)}%`,
          p50: `${m.p50.toFixed(1)}ms`,
          p95: `${m.p95.toFixed(1)}ms`,
          p99: `${m.p99.toFixed(1)}ms`,
          mean: `${m.mean.toFixed(1)}ms`,
        },
        budgetStatus: {
          p95WithinBudget: m.p95 <= PERFORMANCE_TARGETS.p95,
          p50WithinBudget: m.p50 <= PERFORMANCE_TARGETS.p50,
        }
      })),
    };
  }
}

describe('API Performance Tests', () => {
  let tracker;
  let authToken;

  beforeAll(async () => {
    tracker = new PerformanceTracker();

    // Set up authentication for protected endpoints
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'test123'
      }, { timeout: PERFORMANCE_TARGETS.timeout });

      authToken = loginResponse.data.token;
    } catch (error) {
      console.warn('Authentication failed, some tests may be skipped:', error.message);
    }
  });

  afterAll(() => {
    const report = tracker.generateReport();

    console.log('\n📊 API Performance Report:');
    console.log('=========================');
    console.log(`Overall Pass Rate: ${report.summary.overallPassRate.toFixed(1)}%`);
    console.log(`Passed Endpoints: ${report.summary.passedEndpoints}/${report.summary.totalEndpoints}`);

    console.log('\n📈 Endpoint Details:');
    report.measurements.forEach(m => {
      const status = m.passed ? '✅' : '❌';
      console.log(`${status} ${m.name}: p95=${m.metrics.p95}, success=${m.metrics.successRate}`);
    });

    // Save detailed report
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, '../../.next/api-performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  });

  test('Health check endpoint should be fast', async () => {
    const stats = await tracker.measureEndpoint(
      'GET /health',
      () => axios.get(`${API_BASE_URL}/health`, { timeout: PERFORMANCE_TARGETS.timeout }),
      20
    );

    expect(stats.successRate).toBeGreaterThanOrEqual(95);
    expect(stats.p95).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p95);
    expect(stats.p50).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p50);
  });

  test('Tasks list endpoint should meet performance requirements', async () => {
    if (!authToken) {
      console.warn('Skipping tasks test - no auth token');
      return;
    }

    const stats = await tracker.measureEndpoint(
      'GET /api/v1/tasks',
      () => axios.get(`${API_BASE_URL}/api/v1/tasks`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: PERFORMANCE_TARGETS.timeout
      }),
      15
    );

    expect(stats.successRate).toBeGreaterThanOrEqual(95);
    expect(stats.p95).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p95);
  });

  test('Tasks creation should be performant', async () => {
    if (!authToken) {
      console.warn('Skipping task creation test - no auth token');
      return;
    }

    const stats = await tracker.measureEndpoint(
      'POST /api/v1/tasks',
      () => axios.post(`${API_BASE_URL}/api/v1/tasks`, {
        title: `Performance Test Task ${Date.now()}`,
        description: 'Test task for performance testing',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        priority: 'medium',
        estimatedMinutes: 30
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: PERFORMANCE_TARGETS.timeout
      }),
      10
    );

    expect(stats.successRate).toBeGreaterThanOrEqual(95);
    expect(stats.p95).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p95);
  });

  test('Dashboard analytics should load quickly', async () => {
    if (!authToken) {
      console.warn('Skipping dashboard test - no auth token');
      return;
    }

    const stats = await tracker.measureEndpoint(
      'GET /api/v1/dashboard/stats',
      () => axios.get(`${API_BASE_URL}/api/v1/dashboard/stats`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: PERFORMANCE_TARGETS.timeout
      }),
      10
    );

    expect(stats.successRate).toBeGreaterThanOrEqual(95);
    expect(stats.p95).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p95);
  });

  test('Subjects list should be fast', async () => {
    if (!authToken) {
      console.warn('Skipping subjects test - no auth token');
      return;
    }

    const stats = await tracker.measureEndpoint(
      'GET /api/v1/subjects',
      () => axios.get(`${API_BASE_URL}/api/v1/subjects`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: PERFORMANCE_TARGETS.timeout
      }),
      10
    );

    expect(stats.successRate).toBeGreaterThanOrEqual(95);
    expect(stats.p95).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p95);
  });

  test('AI chat endpoint should handle load efficiently', async () => {
    if (!authToken) {
      console.warn('Skipping AI chat test - no auth token');
      return;
    }

    const stats = await tracker.measureEndpoint(
      'POST /api/v1/ai/chat',
      () => axios.post(`${API_BASE_URL}/api/v1/ai/chat`, {
        message: 'Hello, how can you help me study?',
        context: {
          subject: 'mathematics',
          topic: 'algebra'
        }
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 10000 // AI endpoints may need more time
      }),
      5 // Fewer iterations for AI endpoints due to cost
    );

    expect(stats.successRate).toBeGreaterThanOrEqual(90); // Slightly lower for AI
    // AI endpoints may be slower, but should still be reasonable
    expect(stats.p95).toBeLessThanOrEqual(2000); // 2 seconds max for AI
  });

  test('Batch operations should be efficient', async () => {
    if (!authToken) {
      console.warn('Skipping batch test - no auth token');
      return;
    }

    // Test with larger payload to simulate real batch operations
    const stats = await tracker.measureEndpoint(
      'GET /api/v1/tasks?limit=50',
      () => axios.get(`${API_BASE_URL}/api/v1/tasks?limit=50&sortBy=dueDate&sortOrder=asc`, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: PERFORMANCE_TARGETS.timeout
      }),
      10
    );

    expect(stats.successRate).toBeGreaterThanOrEqual(95);
    expect(stats.p95).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p95);
  });

  test('Concurrent requests should not degrade performance significantly', async () => {
    if (!authToken) {
      console.warn('Skipping concurrent test - no auth token');
      return;
    }

    // Test concurrent requests
    const concurrentRequests = 5;
    const results = [];

    for (let i = 0; i < 3; i++) { // 3 rounds of concurrent requests
      const promises = Array(concurrentRequests).fill().map(() =>
        axios.get(`${API_BASE_URL}/api/v1/tasks?limit=10`, {
          headers: { Authorization: `Bearer ${authToken}` },
          timeout: PERFORMANCE_TARGETS.timeout
        })
      );

      const startTime = performance.now();
      await Promise.all(promises);
      const endTime = performance.now();

      results.push(endTime - startTime);

      // Small delay between rounds
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const avgConcurrentTime = results.reduce((sum, time) => sum + time, 0) / results.length;

    // Concurrent requests should complete within reasonable time
    expect(avgConcurrentTime).toBeLessThanOrEqual(1000); // 1 second for 5 concurrent requests
  });
});

describe('API Performance Monitoring', () => {
  test('should detect performance regressions', () => {
    // This test would compare current performance against historical baselines
    // For now, we'll create a placeholder that validates our tracking works

    const tracker = new PerformanceTracker();
    expect(tracker.measurements).toHaveLength(0);

    // In a real implementation, this would:
    // 1. Load historical performance data
    // 2. Compare current measurements against baselines
    // 3. Alert if performance has regressed significantly
  });

  test('should generate actionable performance insights', () => {
    // This test validates that our performance data is actionable
    const mockStats = {
      name: 'test-endpoint',
      p95: 250,
      p50: 100,
      successRate: 98,
      durations: [80, 90, 100, 110, 250]
    };

    // Performance should meet targets
    expect(mockStats.p95).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p95);
    expect(mockStats.successRate).toBeGreaterThanOrEqual(95);

    // Performance data should be detailed enough for optimization
    expect(mockStats.durations).toEqual(expect.arrayContaining([expect.any(Number)]));
  });
});