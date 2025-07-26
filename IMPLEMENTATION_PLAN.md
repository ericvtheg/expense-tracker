# Expense Tracker Telegram Bot - Implementation Plan

## Phase 1: Project Setup & Dependencies

### 1.1 Install Required Dependencies
- [ ] Install Telegram Bot API library: `node-telegram-bot-api`
- [ ] Install OpenAI SDK: `openai`
- [ ] Install date parsing library: `date-fns` or `moment`
- [ ] Install Drizzle migrations: `drizzle-kit`
- [ ] Update type definitions for new dependencies

### 1.2 Environment Configuration
- [ ] Update `.env.example` with new required variables:
  - `TELEGRAM_BOT_TOKEN`
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
- [ ] Update CLAUDE.md with new environment variables

## Phase 2: Database Schema Design

### 2.1 Create Database Schema Files
- [ ] Create `src/db/schema.ts` with Drizzle schema definitions:
  - `users` table (id, telegram_user_id, created_at, updated_at)
  - `transactions` table (id, user_id, amount, category, date, description, created_at)
  - `categories` table (id, name, synonyms)

### 2.2 Database Migrations
- [ ] Set up Drizzle migration configuration
- [ ] Create initial migration files
- [ ] Add migration scripts to package.json
- [ ] Seed default categories data

## Phase 3: Core Services Architecture

### 3.1 Database Service Layer
- [ ] Create `src/services/database.ts` with connection setup
- [ ] Create `src/services/userService.ts` for user operations:
  - `findOrCreateUser(telegramUserId)`
  - `getUserById(id)`
- [ ] Create `src/services/transactionService.ts` for transaction operations:
  - `createTransaction(userId, amount, category, date, description)`
  - `getMonthlyTotal(userId, month, year)`
  - `getCategoryTotal(userId, category, month, year)`

### 3.2 Category Service
- [ ] Create `src/services/categoryService.ts`:
  - `getDefaultCategories()`
  - `mapDescriptionToCategory(description)` with synonym matching
  - `validateCategory(category)`

### 3.3 LLM Integration Service
- [ ] Create `src/services/llmService.ts`:
  - `parseExpenseMessage(message)` returns `{amount, category, date, description}`
  - Handle various input formats and currencies
  - Natural language date parsing
  - Error handling for unparseable messages

### 3.4 Date Parsing Service
- [ ] Create `src/services/dateService.ts`:
  - `parseNaturalLanguageDate(dateString)` 
  - Handle "yesterday", "last Tuesday", "Dec 15", etc.
  - Default to current date if no date provided

## Phase 4: Telegram Bot Implementation

### 4.1 Bot Setup and Configuration
- [ ] Create `src/services/telegramBot.ts`:
  - Initialize bot with token
  - Set up webhook or polling
  - Basic message handling structure

### 4.2 Message Processing Pipeline
- [ ] Implement main message handler:
  - Extract user info and message text
  - Call LLM service to parse expense
  - Create/update user in database
  - Store transaction in database
  - Generate response with totals
  - Handle parsing errors gracefully

### 4.3 Response Generation
- [ ] Create response formatting functions:
  - Success response with category and totals
  - Error response for unparseable messages
  - Monthly summary formatting

## Phase 5: API Integration & Testing

### 5.1 OpenAI Integration
- [ ] Implement OpenAI API client setup
- [ ] Design and test expense parsing prompts
- [ ] Add retry logic and error handling
- [ ] Test with various expense message formats

### 5.2 Database Integration Testing
- [ ] Test user creation and retrieval
- [ ] Test transaction storage and retrieval
- [ ] Test monthly and category total calculations
- [ ] Verify date parsing accuracy

## Phase 6: Bot Logic & Business Rules

### 6.1 Expense Processing Logic
- [ ] Implement complete expense processing flow:
  - Parse message → Extract data → Store transaction → Calculate totals → Respond
- [ ] Add validation for amounts (positive numbers only)
- [ ] Handle edge cases (very large amounts, unusual formats)

### 6.2 Monthly Calculation Logic
- [ ] Implement calendar month calculation
- [ ] Test month boundary conditions
- [ ] Add timezone considerations if needed

### 6.3 Error Handling & Fallbacks
- [ ] Handle LLM API failures gracefully
- [ ] Handle database connection issues
- [ ] Provide helpful error messages to users
- [ ] Log errors for debugging

## Phase 7: Integration & Server Setup

### 7.1 Express Server Integration
- [ ] Update `src/index.ts` to include bot initialization
- [ ] Add health check endpoint
- [ ] Add webhook endpoint for Telegram (if using webhooks)
- [ ] Ensure proper startup sequence

### 7.2 Environment & Deployment
- [ ] Test with Railway deployment
- [ ] Verify all environment variables are properly configured
- [ ] Test database connectivity in production environment
- [ ] Set up proper logging for production

## Phase 8: Testing & Validation

### 8.1 Unit Testing
- [ ] Test LLM parsing service with various inputs
- [ ] Test category mapping and synonym recognition
- [ ] Test date parsing edge cases
- [ ] Test database operations

### 8.2 Integration Testing
- [ ] Test complete user flow end-to-end
- [ ] Test multi-user scenarios
- [ ] Test monthly calculations across different months
- [ ] Verify response formatting

### 8.3 Bot Testing
- [ ] Test with real Telegram bot
- [ ] Verify webhook/polling functionality
- [ ] Test error scenarios (invalid messages, API failures)
- [ ] Performance testing with multiple concurrent users

## Phase 9: Documentation & Deployment

### 9.1 Documentation Updates
- [ ] Update README.md with setup instructions
- [ ] Document environment variable requirements
- [ ] Add example usage and bot commands
- [ ] Update CLAUDE.md with new architecture details

### 9.2 Final Deployment
- [ ] Deploy to production environment
- [ ] Configure monitoring and logging
- [ ] Test production bot functionality
- [ ] Set up backup and recovery procedures

## Implementation Notes

### Key Dependencies to Add
```bash
yarn add node-telegram-bot-api openai date-fns drizzle-kit
yarn add -D @types/node-telegram-bot-api
```

### Database Migration Commands (to add to package.json)
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "ts-node src/scripts/seed.ts"
  }
}
```

### Critical Success Factors
1. **LLM Prompt Engineering**: Design robust prompts that consistently extract amount, category, and date
2. **Category Mapping**: Implement comprehensive synonym matching for natural language categories
3. **Date Parsing**: Handle various natural language date formats accurately
4. **Error Handling**: Graceful degradation when services fail
5. **Multi-user Support**: Ensure proper user isolation and data integrity

### Testing Priorities
1. LLM parsing accuracy with diverse input formats
2. Category classification and synonym matching
3. Monthly calculation accuracy
4. Multi-user data isolation
5. Error handling and recovery scenarios