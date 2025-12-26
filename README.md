# 🧪 Autonomous AI Researcher

An advanced, agentic AI platform designed to automate scientific literature review and research hypothesis generation. This system acts as an **autonomous researcher** that can search through millions of scientific papers, synthesize information, and brainstorm novel ideas.

![Researcher UI](https://img.shields.io/badge/Research-Autonomous-blueviolet?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)

## 🚀 Vision
This repository is evolving into a fully **Autonomous AI Researcher**. The goal is to create an agent that doesn't just answer questions, but proactively explores scientific frontiers, validates claims against the literature, and proposes high-impact research directions.

## ✨ Key Features
- **🔍 Intelligent Literature Search**: Integrated with Semantic Scholar API to find the most relevant and high-impact papers.
- **🧠 Automated Brainstorming**: Generates novel research hypotheses based on real-world context and found literature.
- **🛡️ Human-in-the-Loop (HITL)**: Advanced Approve/Decline gate for tool execution, giving you full control over the researcher's actions.
- **🌓 Premium Research UI**: A state-of-the-art dark theme with glassmorphism, mathematical notation support (KaTeX), and syntax highlighting.
- **⚡ Multi-Model Support**: Switch seamlessly between OpenRouter (Nemotron, Mistral) and Google Gemini 2.0.

## 🛠️ Architecture
- **Framework**: Next.js 15 (App Router)
- **Agent Orchestration**: Custom SSE (Server-Sent Events) streaming with tool-calling capabilities.
- **Styling**: Tailwind CSS with Framer Motion animations.
- **APIs**: Semantic Scholar Graph API for research data.

## 🚦 Getting Started

### 1. Prerequisites
You will need API keys for:
- [OpenRouter](https://openrouter.ai/)
- [Google AI Studio](https://aistudio.google.com/) (for Gemini)
- [Semantic Scholar](https://www.semanticscholar.org/product/api) (Optional, public searches work without it)

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```env
OPENROUTER_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
NEXT_PUBLIC_MOCK_LITERATURE=false
```

### 3. Installation
```bash
npm install
npm run dev
```

## 📈 Roadmap
- [x] Basic Chat Interface
- [x] Tool Calling Integration (Search + Brainstorm)
- [x] Human-in-the-Loop Approval Gate
- [x] Scientific Math (LaTeX) Rendering
- [ ] Autonomous Report Generation (PDF Export)
- [ ] Direct ArXiv Integration for latest pre-prints
- [ ] Multi-agent collaboration (Reviewer vs. Researcher)

## 🤝 Contributing
Contributions are welcome! If you're passionate about agentic scientific workflows, feel free to open a PR or Issue.

---
Built with ❤️ for the future of science.
