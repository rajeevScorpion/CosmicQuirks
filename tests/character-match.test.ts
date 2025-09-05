import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock OpenAI client module used by the flow
vi.mock('../src/ai/openai', () => {
  const chatCreate = vi.fn(async () => ({
    choices: [
      {
        message: {
          content: JSON.stringify({
            characterName: 'Sir Quirkalot',
            characterDescription: 'A whimsical time-traveling jester historian.',
            prediction: 'You will discover a sock that predicts rain.',
          }),
        },
      },
    ],
  }));
  const imagesGenerateOk = vi.fn(async () => ({ data: [{ b64_json: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ' }] }));
  const imagesGenerateFail = vi.fn(async () => { throw new Error('image blocked'); });

  return {
    openai: {
      chat: { completions: { create: chatCreate } },
      images: { generate: imagesGenerateFail },
    },
    assertOpenAIKey: () => {},
    // export helpers for test to switch behavior
    __mocks: { chatCreate, imagesGenerateOk, imagesGenerateFail },
  };
});

// Important: import after mock
import { characterMatch } from '../src/ai/flows/character-match';
import * as openaiMod from '../src/ai/openai';

describe('characterMatch', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('parses JSON and returns placeholder image when image generation fails', async () => {
    const res = await characterMatch({ name: 'Alex', birthdate: '01-01-1990', question: 'Will I travel?' });
    expect(res.characterName).toBeTruthy();
    expect(res.characterDescription).toBeTruthy();
    expect(res.prediction).toBeTruthy();
    expect(res.characterImage.startsWith('data:image/')).toBe(true);
  });

  it('returns PNG data URI when image generation succeeds', async () => {
    // Swap to OK image generator
    (openaiMod as any).openai.images.generate = (openaiMod as any).__mocks.imagesGenerateOk;
    const res = await characterMatch({ name: 'Sam', birthdate: '02-02-1992', question: 'Career?' });
    expect(res.characterImage.startsWith('data:image/png;base64,')).toBe(true);
  });
});

