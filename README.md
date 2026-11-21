# Card-Perks
Open, community-maintained catalog of credit card benefits & eligibility

## Tech Stack
- **Frontend** — React + Vite (`client/`)
- **Backend** — Node.js + Express (`server/`)
- **Database** — MongoDB + Mongoose

## Prerequisites
- Node.js 18+
- npm 9+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

## Setup

### 1. Clone the repo
```bash
git clone <repo-url>
cd Card-Perks
```

### 2. Install dependencies
```bash
npm install              # root (installs concurrently)
npm run install:all      # installs client + server deps
```

### 3. Configure environment variables
```bash
cp server/.env.example server/.env
```

Open `server/.env` and fill in your values:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/card-perks
CLIENT_ORIGIN=http://localhost:5173
```

### 4. Run in development
```bash
npm run dev
```

This starts both servers concurrently:
| Service | URL |
|---------|-----|
| React client | http://localhost:5173 |
| Express API | http://localhost:5000 |

## Project Structure
```
Card-Perks/
├── client/               # Vite + React frontend
│   └── src/
├── server/               # Express backend
│   ├── config/db.js      # MongoDB connection
│   ├── controllers/      # Route handlers
│   ├── middleware/       # Custom middleware
│   ├── models/           # Mongoose schemas
│   └── routes/           # Express routers
└── package.json          # Root scripts
```
