# InstantDB Setup Guide

This project is configured to use InstantDB with the MCP endpoint you provided.

## Configuration

The InstantDB configuration is set up in `lib/instantdb.ts` with:
- **MCP URL**: `https://mcp.instantdb.com/mcp`
- **App ID**: Configured via environment variable

## Setup Steps

1. **Get your InstantDB App ID**:
   - Go to [InstantDB Dashboard](https://instantdb.com/dashboard)
   - Create a new app or use an existing one
   - Copy the App ID

2. **Set up environment variables**:
   Create a `.env.local` file in your project root:
   ```bash
   NEXT_PUBLIC_INSTANTDB_APP_ID=your-actual-app-id-here
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

## Current Features

- ✅ Real-time todo list with InstantDB
- ✅ Multi-user presence detection
- ✅ Live updates across browser tabs
- ✅ TypeScript support
- ✅ Tailwind CSS styling

## Database Schema

The current schema includes:
- **todos**: text, done status, creation timestamp
- **presence**: real-time user presence tracking

## MCP Integration

The MCP endpoint `https://mcp.instantdb.com/mcp` is configured but commented out in the current setup. If you need to use a custom MCP endpoint, uncomment the `url` parameter in `lib/instantdb.ts`.

## Troubleshooting

- Make sure your App ID is correct in `.env.local`
- Check the browser console for any connection errors
- Verify your InstantDB app is active in the dashboard
