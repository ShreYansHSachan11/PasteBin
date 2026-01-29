# Pastebin-Lite

A simple, fast, and secure pastebin application built with Next.js and Vercel KV.

## Features

- 📝 Create text pastes with unique URLs
- ⏰ Optional time-based expiry (TTL)
- 👁️ Optional view count limits
- 🔒 XSS protection and input validation
- 🚀 Serverless architecture with Vercel
- 💾 Redis-based storage with Vercel KV

## Quick Start

### Prerequisites

- Node.js 18+ 
- Vercel account with KV database

### Environment Setup

Create a `.env.local` file:

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

# Build for production
npm run build
```

### Deployment

Deploy to Vercel:

1. Push to GitHub
2. Import project in Vercel Dashboard
3. Add environment variables
4. Deploy!

## API Endpoints

- `GET /api/healthz` - Health check
- `POST /api/pastes` - Create paste
- `GET /api/pastes/[id]` - Retrieve paste

## Usage

### Create a Paste

```bash
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello World","ttl_seconds":3600,"max_views":10}'
```

### Retrieve a Paste

```bash
curl http://localhost:3000/api/pastes/[paste-id]
```

## License

MIT