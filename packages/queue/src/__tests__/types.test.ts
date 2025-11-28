import { describe, it, expect } from '@jest/globals';
import type {
  Job,
  JobType,
  JobStatus,
  GenerateScriptPayload,
  GenerateScriptResult,
  GenerateAudioPayload,
  GenerateAudioResult,
} from '../types';

describe('queue types', () => {
  describe('JobStatus', () => {
    it('should support pending, processing, completed, and failed statuses', () => {
      const statuses: JobStatus[] = ['pending', 'processing', 'completed', 'failed'];
      expect(statuses).toHaveLength(4);
    });
  });

  describe('JobType', () => {
    it('should support generate-script and generate-audio types', () => {
      const types: JobType[] = ['generate-script', 'generate-audio'];
      expect(types).toHaveLength(2);
    });
  });

  describe('Job', () => {
    it('should have all required fields', () => {
      const job: Job = {
        id: 'job-123',
        type: 'generate-script',
        status: 'pending',
        payload: { podcastId: 'pod-1' },
        result: null,
        error: null,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: null,
        completedAt: null,
      };

      expect(job.id).toBe('job-123');
      expect(job.type).toBe('generate-script');
      expect(job.status).toBe('pending');
      expect(job.result).toBeNull();
      expect(job.error).toBeNull();
      expect(job.startedAt).toBeNull();
      expect(job.completedAt).toBeNull();
    });

    it('should support typed payload and result', () => {
      const job: Job<GenerateScriptPayload, GenerateScriptResult> = {
        id: 'job-456',
        type: 'generate-script',
        status: 'completed',
        payload: {
          podcastId: 'pod-1',
          userId: 'user-1',
          promptInstructions: 'Keep it casual',
        },
        result: {
          scriptId: 'script-1',
          segmentCount: 5,
        },
        error: null,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
      };

      expect(job.payload.podcastId).toBe('pod-1');
      expect(job.result?.scriptId).toBe('script-1');
      expect(job.result?.segmentCount).toBe(5);
    });
  });

  describe('GenerateScriptPayload', () => {
    it('should have required podcastId and userId', () => {
      const payload: GenerateScriptPayload = {
        podcastId: 'pod-123',
        userId: 'user-456',
      };

      expect(payload.podcastId).toBe('pod-123');
      expect(payload.userId).toBe('user-456');
    });

    it('should support optional promptInstructions', () => {
      const payload: GenerateScriptPayload = {
        podcastId: 'pod-123',
        userId: 'user-456',
        promptInstructions: 'Make it educational',
      };

      expect(payload.promptInstructions).toBe('Make it educational');
    });
  });

  describe('GenerateAudioPayload', () => {
    it('should have required podcastId, userId, and scriptId', () => {
      const payload: GenerateAudioPayload = {
        podcastId: 'pod-123',
        userId: 'user-456',
        scriptId: 'script-789',
      };

      expect(payload.podcastId).toBe('pod-123');
      expect(payload.userId).toBe('user-456');
      expect(payload.scriptId).toBe('script-789');
    });
  });

  describe('GenerateScriptResult', () => {
    it('should have scriptId and segmentCount', () => {
      const result: GenerateScriptResult = {
        scriptId: 'script-123',
        segmentCount: 10,
      };

      expect(result.scriptId).toBe('script-123');
      expect(result.segmentCount).toBe(10);
    });
  });

  describe('GenerateAudioResult', () => {
    it('should have audioUrl and duration', () => {
      const result: GenerateAudioResult = {
        audioUrl: 'https://storage.example.com/audio/podcast-123.mp3',
        duration: 1800,
      };

      expect(result.audioUrl).toBe('https://storage.example.com/audio/podcast-123.mp3');
      expect(result.duration).toBe(1800);
    });
  });
});
