# 🤖 AI Receptionist — The Brain (Step 2)

The AI decision engine that powers your AI receptionist. 
Connects Claude API to your Supabase booking database.

## Quick Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and add your keys
cp .env.example .env
# Edit .env with your real keys (see below)

# 3. Test it — simulate a phone call in your terminal
npm run test-call
# Type "auto" for a full demo scenario

# 4. Or start the API server
npm run dev
```

## Your .env keys

```
SUPABASE_URL=        → Supabase dashboard > Settings > API > Project URL
SUPABASE_SERVICE_KEY= → Supabase dashboard > Settings > API > service_role (secret!)
ANTHROPIC_API_KEY=    → console.anthropic.com > API Keys
```

## How it works

1. Caller speaks → gets transcribed to text (Step 3 handles this)
2. Text hits the `/chat` endpoint
3. Claude reads the message + business context + conversation history
4. Claude decides: check availability? book? suggest alternative?
5. Tool executes against Supabase → result goes back to Claude
6. Claude formulates a natural spoken response
7. Response gets sent back → converted to speech (Step 3)

## API Endpoints

- `POST /chat` — Send a message: `{"message": "I need a room", "call_id": "abc123"}`
- `POST /end-call` — End conversation: `{"call_id": "abc123"}`
- `GET /status` — Health check

## Test Scenarios

**Scenario 1: Fully booked**
> "I want to book a room for tomorrow"
→ AI checks DB → tomorrow is blocked → suggests next available date

**Scenario 2: Successful booking**
> "Book me a room for next week Monday"
→ AI checks DB → rooms available → asks for name → confirms booking

**Scenario 3: Cancellation**
> "I need to cancel my reservation, name is John Smith"
→ AI finds booking → confirms cancellation
