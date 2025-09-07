# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build the production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run Vitest tests
- `npm run image:check` - Test image generation functionality

## Architecture Overview

This is a Next.js 15 application called "Cosmic Quirks" - a humorous fortune-telling app that generates predictions with AI-generated character illustrations.

### Core Application Flow

1. **User Input** (`src/app/page.tsx`): Users enter their name, birth month/year, and a question
2. **Server Action** (`src/app/actions.ts`): `getPrediction()` processes the form data and calls the AI flow
3. **Character Matching** (`src/ai/flows/character-match.ts`): Generates a funny historical character based on birthdate and creates an AI image
4. **Result Display** (`src/components/prediction-result.tsx`): Shows the character, description, and prediction with confetti animation

### Key Technologies

- **Framework**: Next.js 15 with App Router and Server Actions
- **UI**: Radix UI components with Tailwind CSS using CSS custom properties
- **Forms**: React Hook Form with Zod validation
- **AI**: OpenAI API for text generation and image generation (DALL-E)
- **Testing**: Vitest with Node environment
- **Animations**: Tailwind CSS animations (including custom `magic-pulse`) and react-confetti

### Project Structure

- `src/app/` - Next.js App Router pages and server actions
- `src/components/` - React components (main app components and UI primitives)
- `src/components/ui/` - Radix UI-based component library with Tailwind styling
- `src/ai/` - AI-related functionality
- `src/ai/flows/` - Specific AI workflows (character matching, prediction generation)
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions

### Environment Configuration

The application requires OpenAI API configuration:
- `OPENAI_API_KEY` - Required for AI functionality
- `OPENAI_TEXT_MODEL` - Defaults to 'gpt-4o-mini'
- `OPENAI_IMAGE_MODEL` - Defaults to 'gpt-image-1'

### AI Integration

The app uses a two-stage AI process:
1. **Character Generation**: Creates a humorous historical character matched to the user's birthdate
2. **Image Generation**: Generates a cartoon-style character illustration with graceful fallbacks to SVG placeholders

### Error Handling

The application includes comprehensive error handling with user-friendly messages themed around cosmic/mystical language (e.g., "The cosmos are fuzzy right now").