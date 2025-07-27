# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an expense tracker Discord bot built with Express.js and TypeScript. The service uses Discord.js for bot messaging and LLM integration to parse natural language expense messages and automatically categorize spending. The application connects to PostgreSQL via Drizzle ORM and is designed for deployment on Railway.

## Development Commands

### Local Development
- `yarn dev` - Start development server with nodemon
- `yarn build` - Compile TypeScript to JavaScript 
- `yarn start` - Run compiled JavaScript from dist/

### Database Management
- `yarn db:up` - Start PostgreSQL container via Docker Compose
- `yarn db:down` - Stop PostgreSQL container

### Code Quality
- Use ESLint with XO config for linting
- TypeScript compilation with strict settings

## Architecture

### Core Components
- **src/index.ts**: Main Express server entry point with Discord bot initialization
- **src/services/discord.ts**: Discord bot client and messaging functionality
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Environment**: dotenv for configuration management

### Database Setup
- PostgreSQL runs in Docker container (expense-tracker-postgres)
- Default database: `expense_tracker`
- Connection via `DATABASE_URL` environment variable
- Health checks enabled for container reliability

### Deployment
- Railway platform deployment configured
- Environment variables: `DATABASE_URL`, `PORT`
- TypeScript compilation to `dist/` directory

## Key Technical Requirements

Based on SPEC.md, this project will implement:
- Discord bot messaging integration
- OpenAI API for natural language processing
- Default expense categories (Food & Drinks, Transportation, Shopping, etc.)
- User management via Discord user IDs
- Monthly spending summaries and categorization

## Environment Variables

Required for full functionality:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (defaults to 3000)
- `DISCORD_BOT_TOKEN` - Discord bot token for authentication
- `OPENAI_API_KEY` - OpenAI API access
- `OPENAI_MODEL` - OpenAI model selection (e.g., "gpt-3.5-turbo", "gpt-4")