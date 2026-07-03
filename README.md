# 🌌 AUI – Intelligent Fullstack AI Chat & Smart Routing Platform

A premium, state-of-the-art AI Chat client designed to showcase dynamic multi-model routing, seamless fallback behaviors, real-time web integrations, and high-performance design patterns. Built by **R. Gagan Surya Teja** to demonstrate advanced capabilities in modern web engineering, API orchestration, and UI/UX design.

---

## 📸 Visual Interface Showcase

Below is a curated tour of the visual experience, highlights of AUI's premium aesthetics, and reactive components.

### 1. Closeable Glassmorphic Entrance Alert & Welcome Pop-up
Upon entering, users are presented with a gorgeous blur-filtered welcome popup overlay. It highlights AUI's model density (20+ LLMs), live web search switch options, and transparent host response notifications.

![Welcome Popup](https://raw.githubusercontent.com/username/aui/main/screenshots/welcome_popup.png)

### 2. Pulsing Chat Streaming Loader & Model Indicator
While waiting for streaming responses from the API, AUI displays a custom pulsing loader. Once data begins streaming in real-time, the system displays a glowing badge reflecting the active model provider.

![Loader and Streaming Response](https://raw.githubusercontent.com/username/aui/main/screenshots/streaming.png)

### 3. Google OAuth 2.0 & Email Security Gateway
A dynamic, closeable authentication overlay modal allows guest users to securely register or log in via native Google Identity Services OAuth 2.0 or secure email/password flows.

![Login modal overlay](https://raw.githubusercontent.com/username/aui/main/screenshots/login_modal.png)

### 4. Color-Coded Conversational Folders & Pinned List
A sidebar layout containing responsive drag-and-drop actions, custom folders, color coding, and quick conversation pinning for dynamic workspace management.

![Workspace Folders](https://raw.githubusercontent.com/username/aui/main/screenshots/folders.png)

---

## 🧠 Architectural Overview & Core Engineering

### 1. Dynamic Auto-Fallback Routing Engine
AUI solves API rate-limiting (`429 Too Many Requests`) and provider outages using a custom **Smart Fallback Router** in the backend. 
- **Intelligent Classification**: Requests are routed based on token complexity and message lengths to optimal models.
- **Fail-Safe Orchestration**: If the primary model fails or is rate-limited, the router dynamically transitions to fallback providers (e.g. Gemini ➡️ Groq ➡️ OpenRouter) mid-request, guaranteeing 99.9% uptime.

### 2. Context-Aware Web Search Aggregator
Equipped with a standalone search switch in the input zone, AUI queries search APIs (Tavily, Google Search, LangSearch) dynamically, formats web snippets into markdown contexts, and feeds them to the LLM to deliver real-time factual correctness.

### 3. Dual-Mode Authentication Logic
Unauthenticated guests can immediately query the router in-memory. Clicking **Sign In / Sign Up** triggers an overlay modal where a native Google Login exchange occurs. Guest accounts are automatically created with secure hash keys on-the-fly.

---

## 🛠️ The Technical Stack

### **Frontend**
- **Framework**: React 19, Next.js 16 (App Router)
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Styling**: Vanilla CSS (Tailwind-free variables, HSL dynamic palettes, dark mode natively)
- **Parsing**: React Markdown, Rehype Highlight (Prism-theme code blocks), Remark Math (KaTeX LaTeX typesetting)

### **Backend**
- **Runtime**: Node.js, Fastify v5
- **Database ORM**: Prisma
- **Database**: SQLite (scalable file-based relations)
- **APIs**: Fetch API stream readers, SSE (Server-Sent Events) generators

---

## 🚀 Minimal Setup for Local Run

### Step 1: Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### Step 2: Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:3000` and the backend will run at `http://localhost:4000`.

---

## 👨‍💻 Author & Contact Information

Created with passion by **R. Gagan Surya Teja**.

- **Goal**: To build software that is highly responsive, visual, structurally clean, and bulletproof under high-traffic demands.
- **Let's Connect**: If you are a company looking for a software engineer who can build end-to-end architectures, optimize APIs, design dynamic interfaces, and execute clean codebases, feel free to reach out!
- **Email**: [Insert Your Email Here]
- **LinkedIn**: [Insert Your LinkedIn URL Here]
- **GitHub**: [Insert Your GitHub Profile URL Here]
