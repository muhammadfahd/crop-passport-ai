# 🌾 CropPassport AI
<img width="1672" height="941" alt="image" src="https://github.com/user-attachments/assets/549f3741-60a3-4c45-9102-42dfb7e2b506" />


### From Farm Records to Trusted Crop Stories

**CropPassport AI** is a farmer-friendly digital crop traceability platform that helps small-scale farmers document the journey of their crops and create a **Digital Crop Passport** that buyers can access through a QR code.

The goal is simple:

> **Make crop traceability simple and accessible for everyday farmers.**

---

## 🌍 The Problem

In agricultural regions such as **Dera Ghazi Khan, Pakistan**, farmers grow valuable crops, but their farming activities are often undocumented.

Information about planting, irrigation, treatments, crop progress, and harvest is rarely maintained as a structured digital record. This creates a traceability gap between the **farmer, crop, and buyer**.

Existing traceability systems can also be too complex for small farmers with limited technical experience.

---

## 💡 Our Solution

CropPassport AI gives every harvest a digital identity.

Farmers can create a harvest and gradually document its journey using simple text records, photos, and voice notes.

```text
Create Harvest
      ↓
Record Farming Activities
      ↓
Add Text, Photos & Voice
      ↓
Build Traceability Timeline
      ↓
Generate Digital Crop Passport
      ↓
Share via QR Code
      ↓
Buyer Views Crop History
````

The system is designed around one principle:

> **Technology should adapt to farmers — farmers should not have to adapt to complicated technology.**

---

## ✨ Key Features

* 🌾 **Harvest Management** — Create and manage individual crop harvests.
* 📝 **Simple Activity Logging** — Farmers can save farming records without requiring AI.
* ✨ **Optional AI Assistance** — Structure informal farmer notes into clearer traceability records.
* 📷 **Photo Evidence** — Add crop photos to document progress and activities.
* 🎙️ **Voice Notes** — Capture farming observations using voice.
* 🕐 **Traceability Timeline** — Build a chronological history of the crop journey.
* 📊 **Passport Progress** — Track the completeness of available traceability records.
* 📘 **Digital Crop Passport** — Bring crop information and farming history into one digital profile.
* 📱 **QR Code Sharing** — Connect buyers directly to the crop's digital passport.
* 🛒 **Read-Only Buyer View** — Buyers can inspect available crop history without modifying records.

---

## 🤖 Role of AI

AI is an **optional assistant**, not a requirement.

A farmer can write:

> "Today I sprayed pesticide on my mango trees because I noticed insects after yesterday's rain."

AI can help transform this into a structured activity with a category, summary, attention level, and suggested follow-up.

If AI is unavailable, the farmer can still save the original record.

AI can also generate concise traceability summaries from producer-provided records.

> CropPassport AI does not independently certify crop quality, safety, organic status, or regulatory compliance.

---

## 📘 Digital Crop Passport

Each harvest can generate a Digital Crop Passport containing available information such as:

* Unique Harvest ID
* Crop and variety information
* Farm/location details
* Planting and harvest dates
* Activity timeline
* Photo and voice evidence
* Traceability progress
* AI-generated summary
* QR code

Buyers can scan the QR code and access a **read-only view** of the crop passport.

---

## 🛠️ Tech Stack

* **Frontend:** HTML, CSS, Vanilla JavaScript
* **Backend:** Node.js, Express.js
* **AI:** OpenRouter / open-source LLM
* **Storage:** Browser localStorage (MVP)
* **Development:** Codex, Git & GitHub

---

## 🚀 Run Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Configure AI (Optional)

Create a `.env` file:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

The application works without an API key; AI features are optional.

### 3. Start the application

```bash
npm start
```

Open:

`http://localhost:3000`

---

## 🧠 Built with Codex

CropPassport AI was developed during **OpenAI Build Week** with Codex supporting the development process, including application architecture, farmer workflows, traceability timelines, Digital Crop Passport generation, QR-based buyer experiences, multimodal activity features, and AI integration.

---

## 🌱 Vision

CropPassport AI was inspired by a real agricultural challenge in **Dera Ghazi Khan, Pakistan**.

Our long-term vision is to create a simple bridge between:

> **Small Farmers → Digital Traceability → Buyer Trust → Better Market Access**

**One harvest. One digital passport. One transparent crop story.**

```

This is the version I'd use. It keeps the **problem, motivation, solution, features, AI, passport, tech stack, setup, Codex usage, and vision** while remaining readable for a hackathon judge.
```
