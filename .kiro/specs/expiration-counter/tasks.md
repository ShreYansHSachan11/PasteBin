# Implementation Plan: Expiration Counter

## Overview

This implementation plan breaks down the expiration counter feature into discrete coding tasks that build incrementally. The approach starts with core utilities, builds up to the countdown component, integrates with the existing paste viewer, and concludes with comprehensive testing.

## Tasks

- [x] 1. Create time formatting utilities and types
  - Create utility functions for converting milliseconds to human-readable format
  - Define TypeScript interfaces for time formatting and countdown state
  - Implement formatting rules for different time ranges (hours/minutes/seconds)
  - _Requirements: 1.5, 2.2, 2.3, 2.4_

- [ ]* 1.1 Write property test for time formatting utility
  - **Property 5: Time Format Consistency**
  - **Validates: Requirements 1.5, 2.2, 2.3, 2.4**

- [x] 2. Implement countdown timer custom hook
  - Create `useCountdownTimer` hook with state management
  - Implement timer logic with `setInterval` and cleanup
  - Handle timer start, stop, and reset functionality
  - Add expiration callback support
  - _Requirements: 1.4, 5.2, 5.5_

- [ ]* 2.1 Write property test for timer accuracy
  - **Property 4: Timer Update Accuracy**
  - **Validates: Requirements 1.4**

- [ ]* 2.2 Write property test for timer cleanup
  - **Property 17: Timer Cleanup**
  - **Validates: Requirements 5.2**

- [ ]* 2.3 Write property test for timer independence
  - **Property 18: Timer Independence**
  - **Validates: Requirements 5.4**

- [x] 3. Create ExpirationCounter React component
  - Build client component that accepts server timestamps
  - Integrate countdown timer hook with visual display
  - Implement conditional rendering based on TTL presence
  - Add visual urgency styling (warning colors for < 5 minutes)
  - _Requirements: 1.1, 1.3, 2.5, 2.6_

- [ ]* 3.1 Write property test for TTL paste countdown display
  - **Property 1: TTL Paste Countdown Display**
  - **Validates: Requirements 1.1**

- [ ]* 3.2 Write property test for non-TTL paste behavior
  - **Property 2: Non-TTL Paste No Countdown**
  - **Validates: Requirements 1.3**

- [ ]* 3.3 Write property test for warning color thresholds
  - **Property 6: Warning Color Thresholds**
  - **Validates: Requirements 2.5**

- [x] 4. Implement expiration handling logic
  - Add expired state management to countdown component
  - Create expiration message and new paste link UI
  - Implement client-side expiration without server requests
  - Handle expired state persistence across page reloads
  - _Requirements: 1.2, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 4.1 Write property test for countdown expiration handling
  - **Property 3: Countdown Expiration Handling**
  - **Validates: Requirements 1.2, 3.1**

- [ ]* 4.2 Write property test for expiration message display
  - **Property 8: Expiration Message Display**
  - **Validates: Requirements 3.2**

- [ ]* 4.3 Write property test for client-side expiration
  - **Property 10: Client-Side Expiration**
  - **Validates: Requirements 3.4**

- [x] 5. Enhance server API response with server time
  - Modify `GetPasteResponse` interface to include server_time field
  - Update paste retrieval API endpoint to provide current server time
  - Ensure server time is included in all TTL paste responses
  - _Requirements: 4.1_

- [ ]* 5.1 Write property test for server time provision
  - **Property 12: Server Time Provision**
  - **Validates: Requirements 4.1**

- [x] 6. Implement client-side time synchronization
  - Create utility for calculating remaining time from server timestamps
  - Handle client-server time differences using server baseline
  - Ensure initial display accuracy on page load
  - Maintain consistency with server-side expiration logic
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [ ]* 6.1 Write property test for client time calculation
  - **Property 13: Client Time Calculation**
  - **Validates: Requirements 4.2**

- [ ]* 6.2 Write property test for clock difference handling
  - **Property 14: Clock Difference Handling**
  - **Validates: Requirements 4.3**

- [ ]* 6.3 Write property test for initial display accuracy
  - **Property 15: Initial Display Accuracy**
  - **Validates: Requirements 4.4**

- [x] 7. Integrate ExpirationCounter with PastePage
  - Add ExpirationCounter component to paste viewing page
  - Pass server timestamps from server component to client component
  - Position counter prominently near paste metadata
  - Ensure proper hydration and client-side rendering
  - _Requirements: 2.1_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Add error handling and resilience
  - Implement graceful handling of malformed timestamp data
  - Add fallback display for timer failures
  - Create error recovery strategies for network issues
  - Add error logging without breaking UI functionality
  - _Requirements: Error handling from design_

- [ ]* 9.1 Write unit tests for error scenarios
  - Test malformed data handling
  - Test timer failure recovery
  - Test network connectivity issues

- [ ] 10. Implement inactive tab handling
  - Add visibility change detection for browser tabs
  - Ensure countdown accuracy when tab becomes active again
  - Handle timer behavior during tab visibility changes
  - _Requirements: 5.5_

- [ ]* 10.1 Write property test for inactive tab accuracy
  - **Property 19: Inactive Tab Accuracy**
  - **Validates: Requirements 5.5**

- [x] 11. Add CSS styling and responsive design
  - Style countdown component with monospace font
  - Implement warning color scheme for urgency levels
  - Ensure responsive design across different screen sizes
  - Add smooth transitions for state changes
  - _Requirements: 2.6, 2.5_

- [ ]* 11.1 Write property test for monospace font usage
  - **Property 7: Monospace Font Usage**
  - **Validates: Requirements 2.6**

- [x] 12. Final integration and testing
  - Test complete flow from paste creation to expiration
  - Verify countdown behavior across different TTL values
  - Test multiple paste tabs with independent timers
  - Ensure expired state persistence across page reloads
  - _Requirements: All requirements integration_

- [ ]* 12.1 Write property test for expired state persistence
  - **Property 11: Expired State Persistence**
  - **Validates: Requirements 3.5**

- [ ]* 12.2 Write property test for logic consistency
  - **Property 16: Logic Consistency**
  - **Validates: Requirements 4.5**

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- The implementation builds incrementally from utilities to full integration