// InstantDB Configuration
// Copy this file to .env.local and fill in your actual app ID

module.exports = {
  // Get your app ID from https://instantdb.com/dashboard
  appId: process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || "your-app-id-here",
  
  // MCP endpoint (from your configuration)
  url: "https://mcp.instantdb.com/mcp",
  
  // Schema configuration
  schema: {
    entities: {
      todos: {
        text: "string",
        done: "boolean", 
        createdAt: "number"
      }
    }
  }
};
