# Prokip Performance Pulse (P3)

Internal Accountability & Reward Ecosystem — a gamified performance management platform.

## Tech Stack

- **Frontend:** Next.js (React)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL + Prisma ORM
- **Email:** SendGrid/SMTP (Nodemailer)

## Setup

### Backend

```bash
cd backend
cp .env.example .env    # Configure your DB and SMTP
npm install
npx prisma migrate dev  # Run migrations
npm run db:seed          # Seed default data
npm run dev              # Start dev server on :5000
```

### Default Login

- **Email:** admin@prokip.africa
- **Password:** admin123

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | Public | Login |
| GET | /api/auth/me | All | Current user |
| GET | /api/users | Admin/Lead | List users |
| POST | /api/users | Admin | Create user |
| GET | /api/users/:id | All | User details + history |
| PUT | /api/users/:id | Admin | Update user |
| GET | /api/departments | All | List departments |
| POST | /api/departments | Admin | Create department |
| GET | /api/policies | All | List policies |
| POST | /api/policies | Admin/Lead | Create policy |
| PUT | /api/policies/:id | Admin/Lead | Update policy |
| POST | /api/points | Admin/Lead | Add/deduct points |
| GET | /api/points/history/:userId | All | Point history |
| GET | /api/dashboard/admin | Admin/Lead | Admin dashboard |
| GET | /api/dashboard/member | All | Personal dashboard |
