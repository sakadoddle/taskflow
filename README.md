# TaskFlow - Project Management Tool

## Features

- **User Authentication**: Secure signup/login with NextAuth
- **Project Management**: Create, view, update, and delete projects
- **Task Mangement**: Add tasks with status (Todo/In Progress/Done) and due dates
- **Responsive UI**: Clean interface built with TailwindCSS
- **Database Integration**: PostgreSQL with Prisma ORM

## Installation

- Node.js v18+
- PostgreSQL database
- npm or yarn

### Setup Instructions

1. Clone the repository:
   ```bash
   git clone git@github.com:sakadoddle/taskflow.git
   cd taskflow
2. Install dependencies:
   ```bash
   npm i
3. Set up environment variables
    ```bash
   cp .env.example .env
    ```
    Edit .env.local with your credentials:
4. Set up database:
    ```bash
    npx prisma migrate dev --name init
5. Run the development server:
    ```bash
    npm run dev

###  Database Schema

  ```bash 

    model User {
      id             String    @id @default(uuid())
      email          String    @unique
      password       String
      name           String?
      createdAt      DateTime  @default(now())
      updatedAt      DateTime  @updatedAt
      projects       Project[]
    }

    model Project {
      id             String    @id @default(uuid())
      title          String
      description    String?
      createdAt      DateTime  @default(now())
      updatedAt      DateTime  @updatedAt
      userId         String
      user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
      tasks          Task[]
    }

    model Task {
      id             String    @id @default(uuid())
      title          String
      description    String?
      status         TaskStatus @default(TODO)
      dueDate        DateTime?
      createdAt      DateTime  @default(now())
      updatedAt      DateTime  @updatedAt
      projectId      String
      project        Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
      order          Int       @default(0)
    }

    enum TaskStatus {
      TODO
      IN_PROGRESS
      DONE
    }
    ```