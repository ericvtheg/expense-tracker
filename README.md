# Monstera Money Telegram Bot

A smart expense tracking Telegram bot that uses LLM to parse natural language expense messages and automatically categorize spending. Built with Express.js, TypeScript, PostgreSQL, and OpenAI API.

## Overview

Monstera Money is a Telegram bot that allows multiple users to track their expenses through natural language messages. Simply message the bot with expenses like "spent 5 bucks on coffee this morning" or "1500 flight ticket last tuesday" and it will automatically extract the amount, category, and date to store in your expense tracker.

### Key Features

- **Natural Language Processing**: Uses OpenAI API to parse expense messages in plain English
- **Automatic Categorization**: Intelligently maps expenses to predefined categories
- **Multi-User Support**: Multiple users can use the bot simultaneously with isolated data
- **Monthly Summaries**: Provides spending totals by month and category
- **Flexible Date Parsing**: Handles relative dates like "yesterday", "last Tuesday", "Dec 15"
- **Real-time Responses**: Immediate feedback with updated totals after each expense

## Architecture

### Tech Stack

- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Bot Framework**: Telegraf for Telegram Bot API
- **AI Integration**: OpenAI API for natural language processing
- **Date Handling**: date-fns with timezone support (PST default)
- **Logging**: Winston for structured logging
- **Deployment**: Railway platform

### Database Schema

- **Users**: Stores Telegram user information and maps to internal user IDs
- **Transactions**: Stores expense records with amount, category, date, and description
- **Categories**: Predefined expense categories with synonym support

### Default Categories

The bot automatically categorizes expenses into these predefined categories:

- **Food & Drinks** - coffee, restaurant, groceries, etc.
- **Transportation** - uber, gas, parking, etc.
- **Shopping** - clothes, electronics, general purchases
- **Entertainment** - movies, games, subscriptions
- **Bills & Utilities** - rent, phone, electricity
- **Healthcare** - doctor, pharmacy, insurance
- **Travel** - flights, hotels, vacation
- **Other** - fallback category

## Quick Start

### Prerequisites

