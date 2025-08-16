# Wave 3: Stress Harness & Concurrency Tests

This directory contains the comprehensive stress testing harness for the audit/orchestrator pipeline, implementing the Wave 3 requirements for performance testing and concurrency validation.

## Features

### 🚀 Core Capabilities
- **20 Parallel Requests**: Executes exactly 20 concurrent requests to the audit/orchestrator pipeline
- **Configurable P95 Threshold**: Environment variable `STRESS_P95_THRESHOLD_MS` controls the 95th percentile response time threshold
- **Quota Conflict Detection**: Automatically detects and reports quota/rate limiting issues
- **Comprehensive Error Handling**: Categorizes and tracks different types of errors
- **Artifact Storage**: Stores detailed performance results under `artifacts/perf`

### 📊 Metrics & Analysis
- **Response Time Statistics**: Min, mean, median, 95th percentile, and max response times
- **Memory Usage Tracking**: Monitors memory growth during stress testing
- **Health Status Assessment**: HEALTHY/WARNING/CRITICAL based on performance thresholds
- **Error Rate Analysis**: Tracks and categorizes failed requests
- **Detailed Request Logging**: Individual request metrics with timestamps

## Files Structure

```
artifacts/perf/                          # Performance test artifacts
├── latest-stress-test.json              # Latest standalone test results
├── latest-mocha-stress-test.json        # Latest Mocha test results
└── stress-test-2025-08-16T*.json        # Timestamped test archives

scripts/
└── stress-harness.js                    # Standalone stress test harness

testing/performance/audit/
├── audit-stress.test.cjs                # Original stress test (20 parallel)
└── audit-stress-enhanced.test.cjs       # Enhanced Wave 3 implementation
```

## Usage

### Standalone Stress Test Harness

```bash
# Run with default 5000ms P95 threshold
npm run test:stress-harness

# Run with custom P95 threshold
STRESS_P95_THRESHOLD_MS=3000 npm run test:stress-harness

# Run directly with Node.js
node scripts/stress-harness.js
```

### Mocha-Based Integration Test

```bash
# Run the enhanced Mocha stress test
npm run test:stress-audit

# Run directly with Mocha
npx mocha testing/performance/audit/audit-stress-enhanced.test.cjs --timeout 60000
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STRESS_P95_THRESHOLD_MS` | `5000` | 95th percentile response time threshold in milliseconds |
| `GENKIT_TEST_STUB` | `1` | Auto-set to avoid AI costs during stress testing |

### Configurable Thresholds

- **P95 Response Time**: Configurable via `STRESS_P95_THRESHOLD_MS`
- **Error Rate**: 5% maximum failure rate
- **Memory Growth**: 50MB maximum memory increase
- **Request Timeout**: 30 seconds per request

## Acceptance Criteria Validation

✅ **20 Parallel Requests**: Both standalone and Mocha tests execute exactly 20 concurrent audit requests

✅ **95th Percentile Threshold**: Configurable via `STRESS_P95_THRESHOLD_MS` environment variable

✅ **Quota Conflict Detection**: Automatically detects quota-related errors and fails the test if found

✅ **Artifact Storage**: All results stored under `artifacts/perf` with detailed JSON reports

✅ **Performance Analysis**: Comprehensive metrics including response times, memory usage, and health status

## Artifact Format

The stress test generates detailed JSON artifacts with the following structure:

```json
{
  "metadata": {
    "timestamp": "2025-08-16T22:16:21.433Z",
    "duration": 4012,
    "config": { "PARALLEL_REQUESTS": 20, "P95_THRESHOLD_MS": 5000, ... },
    "nodeVersion": "v20.19.4",
    "platform": "linux"
  },
  "summary": {
    "totalRequests": 20,
    "successfulRequests": 20,
    "failedRequests": 0,
    "quotaConflicts": 0,
    "errorRate": 0,
    "healthStatus": "HEALTHY"
  },
  "performance": {
    "responseTime": {
      "count": 20,
      "min": 166,
      "max": 4009,
      "mean": 2143,
      "median": 2305,
      "p95": 4009,
      "p99": 4009
    },
    "thresholds": {
      "p95ThresholdMs": 5000,
      "p95Actual": 4009,
      "p95MeetsThreshold": true
    }
  },
  "requests": [...],
  "errors": [...],
  "quotaConflicts": [...]
}
```

## Health Status Levels

- **HEALTHY**: All metrics within thresholds
- **WARNING**: P95 exceeds threshold or memory usage high
- **CRITICAL**: Quota conflicts detected or error rate > 5%

## Integration with CI/CD

The stress tests are designed to integrate with existing CI/CD pipelines:

```bash
# In GitHub Actions or other CI systems
STRESS_P95_THRESHOLD_MS=3000 npm run test:stress-harness
```

Exit codes:
- `0`: All tests passed, system healthy
- `1`: Tests failed, performance issues detected

## Troubleshooting

### Common Issues

1. **Module Not Found**: Ensure all dependencies are installed with `npm install`
2. **High P95 Times**: Consider increasing `STRESS_P95_THRESHOLD_MS` or optimizing the audit pipeline
3. **Quota Conflicts**: Review rate limiting configuration and team quotas
4. **Memory Growth**: Monitor for memory leaks in the audit processing pipeline

### Debugging

Enable verbose logging by setting environment variables:
```bash
DEBUG=stress-test* npm run test:stress-harness
```

## Implementation Notes

- Uses stubbed AI calls (`GENKIT_TEST_STUB=1`) to avoid costs during testing
- Mock implementation for development/testing when functions aren't built
- Compatible with both standalone execution and Mocha test framework
- Automatically creates artifacts directory if it doesn't exist
- Thread-safe artifact storage with timestamped filenames

## Future Enhancements

- Custom request payloads for different audit scenarios
- Distributed testing across multiple nodes
- Real-time monitoring integration
- Performance regression detection
- Load testing beyond concurrency testing