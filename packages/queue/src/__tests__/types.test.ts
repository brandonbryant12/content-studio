import { describe, it, expect } from '@jest/globals';
import type {
  Job,
  JobType,
  JobStatus,
  GeneratePodcastPayload,
  GeneratePodcastResult,
} from '../types';

describe('queue types', () => {
  describe('JobStatus', () => {
    it('should support pending, processing, completed, and failed statuses', () => {
      const statuses: JobStatus[] = [
        'pending',
        'processing',
        'completed',
        'failed',
      ];
      expect(statuses).toHaveLength(4);
    });
  });

  describe('JobType', () => {
    it('should support generate-podcast type', () => {
      const types: JobType[] = ['generate-podcast'];
      expect(types).toHaveLength(1);
    });
  });

  describe('Job', () => {
    it('should have all required fields', () => {
      const job: Job = {
        id: 'job-123',
        type: 'generate-podcast',
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
      expect(job.type).toBe('generate-podcast');
      expect(job.status).toBe('pending');
      expect(job.result).toBeNull();
      expect(job.error).toBeNull();
      expect(job.startedAt).toBeNull();
      expect(job.completedAt).toBeNull();
    });

    it('should support typed payload and result', () => {
      const job: Job<GeneratePodcastPayload, GeneratePodcastResult> = {
        id: 'job-456',
        type: 'generate-podcast',
        status: 'completed',
        payload: {
          podcastId: 'pod-1',
          userId: 'user-1',
          promptInstructions: 'Keep it casual',
        },
        result: {
          scriptId: 'script-1',
          segmentCount: 5,
          audioUrl: 'https://storage.example.com/audio/podcast-123.mp3',
          duration: 1800,
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
      expect(job.result?.audioUrl).toBe(
        'https://storage.example.com/audio/podcast-123.mp3',
      );
      expect(job.result?.duration).toBe(1800);
    });
  });

  describe('GeneratePodcastPayload', () => {
    it('should have required podcastId and userId', () => {
      const payload: GeneratePodcastPayload = {
        podcastId: 'pod-123',
        userId: 'user-456',
      };

      expect(payload.podcastId).toBe('pod-123');
      expect(payload.userId).toBe('user-456');
    });

    it('should support optional promptInstructions', () => {
      const payload: GeneratePodcastPayload = {
        podcastId: 'pod-123',
        userId: 'user-456',
        promptInstructions: 'Make it educational',
      };

      expect(payload.promptInstructions).toBe('Make it educational');
    });
  });

  describe('GeneratePodcastResult', () => {
    it('should have scriptId, segmentCount, audioUrl, and duration', () => {
      const result: GeneratePodcastResult = {
        scriptId: 'script-123',
        segmentCount: 10,
        audioUrl: 'https://storage.example.com/audio/podcast-123.mp3',
        duration: 1800,
      };

      expect(result.scriptId).toBe('script-123');
      expect(result.segmentCount).toBe(10);
      expect(result.audioUrl).toBe(
        'https://storage.example.com/audio/podcast-123.mp3',
      );
      expect(result.duration).toBe(1800);
    });
  });
});