- Node.js 18+ and Yarn
- PostgreSQL database
- Telegram Bot Token ([create here](https://t.me/BotFather))
- OpenAI API Key

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd expense-tracker
   yarn install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development services**:
   ```bash
   yarn services:up  # Starts PostgreSQL in Docker
   ```

4. **Run database migrations**:
   ```bash
   yarn db:migrate
   ```

5. **Start the development server**:
   ```bash
   yarn dev
   ```

### Environment Variables

Required variables for `.env`:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/monstera_money

# Server
PORT=3000

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Local Development (optional - for local Telegram Bot API)
NODE_ENV=development
TELEGRAM_LOCAL_API=true
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here
```

## Usage

### Basic Expense Tracking

Message the bot with natural language expense descriptions:

```
"spent 30 bucks on coffee this morning"
"1500 flight ticket last tuesday"
"$45.50 for groceries yesterday"
"bought lunch for $12"
"uber ride cost me 25 dollars"
```

### Bot Responses

The bot responds with confirmation and updated totals:

```
Got it! Added $30.00 under Food & Drinks category. 
Your total for January is $342.50 and Food & Drinks total is $89.30.
```

### Supported Input Formats

- **Amounts**: "30 bucks", "$30.50", "thirty dollars"
- **Dates**: "yesterday", "last Tuesday", "Dec 15", "this morning"
- **Categories**: Automatically detected from description context

## Development

### Available Scripts

```bash
# Development
yarn dev              # Start development server with nodemon
yarn services:up      # Start PostgreSQL and Telegram Bot API containers
yarn services:down    # Stop all services

# Building & Production
yarn build           # Compile TypeScript to JavaScript
yarn start           # Run compiled JavaScript from dist/

# Database
yarn db:generate     # Generate new migration files
yarn db:migrate      # Run pending migrations

# Code Quality
yarn lint           # Run ESLint with XO config
```

### Project Structure

```
src/
├── db/
│   ├── index.ts        # Database connection setup
│   └── schema.ts       # Drizzle ORM schema definitions
├── services/
│   ├── categories.ts   # Category management and mapping
│   ├── expense.ts      # Expense processing logic
│   ├── llm.ts         # OpenAI API integration
│   ├── telegram.ts    # Telegram bot client and handlers
│   └── user.ts        # User management operations
├── utils/
│   ├── logger.ts      # Winston logging configuration
│   └── timezone.ts    # PST timezone handling
└── index.ts           # Main Express server and bot initialization
```

### Local Development with Docker

The project includes Docker Compose configuration for local development:

- **PostgreSQL**: Runs on port 5432 with database `monstera_money`
- **Telegram Bot API**: Local instance on port 8081 (optional)

**Important for Telegram Local API**: To use the local Telegram Bot API instance, you need to obtain API credentials from [my.telegram.org](https://my.telegram.org):

1. Visit [my.telegram.org](https://my.telegram.org/auth) and log in with your Telegram account
2. Go to "API development tools" and create a new application
3. Copy the `api_id` and `api_hash` values
4. Add them to your `.env` file:
   ```bash
   TELEGRAM_API_ID=your_api_id_here
   TELEGRAM_API_HASH=your_api_hash_here
   TELEGRAM_LOCAL_API=true
   NODE_ENV=development
   ```

Start services with:
```bash
yarn services:up
```

**Note**: The local Telegram Bot API is optional and primarily useful for development environments where you want to avoid rate limits or test with local message handling. You can develop without it by using the standard Telegram Bot API (just omit the local API environment variables).

### Database Migrations

The application automatically runs migrations on startup. To create new migrations:

```bash
# Make changes to src/db/schema.ts
yarn db:generate  # Generate migration files
yarn db:migrate   # Apply migrations
```

## Deployment

### Railway Deployment

1. **Connect Repository**: Link your GitHub repository to Railway
2. **Set Environment Variables**: Configure all required environment variables
3. **Deploy**: Railway will automatically build and deploy

Required production environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `TELEGRAM_BOT_TOKEN` - Your bot token
- `OPENAI_API_KEY` - OpenAI API key
- `OPENAI_MODEL` - Model to use (e.g., "gpt-4o-mini")
- `PORT` - Server port (set by Railway)

### Health Checks

The application includes a health check endpoint at `/` that verifies database connectivity.

## API Integration

### OpenAI Integration

The bot uses OpenAI's API to parse natural language expense messages. The LLM is prompted to extract:

- **Amount**: Monetary value in various formats
- **Category**: Mapped to predefined categories
- **Date**: Natural language date parsing
- **Description**: Original expense description

### Telegram Bot API

Uses Telegraf framework for robust Telegram integration:

- **Message Handling**: Processes text messages for expense parsing
- **User Management**: Auto-creates users on first interaction
- **Error Handling**: Graceful responses for parsing failures

## Timezone Configuration

The application defaults to **Pacific Standard Time (PST)** for all user interactions:

- User date inputs are interpreted as PST
- Displayed dates and times are shown in PST  
- Database storage uses UTC internally
- Automatic timezone conversion via `src/utils/timezone.ts`

## Logging

Structured logging with Winston:

- **Development**: Console output with colors
- **Production**: JSON format for log aggregation
- **Log Files**: `logs/combined.log` and `logs/error.log`
- **Log Levels**: Debug, info, warn, error

## Contributing

### Code Style

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with XO configuration
- **Formatting**: Follow existing code conventions
- **Testing**: Run `yarn build` to check for compilation errors

### Development Guidelines

1. **LLM-First Approach**: Always use OpenAI API for natural language parsing
2. **No Manual Parsing**: Avoid regex or string manipulation for user input
3. **Category Mapping**: Use LLM to map descriptions to predefined categories
4. **Error Handling**: Graceful degradation with helpful user messages
5. **Security**: Never log or expose API keys or sensitive data

### Creating New Features

1. Update database schema if needed (`src/db/schema.ts`)
2. Create/update service modules in `src/services/`
3. Add comprehensive error handling
4. Update LLM prompts for new functionality
5. Test with various input formats
6. Update documentation

## Troubleshooting

### Common Issues

**Bot not responding**:
- Check `TELEGRAM_BOT_TOKEN` is valid
- Verify bot is running: check logs for startup messages
- Ensure database connectivity

**Database connection failed**:
- Verify `DATABASE_URL` format
- Check PostgreSQL is running (`yarn services:up`)
- Run migrations: `yarn db:migrate`

**OpenAI API errors**:
- Verify `OPENAI_API_KEY` is valid
- Check API quota and billing
- Try different `OPENAI_MODEL` values

**Local development issues**:
- Use `yarn` not `npm` for package management
- Ensure Docker is running for services
- Check port conflicts (3000, 5432, 8081)

### Debugging

Enable debug logging by setting log level in `src/utils/logger.ts` or check:
- `logs/combined.log` - All application logs  
- `logs/error.log` - Error-level logs only
- Console output in development mode

## License

MIT License - see LICENSE file for details.

## Support

For issues and feature requests, please open an issue on the GitHub repository.
