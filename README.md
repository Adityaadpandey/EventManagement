# 🎫 Tixin.in - Event Management Platform

[![Build Status](https://github.com/Adityaadpandey/EventManagement/actions/workflows/stag-build-deploy.yml/badge.svg)](https://github.com/Adityaadpandey/EventManagement/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-≥18-green?logo=node.js)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?logo=redis)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **A production-grade event-ticketing and management platform that handles the complete lifecycle of events—from listing to ticket sales, payments, refunds, and lister payouts.**

Tixin.in is not just another "BookMyShow-lite"—it's a systems experiment that actually ships. Built with enterprise-grade infrastructure, robust CI/CD pipelines, and production-ready architecture, this platform orchestrates the messy reality of real-world events: traffic spikes, payment webhooks, analytics dashboards, and financial reconciliation.

---

## 📑 Table of Contents

- [Demo](#-demo)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Docker Deployment](#-docker-deployment)
- [Kubernetes Deployment](#-kubernetes-deployment)
- [Project Structure](#-project-structure)
- [Development Guide](#-development-guide)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [FAQ](#-faq)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Code of Conduct](#-code-of-conduct)
- [Security](#-security)
- [Changelog](#-changelog)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)
- [Support](#-support)

---

## 🎬 Demo

| Platform      | Link                                 |
| ------------- | ------------------------------------ |
| 🌐 Production | [tixin.in](https://tixin.in)         |
| 📱 Mobile App | Available via Expo                   |
| 📚 API Docs   | Bruno Collection (see `/docs/bruno`) |

---

## ✨ Features

### Core Platform Features

| Feature                    | Description                                            |
| -------------------------- | ------------------------------------------------------ |
| **🎟️ Event Ticketing**     | Complete ticket purchase flow with payment integration |
| **📊 Lister Analytics**    | Dashboard with real-time metrics for event organizers  |
| **💰 Payout System**       | Automated payouts with ledger-based accounting         |
| **🔄 Refund Management**   | Request → Admin approval → Processing workflow         |
| **🗺️ Geolocation Events**  | Local events within 300km radius, global discovery     |
| **👥 Attendee Management** | Listers can view and manage ticket holders             |

### Technical Excellence

| Area                  | Implementation                               |
| --------------------- | -------------------------------------------- |
| **🏗️ Infrastructure** | Docker, k3s (Kubernetes), Terraform          |
| **🔄 CI/CD Pipeline** | GitHub Actions with staging/production flows |
| **📈 Monitoring**     | New Relic APM integration                    |
| **🔐 Security**       | JWT authentication, container hardening      |
| **📦 Caching**        | Redis for sessions and event data            |
| **🗃️ Database**       | PostgreSQL with Prisma ORM                   |

### Role-Based Access Control

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ROLES                                │
├─────────────────────────────────────────────────────────────┤
│  USER         → Browse events, purchase tickets              │
│               → Apply to become LISTER                       │
├─────────────────────────────────────────────────────────────┤
│  LISTER       → Create and manage events                     │
│               → View analytics dashboard                     │
│               → Manage bank details                          │
│               → Request payouts                              │
├─────────────────────────────────────────────────────────────┤
│  ADMIN        → Process refunds                              │
│  SUPER_ADMIN  → Approve payouts                              │
│               → Approve lister applications                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Languages & Frameworks

| Technology                                                                                        | Purpose             |
| ------------------------------------------------------------------------------------------------- | ------------------- |
| ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white) | Primary language    |
| ![Node.js](https://img.shields.io/badge/Node.js-≥18-339933?logo=node.js&logoColor=white)          | Runtime environment |
| ![Express](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white)       | Backend framework   |
| ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)                 | Web frontend        |
| ![React Native](https://img.shields.io/badge/React_Native-Expo-61DAFB?logo=react&logoColor=black) | Mobile app          |
| ![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)           | Web framework       |

### Infrastructure & DevOps

| Technology                                                                                             | Purpose                 |
| ------------------------------------------------------------------------------------------------------ | ----------------------- |
| ![Docker](https://img.shields.io/badge/Docker-Containers-2496ED?logo=docker&logoColor=white)           | Containerization        |
| ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?logo=postgresql&logoColor=white) | Primary database        |
| ![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?logo=redis&logoColor=white)                   | Caching & sessions      |
| ![k3s](https://img.shields.io/badge/k3s-Kubernetes-326CE5?logo=kubernetes&logoColor=white)             | Container orchestration |
| ![Terraform](https://img.shields.io/badge/Terraform-IaC-7B42BC?logo=terraform&logoColor=white)         | Infrastructure as Code  |
| ![AWS](https://img.shields.io/badge/AWS-Cloud-232F3E?logo=amazon-aws&logoColor=white)                  | Cloud provider          |

### Monitoring & Quality

| Technology                                                                                                      | Purpose                |
| --------------------------------------------------------------------------------------------------------------- | ---------------------- |
| ![New Relic](https://img.shields.io/badge/New_Relic-APM-008C99?logo=newrelic&logoColor=white)                   | Application monitoring |
| ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI/CD-2088FF?logo=github-actions&logoColor=white) | Automation             |
| ![Biome](https://img.shields.io/badge/Biome-Linter-60A5FA?logo=biome&logoColor=white)                           | Code quality           |
| ![Prettier](https://img.shields.io/badge/Prettier-Formatting-F7B93E?logo=prettier&logoColor=black)              | Code formatting        |

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│   📱 Native     │   🌐 Web        │   🔧 Admin      │   📊 Analytics        │
│   (Expo/RN)     │   (Next.js)     │   Panel         │   Dashboard           │
└────────┬────────┴────────┬────────┴────────┬────────┴───────────┬───────────┘
         │                 │                 │                     │
         └─────────────────┴─────────────────┴─────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                     │
│                         (api.tixin.in:443)                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND SERVICES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    User Server (Express.js)                          │   │
│  │                         Port 7001                                    │   │
│  │  ┌──────────────┬──────────────┬──────────────┬──────────────────┐  │   │
│  │  │ Auth Module  │ Event Module │ Payment      │ Payout Module    │  │   │
│  │  │ (JWT)        │              │ Module       │                  │  │   │
│  │  └──────────────┴──────────────┴──────────────┴──────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Background Worker                                 │   │
│  │              (Same image, separate container)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│     PostgreSQL      │ │       Redis         │ │  External Services  │
│  (Prisma ORM)       │ │  (Cache/Sessions)   │ │  (Payment Gateway)  │
│                     │ │                     │ │  (New Relic)        │
│  - Users            │ │  - Session data     │ │  (Telegram)         │
│  - Events           │ │  - Global events    │ │                     │
│  - Tickets          │ │  - Local events     │ │                     │
│  - Ledger           │ │    (300km radius)   │ │                     │
│  - Payouts          │ │  - Event details    │ │                     │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

### Data Flow Diagrams

#### Ticket Purchase Flow

```
┌──────┐     ┌────────────┐     ┌─────────────┐     ┌──────────────┐
│ User │────▶│ Select     │────▶│ Create      │────▶│ Payment      │
│      │     │ Event      │     │ Payment     │     │ Processing   │
└──────┘     └────────────┘     └─────────────┘     └──────┬───────┘
                                                          │
                                                          ▼
┌──────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Lister Account   │◀────│ Ticket Status   │◀────│ Payment Webhook │
│ Credited         │     │ Updated         │     │ Received        │
└──────────────────┘     └─────────────────┘     └─────────────────┘
```

#### Payout Flow

```
┌────────┐     ┌────────────┐     ┌─────────────┐     ┌──────────────┐
│ Lister │────▶│ Request    │────▶│ Admin       │────▶│ DEBIT Ledger │
│        │     │ Payout     │     │ Approves    │     │ Entry        │
└────────┘     └────────────┘     └─────────────┘     └──────┬───────┘
                                                             │
                                                             ▼
     ┌────────────────┐     ┌─────────────────┐     ┌─────────────────┐
     │ SUCCESS/FAILED │◀────│ Bank Transfer   │◀────│ Status:         │
     │                │     │ Initiated       │     │ PROCESSING      │
     └────────────────┘     └─────────────────┘     └─────────────────┘
```

### Caching Strategy

| Cache Type        | Purpose                     | TTL          |
| ----------------- | --------------------------- | ------------ |
| **Sessions**      | User authentication state   | Per session  |
| **Global Events** | Home page event listings    | Configurable |
| **Local Events**  | Geo-filtered events (300km) | Configurable |
| **Event Details** | Individual event data       | Configurable |

---

## 📋 Prerequisites

### Required Software

| Software       | Version | Installation                          |
| -------------- | ------- | ------------------------------------- |
| Node.js        | ≥18.x   | [nodejs.org](https://nodejs.org/)     |
| pnpm           | ≥8.x    | `npm install -g pnpm`                 |
| Docker         | ≥20.x   | [docker.com](https://www.docker.com/) |
| Docker Compose | ≥2.x    | Included with Docker Desktop          |
| Git            | ≥2.x    | [git-scm.com](https://git-scm.com/)   |

### Optional (for Kubernetes deployment)

| Software  | Version | Installation                                             |
| --------- | ------- | -------------------------------------------------------- |
| kubectl   | Latest  | [kubernetes.io](https://kubernetes.io/docs/tasks/tools/) |
| k3s       | Latest  | [k3s.io](https://k3s.io/)                                |
| Terraform | ≥1.x    | [terraform.io](https://www.terraform.io/)                |

### System Requirements

| Resource | Minimum | Recommended |
| -------- | ------- | ----------- |
| RAM      | 4 GB    | 8 GB        |
| CPU      | 2 cores | 4 cores     |
| Storage  | 20 GB   | 50 GB       |

---

## 🚀 Installation

### Method 1: Quick Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/Adityaadpandey/EventManagement.git
cd EventManagement

# Run automated setup
make setup
```

This command will:

1. Start Docker containers (PostgreSQL, Redis)
2. Install all dependencies
3. Build shared packages
4. Push Prisma schema to database

### Method 2: Manual Installation

```bash
# Clone the repository
git clone https://github.com/Adityaadpandey/EventManagement.git
cd EventManagement

# Start infrastructure services
docker compose up -d

# Install dependencies
pnpm install

# Build shared packages
pnpm build:packages

# Setup database
cd packages/database


---

<h2 align="center"> Made with ❤️ using <strong>NOVA</strong><br> by <a href="https://adpandey.com">Aditya</a> </h2>



docker run -it --rm -v "$(pwd)/letsencrypt/conf:/etc/letsencrypt" -v "$(pwd)/letsencrypt/www:/var/www/certbot" certbot/certbot certonly --webroot -w /var/www/certbot -d api.tixin.in --email adityapandeyadp@gmail.com --agree-tos --no-eff-email
