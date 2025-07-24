# Tavor Chat

<div align="center">
  <h1>Tavor Chat</h1>
  <p>
    <strong>Production-ready AI chat application built on Convex</strong>
  </p>
  <p>
    Multi-model AI chat with real-time streaming, authentication, and subscriptions
  </p>
  <p>
    <a href="#features"><strong>Features</strong></a> ·
    <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
    <a href="#getting-started"><strong>Getting Started</strong></a> ·
    <a href="#architecture"><strong>Architecture</strong></a>
  </p>
</div>

## About

Tavor Chat is a sophisticated AI chat application that combines the robust foundation of the [Convex SaaS template](https://github.com/get-convex/convex-saas) with a vendored Convex Agent implementation and additional chat-specific features. It provides a production-ready solution for building AI-powered conversational interfaces with support for multiple LLM providers.

## Features

### 🤖 AI & Chat Features

- **Multi-Model Support** - AI models from OpenAI, Anthropic, Google, and more
- **Real-time Streaming** - Live response streaming with delta updates, resumable & synced streams
- **Tool Calling Framework** - Extensible agent capabilities
- **Context Search** - Semantic search across conversation threads
- **Automatic Embeddings** - Vector embeddings for intelligent retrieval
- **Usage Tracking** - Monitor API usage and costs

### 🏗️ Foundation (from Convex SaaS)

- **Authentication** - Secure Google OAuth integration via Convex Auth
- **Subscription Management** - Stripe integration for paid tiers
- **Real-time Database** - Convex's reactive database with live queries
- **Type Safety** - End-to-end TypeScript with generated types
- **Responsive Design** - Mobile-first UI with TailwindCSS
- **Dark Mode** - Built-in theme support

### 🚀 Developer Experience

- **Hot Reload** - Instant updates during development
- **File-based Routing** - Intuitive page structure with TanStack Router
- **Component Library** - Pre-built Medusa UI components
- **Environment Management** - Centralized config via Convex dashboard

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TanStack Router
- **Backend**: Convex (serverless platform with real-time subscriptions)
- **Styling**: TailwindCSS + Medusa UI components
- **AI Integration**: Vercel AI SDK with multiple providers
- **Authentication**: Convex Auth with Google OAuth
- **Payments**: Stripe subscriptions
- **Deployment**: Netlify

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Convex account
- API keys for desired AI providers (OpenAI, Anthropic, etc.)

### Quick Start

1. Clone the repository:

```bash
git clone https://github.com/yourusername/tavor-chat.git
cd tavor-chat
```

2. Install dependencies:

```bash
bun install
```

3. Set up Convex:

```bash
bun convex dev
```

4. Configure environment variables in the Convex dashboard:

   - AI provider API keys
   - Stripe keys (for subscriptions)
   - Google OAuth credentials
   - [Tavor API key](https://tavor.dev/pricing#:~:text=Enterprise%20solutions) (for executing agentic tool calls)

5. Start the development server:

```bash
bun run dev
```

### Development Commands

```bash
bun run dev        # Start development servers
bun run typecheck  # Run TypeScript type checking
bun run lint       # Run ESLint
bun run build      # Build for production
bun run preview    # Preview production build
```

## Architecture

### Data Flow

1. **User sends message** → Frontend calls Convex mutation
2. **Message saved to DB** → Scheduler triggers streaming action
3. **LLM API called** → Response streamed back via deltas
4. **Deltas accumulated** → Final message saved with embeddings
5. **Real-time updates** → Frontend receives updates via subscriptions

### Key Directories

- `/src/routes/` - TanStack Router file-based routes
- `/src/components/chat/` - Chat UI components
- `/convex/` - Backend functions and schema
- `/convex/chat_engine/` - AI agent abstraction layer
- `/src/lib/models.ts` - AI model configuration

## Deployment

Deploy to production using Netlify and Convex:

```bash
npx convex deploy --cmd 'npm run build'
```

## Acknowledgments

This project builds upon:

- [Convex SaaS Starter](https://github.com/get-convex/convex-saas) - The robust SaaS template foundation
- [Convex Agent](https://github.com/get-convex/convex-agent) - Vendored AI agent implementation
- Additional custom features and integrations for production chat applications

## License

See LICENSE file for details.
