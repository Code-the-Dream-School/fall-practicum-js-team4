# Project Name

Short, clear description of what this application does and who it’s for.  
(1–2 sentences max.)

**Example:**  
A full-stack web application with a React frontend and a Node/Express backend that allows users to create, manage, and track data stored in a database.

## 🚀 Live Demo

- **Frontend Live Site:** https://your-frontend-url.com
- **Frontend Repo:** /frontend
- **Backend Repo:** /backend

## 🧠 Problem Statement

What problem does this project solve?

- Who is this application for?
- What pain point does it address?
- Why does this solution matter?

Focus on the **user problem**, not the technology.

## 🎯 Features

- User authentication (register, login, logout)
- CRUD operations for core resources
- Protected routes and authorization
- Responsive UI (mobile & desktop)
- Form validation and error handling
- RESTful API integration

## 📸 Screenshots

Add screenshots or GIFs of key features here.

## 🛠 Tech Stack

### Frontend

- React + TypeScript
- Vite
- React Router
- React Hook Form

### Backend

- Node.js + Express (REST API), written in TypeScript
- Authentication: email/password, with a JWT in an httpOnly cookie
- Validation: Joi
- API docs: Swagger UI (OpenAPI)

### Database

- PostgreSQL with Prisma ORM (local Postgres or Neon)

### Tooling

- Git & GitHub
- dotenv (environment variables)
- ESLint / Prettier / TypeScript type checking
- Jest + Supertest (backend tests)

## 📁 Project Structure

```text
project-root/
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   └── package.json
│
├── backend/
│   ├── docs/openapi.yaml    # API spec served at /api/docs
│   ├── prisma/
│   │   ├── schema.prisma    # database models
│   │   └── migrations/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/      # requireAuth, validation, error handling
│   │   ├── routes/
│   │   ├── services/        # business logic and database access
│   │   ├── utils/
│   │   ├── validators/      # Joi request schemas
│   │   ├── types/           # adds req.user to Express's Request type
│   │   ├── app.ts
│   │   └── server.ts
│   ├── test/                # Jest + Supertest (TypeScript)
│   └── package.json
│
├── docs/
│   └── auth.md              # authentication API contract
└── README.md
```

## ⚙️ Setup & Installation

### Prerequisites

- Node.js (v24 LTS recommended)
- npm or yarn
- PostgreSQL: installed locally, or a free hosted database on Neon (see below)

### Backend Setup

Create a `.env` file inside the `backend` folder by copying `backend/.env.example`
and filling in `DATABASE_URL` and `JWT_SECRET`. Then:

```bash
cd backend
npm install
npm run db:migrate   # create/update the database tables
npm run dev
```

Backend runs on:  
http://localhost:8080

#### Using a hosted database (Neon) instead of local Postgres

1. Sign up at [neon.tech](https://neon.tech) (free, no credit card) and create a project.
2. In the project dashboard click **Connect**, turn **Connection pooling off**, and copy
   the connection string.
3. In `backend/.env`, comment out the local `DATABASE_URL` and set it to the Neon string.
4. Create the tables on Neon, then start the server:

   ```bash
   npm run db:deploy   # applies the migrations in prisma/migrations
   npm run dev
   ```

Use `db:deploy` (not `db:migrate`) against Neon; create new migrations against your
local database. To switch back, swap the `DATABASE_URL` lines again.

Authentication (endpoints, cookies, errors) is documented in [docs/auth.md](docs/auth.md).

API docs (Swagger UI) run at http://localhost:8080/api/docs. To test in Postman,
import the spec from **Import → Link → `http://localhost:8080/api/docs/openapi.json`**.
The spec lives in [backend/docs/openapi.yaml](backend/docs/openapi.yaml); update it
when you add or change an endpoint.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:  
http://localhost:5173

## 🧪 Available Scripts

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint          # ESLint
npm run typecheck     # TypeScript, no build output
npm run format        # Prettier: rewrite files
npm run format:check  # Prettier: fail if anything is unformatted (for CI)
```

### Backend

```bash
npm run dev           # Start with auto-reload (tsx watch, runs the TypeScript directly)
npm run build         # Compile src/ to dist/
npm start             # Run the compiled app (dist/server.js)
npm test              # Run all tests (Jest)
npm run test:cov      # Run tests and print a coverage report
npm run lint          # ESLint
npm run typecheck     # TypeScript, no build output
npm run format        # Prettier: rewrite files
npm run format:check  # Prettier: fail if anything is unformatted (for CI)
npm run db:migrate    # Create/apply database migrations (development)
npm run db:deploy     # Apply existing migrations (production)
```

## ✅ Testing

Backend tests use **Jest** and **Supertest** and live in `backend/test/`. Run
them from the `backend` folder:

```bash
npm test          # all tests
npm run test:cov  # tests + coverage table (also writes backend/coverage/, gitignored)
npx jest test/auth.test.ts   # a single file
```

Tests don't need a database: Prisma is replaced with an in-memory fake.

To add a test, create `backend/test/<name>.test.ts`:

- **Endpoint:** copy [test/hello.test.ts](backend/test/hello.test.ts), which calls the
  app with Supertest, no running server needed.
- **Endpoint that needs a signed-in user or the database:** follow
  [test/auth.test.ts](backend/test/auth.test.ts). `request.agent(app)` keeps the auth
  cookie between requests.
- **Plain function:** see [test/jwt.test.ts](backend/test/jwt.test.ts).

Frontend tests use Vitest and React Testing Library: see
[frontend/README.md](frontend/README.md#-testing).

## 🔐 API Overview

Full, interactive reference: http://localhost:8080/api/docs (Swagger UI).

### Authentication

```text
POST   /api/auth/register   Create an account and sign in
POST   /api/auth/login      Sign in with email + password
PATCH  /api/auth/password   Change password (signs out other devices)
POST   /api/auth/logout     Sign out
GET    /api/auth/me         Current user (401 if signed out)
```

Sessions use an httpOnly cookie; see [docs/auth.md](docs/auth.md) for request and
response formats and error codes.

## 🤝 Team & Collaboration

### Team Members

- Name — Role
- Name — Role
- Name — Role

### Workflow

- GitHub Issues for task tracking
- Feature branches for development
- Pull Requests required for all merges
- Code reviews before merging to `main`

## 🧩 Development Process

- Agile / sprint-based workflow
- Backend API built before frontend integration
- MVP defined early
- Incremental feature development

## 📌 Known Issues / Limitations

- Limited role-based access control
- No frontend tests yet
- Performance optimizations pending

## 🛣 Future Improvements

- Add frontend tests (Vitest + React Testing Library)
- Improve security and validation
- Add caching and performance improvements
- Dockerize the application

## 🙌 Acknowledgments

- Mentors
- Instructors
- Open-source libraries and tools

## 📄 License

This project is for educational purposes only.
