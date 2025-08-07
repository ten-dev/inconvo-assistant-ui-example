# Inconvo Assistant UI Example

This is an example implementation of [assistant-ui](https://github.com/assistant-ui/assistant-ui) with [Inconvo](https://inconvo.com) as an external runtime provider.

## Getting Started

First, create a `.env` and file to add your Inconvo API key:

```bash
touch .env
```

Then update `.env` with your credentials:

```
INCONVO_API_KEY="your_inconvo_api_key_here"
INCONVO_API_BASE_URL="https://app.inconvo.ai/api/v1"
```

Then install dependencies:

```bash
npm i
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3232](http://localhost:3232) with your browser to see the result.

## Project Structure

- `app/InconvoRuntimeProvider.tsx` - Inconvo runtime integration for assistant-ui
- `app/assistant.tsx` - Main assistant UI component
- `app/api/inconvo/` - API routes for Inconvo integration
- `components/inconvo/` - Custom message components for charts and tables

## Key Components

### InconvoRuntimeProvider

The custom runtime provider that integrates Inconvo with assistant-ui, handling:

- Message streaming
- Conversation persistence
- Custom message types (charts, tables)

### Custom Message Types

This example supports rendering:

- **Charts**: Visualize data using Chart.js
- **Tables**: Display structured data in table format

## Development

You can start editing the assistant by modifying:

- `app/assistant.tsx` - Main UI component
- `app/InconvoRuntimeProvider.tsx` - Runtime behavior
- `components/inconvo/` - Custom message renderers
