import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../services/logger.js';
import { config } from '../config/index.js';

export async function speechRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/speech/transcribe
   * Mocks / executes Whisper transcription.
   */
  app.post(
    '/api/speech/transcribe',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      try {
        // Parse audio input data
        const body = request.body as { audio?: string; language?: string } | undefined;
        const audio = body?.audio || '';

        logger.info(`🎤 Transcribing audio input segment (len: ${audio.length} bytes)`);

        // Simulated Whisper transcription fallbacks
        const mockTranscripts = [
          "Explain the difference between a normal AI and a full agent OS.",
          "Build a fast responsive stopwatch interface with Tailwind CSS.",
          "Start auditing the sandbox logs for runtime error exceptions.",
        ];
        const text = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];

        return reply.send({
          success: true,
          text,
          model: 'whisper-large-v3',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to transcribe: ${msg}`);
        return reply.status(500).send({ success: false, error: 'Failed to transcribe speech audio' });
      }
    }
  );

  /**
   * POST /api/speech/synthesize
   * Mocks TTS conversion (Kokoro/Piper/Coqui).
   */
  app.post(
    '/api/speech/synthesize',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply) => {
      try {
        const { text, voice = 'kokoro' } = request.body as { text: string; voice?: string };

        logger.info(`🔊 Synthesizing speech track for text: "${text.slice(0, 40)}" using voice ${voice}`);

        // Return a mock base64 audio track representing a vocal synthesis output
        // (A small silent wav file data URI to prevent rendering crashes in audio components)
        const mockSilentWavBase64 = "UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";

        return reply.send({
          success: true,
          audioUrl: `data:audio/wav;base64,${mockSilentWavBase64}`,
          model: 'kokoro-tts-v1',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to synthesize TTS: ${msg}`);
        return reply.status(500).send({ success: false, error: 'Failed to synthesize speech audio' });
      }
    }
  );
}
