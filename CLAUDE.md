# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an expense tracker RCS messaging service built with Express.js and TypeScript. The service uses Twilio for RCS messaging and LLM integration to parse natural language expense messages and automatically categorize spending. The application connects to PostgreSQL via Drizzle ORM and is designed for deployment on Railway.

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
- **src/index.ts**: Main Express server entry point with basic database connectivity test
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
- Twilio RCS messaging integration
- OpenAI API for natural language processing
- Default expense categories (Food & Drinks, Transportation, Shopping, etc.)
- User management via phone numbers
- Monthly spending summaries and categorization

## Environment Variables

Required for full functionality:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (defaults to 3000)
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio authentication token
- `TWILIO_PHONE_NUMBER` - Twilio phone number for sending messages
- `OPENAI_API_KEY` - OpenAI API access
- `OPENAI_MODEL` - OpenAI model selection (e.g., "gpt-3.5-turbo", "gpt-4")