# GT Smart Scheduler (SyncAI)

An intelligent meeting orchestrator designed to solve the core challenges of modern scheduling: human availability, resource logistics, and contextual awareness.

## The Problem: Scheduling is Broken

Finding a time to meet is hard, but finding a time *and* a place is nearly impossible. Traditional scheduling tools fail because they don't account for the real-world problems that waste dozens of hours per week.

This project is built to solve three core pillars of scheduling failure:

1. **The 'Human' Problem:** The "calendar chaos" of managing fragmented schedules, converting time zones, and trying to balance required vs. optional attendees.
2. **The 'Smart' Problem:** Dumb tools lack contextual awareness. They treat a critical client meeting and a low-priority 1:1 as equal, leading to endless rescheduling loops when a key person declines.
3. **The 'Physical' Problem:** The constant "battle for a room" — including "phantom meetings" where booked rooms sit empty and equipment mismatches (e.g., no projector) that fail a meeting before it starts.

## Our Solution: The Intelligent Orchestrator

`gt-smart-scheduler` moves beyond simple booking to become an intelligent orchestrator. It uses a contextual AI agent to find the *best* time for everyone, not just the *first* time.

### Key Features

* **Contextual AI Agent:** An intelligent agent that understands the *priority* and *context* of a meeting. It can differentiate between a high-priority client call and a low-priority internal sync, preventing critical meetings from being derailed.
* **Proactive Slot Finding:** Instead of just showing you a wall of conflicting calendars, the scheduler proactively finds and suggests the optimal slots that work for all attendees.
* **Smart Room Management:** Actively manages physical resources. The system can release "phantom" (no-show) meeting rooms back into the pool and ensure a booked room actually has the equipment (projector, whiteboard, etc.) needed for a successful meeting.

## Technologies Used

* **Frontend:** React, TypeScript, SCSS  
* **Backend:** Node.js, Express  
* **Database:** PostgreSQL, MongoDB  
* **AI/ML:** Google Vertex AI, Gemini API, and contextual embeddings for user–intent understanding and meeting optimization  
* **Deployment:** Vercel, Heroku, AWS  

## Getting Started

Instructions to get a local copy up and running.

### Prerequisites

* [Node.js](https://nodejs.org/) (v18.x or later)
* [Yarn](https://yarnpkg.com/) (or `npm`)
* [PostgreSQL](https://www.postgresql.org/) (or other database)

### Installation

1. **Clone the repository:**
    ```bash
    git clone https://github.com/jeevanreji/gt-smart-scheduler.git
    cd gt-smart-scheduler
    ```

2. **Install Frontend Dependencies:**
    ```bash
    # Navigate to your client/frontend directory
    cd client
    yarn install
    ```

3. **Install Backend Dependencies:**
    ```bash
    # Navigate to your server/backend directory
    cd server
    pip install -r requirements.txt
    # or npm install
    ```

### Environment Configuration & API Keys

To enable AI and contextual automation features, you **must** include your API keys in the `.env` file.

Create a `.env` file in the `server` directory:

```ini
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/scheduler_db"
SECRET_KEY="your_secret_key_here"

# --- AI/ML Integrations ---
GOOGLE_VERTEX_PROJECT_ID="your_google_project_id"
VERTEX_API_KEY="your_vertex_ai_api_key"
GEMINI_API_KEY="your_gemini_api_key"

# Optional: if you use additional services
MAPS_API_KEY="your_google_maps_api_key"
CALENDAR_API_KEY="your_google_calendar_api_key"
