# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an expense tracker Telegram bot built with Express.js and TypeScript. The service uses Telegraf for bot messaging and LLM integration to parse natural language expense messages and automatically categorize spending. The application connects to PostgreSQL via Drizzle ORM and is designed for deployment on Railway.

## Development Commands

**IMPORTANT: Always use `yarn` for package management and script execution. Never use `npm`.**

### Local Development
- `yarn services:up` - Start all development services (PostgreSQL + Telegram Bot API)
- `yarn dev` - Start development server with nodemon
- `yarn services:down` - Stop all services
- `yarn build` - Compile TypeScript to JavaScript 
- `yarn start` - Run compiled JavaScript from dist/

### Code Quality
- Use ESLint with XO config for linting
- TypeScript compilation with strict settings
- Always run `yarn build` to check for compilation errors before completing tasks

## Architecture

### Core Components
- **src/index.ts**: Main Express server entry point with Telegram bot initialization
- **src/services/telegram.ts**: Telegram bot client and messaging functionality
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Environment**: dotenv for configuration management

### Database Setup
- PostgreSQL runs in Docker container (expense-tracker-postgres)
- Default database: `expense_tracker`
- Connection via `DATABASE_URL` environment variable
- Health checks enabled for container reliability

### Local Development Setup
- Copy `.env.example` to `.env` and fill in your values
- Local Telegram Bot API runs in Docker container (expense-tracker-telegram-api)
- Available at `http://localhost:8081` for development
- Requires `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` environment variables
- Automatically used when `NODE_ENV=development` and `TELEGRAM_LOCAL_API=true`

### Deployment
- Railway platform deployment configured
- Environment variables: `DATABASE_URL`, `PORT`
- TypeScript compilation to `dist/` directory

## Key Technical Requirements

Based on SPEC.md, this project will implement:
- Telegram bot messaging integration
- OpenAI API for natural language processing
- Default expense categories (Food & Drinks, Transportation, Shopping, etc.)
- User management via Telegram user IDs
- Monthly spending summaries and categorization

## Development Guidelines

### Natural Language Processing
**CRITICAL: Always leverage the LLM (OpenAI API) for all natural language parsing tasks.** 
- Never implement manual string parsing or regex-based logic for understanding user input
- Use the LLM to interpret time ranges, expense amounts, categories, and any other natural language input
- The LLM should handle date calculations, time period understanding, and contextual interpretation
- Update the LLM prompt to handle new types of user requests rather than writing custom parsing logic

## Timezone Configuration

The application defaults to **Pacific Standard Time (PST)** for all user interactions and date displays. This means:
- All user date inputs are interpreted as PST
- Displayed dates and times are shown in PST
- Database storage uses UTC for consistency
- Timezone conversion is handled automatically by the `src/utils/timezone.ts` module

## Environment Variables

Required for full functionality:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (defaults to 3000)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token for authentication
- `OPENAI_API_KEY` - OpenAI API access
- `OPENAI_MODEL` - OpenAI model selection (e.g., "gpt-4o-mini", "gpt-4o")

For local development with local Telegram Bot API:
- `TELEGRAM_API_ID` - Telegram API ID from https://my.telegram.org
- `TELEGRAM_API_HASH` - Telegram API Hash from https://my.telegram.org
- `NODE_ENV=development` - Enables development mode
- `TELEGRAM_LOCAL_API=true` - Uses local Telegram Bot API instance