# DeskFlow — Support Ticket Triage Board

A MERN stack support ticket system with Kanban board, SLA tracking, and real-time status transitions.

## Stack
- **Backend**: Node.js + Express + MongoDB (Mongoose)
- **Frontend**: Next.js 14 + Tailwind CSS + @hello-pangea/dnd

## Features
- ✅ Kanban board with 4 columns (Open, In Progress, Resolved, Closed)
- ✅ Drag-and-drop ticket movement with transition validation
- ✅ SLA tracking per priority (urgent=1h, high=4h, medium=24h, low=72h)
- ✅ Derived fields: `ageMinutes`, `slaBreached`
- ✅ Status transition rules enforced server-side
- ✅ Priority + SLA-breached filters (combinable)
- ✅ Stats strip with live counts
- ✅ Create ticket modal
- ✅ Auto-refresh every 30 seconds

## Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env    # Add your MONGO_URI
npm run dev             # Starts on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
# .env.local already has NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev             # Starts on http://localhost:3000
```

## API Endpoints

| Method | Endpoint         | Description                          |
|--------|-----------------|--------------------------------------|
| POST   | /tickets         | Create a ticket                      |
| GET    | /tickets         | List (filter: ?status ?priority ?breached=true) |
| PATCH  | /tickets/:id     | Update status (validates transitions)|
| DELETE | /tickets/:id     | Delete a ticket                      |
| GET    | /tickets/stats   | Aggregate stats per status/priority  |

## Deployment
- **Frontend**: Vercel — set `NEXT_PUBLIC_API_URL` to your backend URL
- **Backend**: Render/Railway — set `MONGO_URI` environment variable
