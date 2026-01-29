# Pastebin-Lite

A simple, fast, and secure pastebin application built with Next.js. Create and share text pastes with optional expiration times and view limits.

## Features

- Create text pastes with unique URLs
- Optional time-based expiry (TTL) with real-time countdown
- Optional view count limits
- XSS protection and input validation
- Serverless architecture optimized for Vercel
- Real-time expiration counter with client-side persistence

## Running Locally

### Prerequisites

- Node.js 18 or higher
- Vercel account with KV database

### Environment Setup

Create a `.env.local` file in the project root:

```bash
KV_REST_API_URL=your_vercel_kv_rest_api_url
KV_REST_API_TOKEN=your_vercel_kv_rest_api_token
```

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Persistence Layer

This application uses **Vercel KV** (Redis) as its persistence layer. Vercel KV provides:

- Fast key-value storage with Redis compatibility
- Automatic TTL (time-to-live) support for paste expiration
- Atomic operations for view count management
- Built-in replication and high availability
- Serverless-optimized connection pooling

All paste data is stored as JSON objects in Redis with automatic expiration handling. The database layer includes retry logic and error handling for production reliability.

## API Endpoints

- `GET /api/healthz` - Health check endpoint
- `POST /api/pastes` - Create a new paste
- `GET /api/pastes/[id]` - Retrieve a paste by ID

## License

MIT