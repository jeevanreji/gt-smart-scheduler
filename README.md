# GT Smart Scheduler (SyncAI)

An intelligent meeting orchestrator designed to solve the core challenges of modern scheduling: human availability, resource logistics, and contextual awareness.

## The Problem: Scheduling is Broken

[cite_start]Finding a time to meet is hard, but finding a time *and* a place is nearly impossible. Traditional scheduling tools fail because they don't account for the real-world problems that waste dozens of hours per week.

This project is built to solve three core pillars of scheduling failure:

1.  [cite_start]**The 'Human' Problem:** The "calendar chaos" of managing fragmented schedules, converting time zones, and trying to balance required vs. optional attendees.
2.  [cite_start]**The 'Smart' Problem:** Dumb tools lack contextual awareness. [cite_start]They treat a critical client meeting and a low-priority 1:1 as equal, leading to endless rescheduling loops when a key person declines.
3.  [cite_start]**The 'Physical' Problem:** The constant "battle for a room". [cite_start]This includes "phantom meetings" where booked rooms sit empty, and equipment mismatches (e.g., no projector) that fail a meeting before it starts.

## Our Solution: The Intelligent Orchestrator

`gt-smart-scheduler` moves beyond simple booking to become an intelligent orchestrator. It uses a contextual AI agent to find the *best* time for everyone, not just the *first* time.

### Key Features

* **Contextual AI Agent:** An intelligent agent that understands the *priority* and *context* of a meeting. [cite_start]It can differentiate between a high-priority client call and a low-priority internal sync, preventing critical meetings from being derailed.
* [cite_start]**Proactive Slot Finding:** Instead of just showing you a wall of conflicting calendars, the scheduler proactively finds and suggests the optimal slots that work for all attendees.
* **Smart Room Management:** Actively manages physical resources. [cite_start]The system can release "phantom" (no-show) meeting rooms back into the pool and ensure a booked room actually has the equipment (projector, whiteboard, etc.) you need for a successful meeting.

## Technologies Used

*(You can fill this part in based on your project)*

* **Frontend:** React, TypeScript, SCSS
* **Backend:** Node.js, Express
* **Database:** PostgreSQL, MongoDB
* **AI/ML:** * **Deployment:** Vercel, Heroku, AWS

## Getting Started

Instructions to get a local copy up and running.

### Prerequisites

* [Node.js](https://nodejs.org/) (v18.x or later)
* [Yarn](https://yarnpkg.com/) (or `npm`)
* [PostgreSQL](https://www.postgresql.org/) (or other database)

### Installation

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/jeevanreji/gt-smart-scheduler.git](https://github.com/jeevanreji/gt-smart-scheduler.git)
    cd gt-smart-scheduler
    ```

2.  **Install Frontend Dependencies:**
    ```sh
    # Navigate to your client/frontend directory
    cd client
    yarn install
    ```

3.  **Install Backend Dependencies:**
    ```sh
    # Navigate to your server/backend directory
    cd server
    pip install -r requirements.txt 
    # or npm install
    ```

4.  **Set up Environment Variables:**
    Create a `.env` file in the `server` directory.
    ```ini
    # .env
    DATABASE_URL="postgresql://user:password@localhost:5432/scheduler_db"
    SECRET_KEY="your_secret_key_here"
    ```

5.  **Run the Database Migrations:**
    ```sh
    cd server
    python manage.py migrate
    ```

### Running the Application

1.  **Start the Backend Server:**
    ```sh
    # From the /server directory
    python manage.py runserver
    ```

2.  **Start the Frontend App:**
    ```sh
    # From the /client directory
    yarn start
    ```
    Your application should now be running on `http://localhost:3000`.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.