# Monstera Money Telegram Bot - Technical Specification

## Overview
Express.js server with Telegram bot integration that uses LLM to parse natural language expense messages and track spending by category.

## Core Features
- Telegram bot that multiple users can message simultaneously
- LLM parses natural language expense messages (amount, category, optional date)
- Automatic expense categorization and monthly spending summaries
- Architecture allows future messaging platform integration (SMS, WhatsApp, etc.)

## User Flow
1. User messages bot: "spent 30 bucks on coffee this morning" or "1500 flight ticket last tuesday"
2. LLM extracts: amount, category, date (if provided, otherwise current date)
3. Bot responds: "Got it! Added $30 under Food/Drinks category. Your total for December is $342 and Food/Drinks total is $89."
4. If LLM can't parse: respond "I don't understand, please try again"

## Technical Requirements

### Tech Stack
- Express.js + TypeScript
- PostgreSQL database
- Telegram Bot API
- OpenAI API (configurable model via env var)

### Database Design
- Auto-create users on first Telegram message
- Map Telegram user IDs to internal user IDs (for future platform flexibility)
- Store transactions with: amount, category, date, description, user_id, created_at
- Allow manual date entry via natural language ("last Tuesday", "yesterday", "Dec 15")

### Default Categories (case-insensitive, synonym-aware)
- **Food & Drinks** (coffee, restaurant, groceries, etc.)
- **Transportation** (uber, gas, parking, etc.)
- **Shopping** (clothes, electronics, general purchases)
- **Entertainment** (movies, games, subscriptions)
- **Bills & Utilities** (rent, phone, electricity)
- **Healthcare** (doctor, pharmacy, insurance)
- **Travel** (flights, hotels, vacation)
- **Other** (fallback category)

### LLM Integration
- Parse natural language for amount, category, and optional date
- Handle typos and varied input formats ("30 bucks", "$30.50", "thirty dollars")
- Map user descriptions to default categories using synonyms
- No custom categories allowed - must use defaults only

### Environment Variables
- `TELEGRAM_BOT_TOKEN`
- `OPENAI_API_KEY` 
- `OPENAI_MODEL` (e.g., "gpt-4")
- `DATABASE_URL`

### Key Behaviors
- Monthly totals calculated from calendar month
- Natural language date parsing (relative dates like "yesterday", "last week")
- Case-insensitive category matching with synonym recognition
- Simple error handling (basic "try again" responses)

## Notes
This is an MVP - focus on core functionality over comprehensive error handling.
