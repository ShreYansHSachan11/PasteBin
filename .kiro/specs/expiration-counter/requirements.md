# Requirements Document

## Introduction

This feature adds a real-time expiration counter to the paste viewing interface, showing users exactly how much time remains before a paste expires. The counter will display a live countdown that updates every second, providing clear visibility into paste availability and creating urgency for users to save important content before it disappears.

## Glossary

- **Expiration_Counter**: A real-time countdown display showing remaining time until paste expiry
- **Paste_Viewer**: The web interface component that displays paste content (/p/[id] page)
- **TTL_Paste**: A paste with a time-to-live (ttlSeconds) constraint that expires after a specific duration
- **Countdown_Timer**: A JavaScript timer that updates the display every second
- **Time_Formatter**: A utility that converts milliseconds into human-readable time format

## Requirements

### Requirement 1: Real-Time Countdown Display

**User Story:** As a user viewing a paste with TTL, I want to see exactly how much time is left before it expires, so that I can save or copy the content if needed.

#### Acceptance Criteria

1. WHEN a user views a TTL paste, THE Paste_Viewer SHALL display a live countdown showing remaining time
2. WHEN the countdown reaches zero, THE Paste_Viewer SHALL show an expiration message and hide the paste content
3. WHEN a paste has no TTL constraint, THE Paste_Viewer SHALL not display any countdown
4. THE Countdown_Timer SHALL update the display every second with accurate remaining time
5. THE Time_Formatter SHALL display time in human-readable format (e.g., "2h 15m 30s", "45m 12s", "30s")

### Requirement 2: Visual Design and User Experience

**User Story:** As a user, I want the expiration counter to be visually prominent and easy to understand, so that I don't miss important timing information.

#### Acceptance Criteria

1. THE Expiration_Counter SHALL be prominently displayed near the paste metadata
2. WHEN time remaining is greater than 1 hour, THE display SHALL show hours, minutes, and seconds
3. WHEN time remaining is less than 1 hour but greater than 1 minute, THE display SHALL show minutes and seconds
4. WHEN time remaining is less than 1 minute, THE display SHALL show only seconds
5. WHEN time remaining is less than 5 minutes, THE counter SHALL use warning colors (orange/red)
6. THE counter SHALL use a monospace font for consistent digit alignment

### Requirement 3: Expiration Handling

**User Story:** As a user, I want clear feedback when a paste expires while I'm viewing it, so that I understand why the content is no longer available.

#### Acceptance Criteria

1. WHEN the countdown reaches zero, THE Paste_Viewer SHALL immediately hide the paste content
2. WHEN a paste expires, THE system SHALL display a clear "Paste has expired" message
3. WHEN a paste expires, THE system SHALL provide a link to create a new paste
4. THE expiration check SHALL happen client-side without requiring server requests
5. THE expired state SHALL persist if the user refreshes the page

### Requirement 4: Server-Side Time Synchronization

**User Story:** As a developer, I want the countdown to be accurate regardless of client-side clock differences, so that expiration timing is consistent with server logic.

#### Acceptance Criteria

1. THE server SHALL provide the current server time and paste expiry time to the client
2. THE client SHALL calculate remaining time based on server-provided timestamps
3. THE countdown SHALL account for potential client-server time differences
4. WHEN the page loads, THE system SHALL immediately calculate and display accurate remaining time
5. THE calculation SHALL use the same time logic as the server-side expiration checks

### Requirement 5: Performance and Resource Management

**User Story:** As a user, I want the countdown to run smoothly without impacting page performance, so that my browsing experience remains responsive.

#### Acceptance Criteria

1. THE Countdown_Timer SHALL use efficient JavaScript intervals that don't block the UI
2. WHEN a user navigates away from the page, THE timer SHALL be properly cleaned up
3. THE timer SHALL not consume excessive CPU or memory resources
4. WHEN multiple pastes are viewed in tabs, THE timers SHALL operate independently
5. THE countdown SHALL continue running accurately even if the browser tab becomes inactive