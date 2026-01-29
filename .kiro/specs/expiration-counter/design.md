# Design Document: Expiration Counter

## Overview

The expiration counter feature adds a real-time countdown display to the paste viewing interface, showing users exactly how much time remains before a TTL paste expires. The solution uses client-side JavaScript with server-provided timestamps to ensure accuracy while maintaining good performance and user experience.

The design leverages React hooks for state management, efficient timer intervals for updates, and responsive visual design that adapts based on remaining time. The counter integrates seamlessly with the existing paste viewing interface without requiring changes to the backend API.

## Architecture

### Component Structure

```
PastePage (Server Component)
├── Static paste content and metadata
├── ExpirationCounter (Client Component)
│   ├── CountdownTimer (Custom Hook)
│   ├── TimeFormatter (Utility)
│   └── ExpirationHandler (Logic)
└── Existing paste display components
```

### Data Flow

1. **Server-Side**: Calculate expiry timestamp and remaining time
2. **Client Hydration**: Initialize countdown with server-provided data
3. **Timer Updates**: Update display every second using client-side calculation
4. **Expiration**: Handle zero countdown with UI state changes

### Time Synchronization Strategy

The design uses server-provided timestamps to avoid client-server time discrepancies:
- Server calculates and provides both current time and expiry time
- Client calculates remaining time based on server timestamps
- Client uses `Date.now()` for interval updates but relies on server baseline

## Components and Interfaces

### ExpirationCounter Component

**Props Interface:**
```typescript
interface ExpirationCounterProps {
  expiresAt: string;           // ISO 8601 expiry timestamp from server
  serverTime: string;          // ISO 8601 current server time
  onExpired?: () => void;      // Optional callback when countdown reaches zero
}
```

**State Management:**
```typescript
interface CountdownState {
  remainingMs: number;         // Remaining milliseconds
  isExpired: boolean;          // Whether paste has expired
  isActive: boolean;           // Whether timer is running
}
```

### CountdownTimer Custom Hook

**Interface:**
```typescript
interface UseCountdownTimer {
  remainingMs: number;
  isExpired: boolean;
  isActive: boolean;
  start: () => void;
  stop: () => void;
  reset: (newExpiryTime: number) => void;
}

function useCountdownTimer(
  initialRemainingMs: number,
  onExpired?: () => void
): UseCountdownTimer
```

**Implementation Strategy:**
- Uses `useEffect` with `setInterval` for timer management
- Implements cleanup on component unmount
- Handles browser tab visibility changes
- Provides manual start/stop/reset controls

### TimeFormatter Utility

**Interface:**
```typescript
interface FormattedTime {
  display: string;             // Human-readable format (e.g., "2h 15m 30s")
  urgency: 'normal' | 'warning' | 'critical';  // Visual urgency level
  parts: {
    hours: number;
    minutes: number;
    seconds: number;
  };
}

function formatRemainingTime(remainingMs: number): FormattedTime
```

**Formatting Rules:**
- `> 1 hour`: "2h 15m 30s" format
- `1 hour - 1 minute`: "45m 30s" format  
- `< 1 minute`: "30s" format
- `< 5 minutes`: Warning urgency
- `< 1 minute`: Critical urgency

## Data Models

### Server Response Enhancement

Extend the existing `GetPasteResponse` to include server time:

```typescript
interface GetPasteResponse {
  content: string;
  remaining_views: number | null;
  expires_at: string | null;
  server_time: string;         // NEW: Current server time for sync
}
```

### Client State Models

