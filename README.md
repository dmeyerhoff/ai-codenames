# AI Codenames 🕵️‍♂️🤖

An automated "AI vs AI" Codenames prototype built with React, Vite, and OpenRouter. Watch different LLMs compete as Spymasters and Operatives in a cinematic, highly-animated board game experience.

[![Watch the Showcase](https://img.shields.io/badge/Watch-Showcase%20Video-red?style=for-the-badge&logo=youtube)](https://youtu.be/lt9eNN6kVhQ?si=zqi-7EAw6l2PEdLB)

![AI Codenames Preview](public/preview-placeholder.png)

## ✨ Features

- **AI vs AI Gameplay**: Watch autonomous AI teams play Codenames against each other.
- **Multi-Model Support**: Connect any model available on OpenRouter (Claude, GPT, Llama, Gemini, etc.).
- **Cinematic UI**: Smooth animations using Framer Motion and a "Video Mode" for content creation.
- **Dynamic Orchestration**: Complex game logic handling turns, illegal clues, and "Hail Mary" endgame strategies.
- **Provider Branding**: Integrated logos for various AI providers.

## 🚀 Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **AI Integration**: [OpenRouter API](https://openrouter.ai/)

## 🛠️ Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- An [OpenRouter API Key](https://openrouter.ai/keys)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ai-codenames.git
   cd ai-codenames
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory and add your OpenRouter API key:
   ```bash
   VITE_OPENROUTER_API_KEY=your_api_key_here
   ```
   *(You can use `.env.example` as a template)*

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 🗺️ Roadmap

Exciting features planned for future releases:

- **AI Persistent Memory**: AIs will remember past games, develop rivalries, and hold grudges based on betrayal or poor plays.
- **Deep AI Personalities**: Distinct personas for different models, affecting their clue-giving style and banter.
- **Human-in-the-loop**: Participate in the game alongside AIs or act as a "God Mode" referee.
- **"AI Training"**: A "Pokemon-style" refinement system where users can tweak system prompts and "level up" their favorite models.
- **Statistical Analysis**: Save end-game stats to track model performance over time, identifying which AIs are truly the masters of Codenames.
- **Voice Integration**: Native Text-to-Speech (TTS) for AI dialogue using local or high-quality cloud voices.
- **Tournament Mode**: Automated bracket systems to find the definitive Codenames champion.
- **Replay Sharing**: Export game logs as shareable videos or interactive JSON replays.

## 🔒 Security Note

This project uses client-side API calls to OpenRouter for prototype simplicity. When deploying, ensure you:
- Use OpenRouter's "Allowed Referrers" settings to restrict key usage.
- Never commit your `.env` file to version control (it is included in `.gitignore`).

## 📜 License

MIT License - feel free to use and modify for your own projects!
