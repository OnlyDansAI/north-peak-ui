# North Peak UI

React frontend for the North Peak AI Brain chat interface.

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment file:
   ```bash
   cp .env.example .env.local
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Chat Interface

Access the chat at `/chat` with URL parameters:

### Using our UUIDs:
```
/chat?location_id=xxx&contact_id=xxx
```

### Using GHL IDs (will be resolved):
```
/chat?ghl_location_id=xxx&ghl_contact_id=xxx
```

### Demo mode (no params):
```
/chat
```

## Deployment

Deploy to Vercel:

```bash
vercel
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |

## iframe Embedding

This app supports iframe embedding in GHL marketplace apps. The CSP headers are configured to allow embedding from any origin.