```typescript
interface ExpirationState {
  remainingMs: number;
  isExpired: boolean;
  urgencyLevel: 'normal' | 'warning' | 'critical';
  formattedTime: string;
}

interface TimerConfig {
  updateInterval: number;      // Default: 1000ms
  warningThreshold: number;    // Default: 5 minutes
  criticalThreshold: number;   // Default: 1 minute
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Now I need to analyze the acceptance criteria to determine which ones can be tested as properties:
### Property 1: TTL Paste Countdown Display
*For any* paste with a TTL constraint, when viewed in the Paste_Viewer, a countdown component should be rendered and display the correct initial remaining time
**Validates: Requirements 1.1**

### Property 2: Non-TTL Paste No Countdown
*For any* paste without a TTL constraint, when viewed in the Paste_Viewer, no countdown component should be rendered or displayed
**Validates: Requirements 1.3**

### Property 3: Countdown Expiration Handling
*For any* active countdown timer, when the remaining time reaches zero, the paste content should be hidden and an expiration message should be displayed
**Validates: Requirements 1.2, 3.1**

### Property 4: Timer Update Accuracy
*For any* active countdown timer, the displayed remaining time should decrease by approximately 1000ms every second (within reasonable tolerance)
**Validates: Requirements 1.4**

### Property 5: Time Format Consistency
*For any* remaining time value, the formatted display should follow the correct pattern: hours/minutes/seconds for >1h, minutes/seconds for 1h-1m, seconds only for <1m
**Validates: Requirements 1.5, 2.2, 2.3, 2.4**

### Property 6: Warning Color Thresholds
*For any* countdown with remaining time less than 5 minutes, the display should apply warning visual styling (orange/red colors)
**Validates: Requirements 2.5**

### Property 7: Monospace Font Usage
*For any* countdown display, the font-family should be monospace to ensure consistent digit alignment
**Validates: Requirements 2.6**

### Property 8: Expiration Message Display
*For any* expired paste, the system should display a clear "Paste has expired" message
**Validates: Requirements 3.2**

### Property 9: New Paste Link Provision
*For any* expired paste, the system should provide a clickable link to create a new paste
**Validates: Requirements 3.3**

### Property 10: Client-Side Expiration
*For any* countdown expiration event, no HTTP requests should be made to the server during the expiration process
**Validates: Requirements 3.4**

### Property 11: Expired State Persistence
*For any* paste that has expired client-side, refreshing the page should maintain the expired state without showing the content
**Validates: Requirements 3.5**

### Property 12: Server Time Provision
*For any* TTL paste API response, the server should include both current server time and paste expiry time in the response
**Validates: Requirements 4.1**

### Property 13: Client Time Calculation
*For any* server-provided timestamps, the client should calculate remaining time based on the server timestamps rather than client system time
**Validates: Requirements 4.2**

### Property 14: Clock Difference Handling
*For any* client-server time difference, the countdown should remain accurate by using server-provided baseline timestamps
**Validates: Requirements 4.3**

### Property 15: Initial Display Accuracy
*For any* page load with a TTL paste, the countdown should immediately display the correct remaining time without delay
**Validates: Requirements 4.4**

### Property 16: Logic Consistency
*For any* time calculation, the client-side logic should produce the same expiration determination as the server-side logic
**Validates: Requirements 4.5**

### Property 17: Timer Cleanup
*For any* countdown timer, when the component unmounts or user navigates away, all timer intervals should be properly cleared
**Validates: Requirements 5.2**

### Property 18: Timer Independence
*For any* multiple countdown timers running simultaneously, each timer should operate independently without affecting others
**Validates: Requirements 5.4**

### Property 19: Inactive Tab Accuracy
*For any* countdown timer, when the browser tab becomes inactive and then active again, the displayed time should remain accurate
**Validates: Requirements 5.5**

## Error Handling

### Client-Side Error Scenarios

**Invalid Time Data:**
- Handle malformed or missing timestamp data from server
- Fallback to hiding countdown if time calculation fails
- Log errors for debugging without breaking the UI

**Timer Failures:**
- Handle `setInterval` failures gracefully
- Implement retry logic for timer initialization
- Provide manual refresh option if timer stops working

**Network Connectivity:**
- Handle initial page load failures
- Graceful degradation when server time is unavailable
- Cache last known server time offset for resilience

### Error Recovery Strategies

```typescript
interface ErrorRecovery {
  retryTimer: () => boolean;           // Attempt to restart failed timer
  fallbackDisplay: () => void;        // Show static expiry time if countdown fails
  logError: (error: Error) => void;   // Log errors for monitoring
}
```

**Graceful Degradation:**
1. If countdown fails, show static expiry time
2. If server time unavailable, use client time with warning
3. If formatting fails, show raw timestamp
4. Always provide manual refresh option

## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit tests for specific scenarios with property-based tests for comprehensive coverage:

**Unit Tests:**
- Specific time formatting examples (edge cases like 0 seconds, exactly 1 hour)
- Component mounting and unmounting behavior
- Error handling scenarios (malformed data, network failures)
- Integration between countdown timer and UI components

**Property-Based Tests:**
- Universal time formatting correctness across all possible time values
- Timer accuracy across different durations and intervals
- Component behavior consistency across various paste configurations
- Resource cleanup verification across different navigation patterns

### Property-Based Testing Configuration

**Testing Framework:** Jest with `fast-check` library for property-based testing
**Minimum Iterations:** 100 per property test
**Test Tagging:** Each property test references its design document property

**Example Test Tags:**
- **Feature: expiration-counter, Property 1: TTL Paste Countdown Display**
- **Feature: expiration-counter, Property 5: Time Format Consistency**
- **Feature: expiration-counter, Property 13: Client Time Calculation**

### Test Data Generation

**Time Value Generators:**
- Random millisecond values from 0 to 30 days
- Edge cases: 0, 999ms, 59999ms, 3599999ms (boundary values)
- Server-client time offset scenarios (-5min to +5min)

**Paste Configuration Generators:**
- TTL pastes with various expiry times
- Non-TTL pastes (ttlSeconds: undefined)
- Expired pastes (expiry time in the past)

**UI State Generators:**
- Component mount/unmount sequences
- Tab visibility change patterns
- Multiple timer instances with different configurations

### Integration Testing

**End-to-End Scenarios:**
- Full paste viewing flow with countdown
- Countdown expiration and state changes
- Page refresh behavior with expired pastes
- Multiple tabs with different paste countdowns

**Performance Testing:**
- Timer resource usage monitoring
- Memory leak detection during long-running countdowns
- CPU usage measurement with multiple active timers