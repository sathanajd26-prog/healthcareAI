# HealthcareAI — AI-Powered Healthcare Super-App & Clinical Operating System

An enterprise-grade, end-to-end AI-powered healthcare management platform and clinical operating system designed for patients, doctors, and hospital administrators.

---

## 🌟 Key Features

- **Multi-Portal Architecture**: Tailored experiences for Patients, Healthcare Providers (Doctors), and Hospital Administrators.
- **AI Clinical & Triage Assistant**: AI-powered symptom analysis, SOAP note generation, and clinical decision support.
- **Smart Appointment & Telemedicine**: Real-time scheduling, slot management, and integrated virtual consultation workflows.
- **Electronic Medical Records (EMR)**: Secure, longitudinal patient records, lab test reports, and digital prescriptions.
- **Pharmacy & Diagnostics Management**: Automated prescription fulfillment tracking and diagnostic test order management.
- **Enterprise Security & Compliance**: ABDM, FHIR R4 ready, HIPAA & DPDP alignment principles with role-based access control (RBAC).

---

## 🏗️ Architecture & Tech Stack

### Monorepo Structure
```
Hospital_app/
├── client/          # Frontend application (React + Vite + Tailwind CSS + TypeScript)
├── server/          # Backend API services (Node.js + Express + TypeScript + MongoDB)
├── docs/            # System architecture and specifications
├── package.json     # Root workspace configuration
└── README.md
```

### Technology Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, TypeScript, Mongoose (MongoDB)
- **State & Data**: REST APIs (`/api/v1/*`), JWT Authentication

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [MongoDB](https://www.mongodb.com/) (local or MongoDB Atlas connection)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sathanajd26-prog/healthcareAI.git
   cd healthcareAI
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

3. **Configure Environment Variables:**
   Copy the example environment file in `server/`:
   ```bash
   cp server/.env.example server/.env
   ```
   Update `.env` with your MongoDB URI, JWT secrets, and port configurations.

4. **Run Development Server:**
   Run both server and client concurrently from the root directory:
   ```bash
   npm run dev
   ```
   - Client runs at: `http://localhost:5173`
   - Server runs at: `http://localhost:5000`

---

## 📄 Documentation

For detailed architectural specifications, data models, and API blueprints, refer to [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 🛡️ License

This project is proprietary and confidential. All rights reserved.
