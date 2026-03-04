import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  InfographicStatus,
  InfographicFormatSchema,
  InfographicStatusSchema,
  StylePropertySchema,
  StylePropertiesSchema,
} from '../schemas/infographics';
import {
  JobStatus,
  JobType,
  JobStatusSchema,
  type JobType as JobTypeValue,
} from '../schemas/jobs';
import {
  VersionStatus,
  PodcastFormatSchema,
  VersionStatusSchema,
} from '../schemas/podcasts';
import { SourceOriginSchema } from '../schemas/sources';
import { VoiceoverStatus, VoiceoverStatusSchema } from '../schemas/voiceovers';

describe('enum companion objects', () => {
  describe('VersionStatus', () => {
    it('has all expected values', () => {
      expect(VersionStatus.DRAFTING).toBe('drafting');
      expect(VersionStatus.GENERATING_SCRIPT).toBe('generating_script');
      expect(VersionStatus.SCRIPT_READY).toBe('script_ready');
      expect(VersionStatus.GENERATING_AUDIO).toBe('generating_audio');
      expect(VersionStatus.READY).toBe('ready');
      expect(VersionStatus.FAILED).toBe('failed');
    });
  });

  describe('VoiceoverStatus', () => {
    it('has all expected values', () => {
      expect(VoiceoverStatus.DRAFTING).toBe('drafting');
      expect(VoiceoverStatus.GENERATING_AUDIO).toBe('generating_audio');
      expect(VoiceoverStatus.READY).toBe('ready');
      expect(VoiceoverStatus.FAILED).toBe('failed');
    });
  });

  describe('InfographicStatus', () => {
    it('has all expected values', () => {
      expect(InfographicStatus.DRAFT).toBe('draft');
      expect(InfographicStatus.GENERATING).toBe('generating');
      expect(InfographicStatus.READY).toBe('ready');
      expect(InfographicStatus.FAILED).toBe('failed');
    });
  });

  describe('JobStatus', () => {
    it('has all expected values', () => {
      expect(JobStatus.PENDING).toBe('pending');
      expect(JobStatus.PROCESSING).toBe('processing');
      expect(JobStatus.COMPLETED).toBe('completed');
      expect(JobStatus.FAILED).toBe('failed');
    });
  });

  describe('JobType', () => {
    it('has all expected values', () => {
      expect(JobType.GENERATE_PODCAST).toBe('generate-podcast');
      expect(JobType.GENERATE_SCRIPT).toBe('generate-script');
      expect(JobType.GENERATE_AUDIO).toBe('generate-audio');
      expect(JobType.GENERATE_VOICEOVER).toBe('generate-voiceover');
      expect(JobType.GENERATE_INFOGRAPHIC).toBe('generate-infographic');
      expect(JobType.PROCESS_URL).toBe('process-url');
      expect(JobType.PROCESS_RESEARCH).toBe('process-research');
    });

    it('is a value-union type assignable from enum values', () => {
      const jobType: JobTypeValue = JobType.PROCESS_RESEARCH;
      expect(jobType).toBe('process-research');
    });
  });
});

describe('enum schemas', () => {
  describe('SourceOriginSchema', () => {
    const decode = Schema.decodeUnknownSync(SourceOriginSchema);

    it('accepts valid sources', () => {
      expect(decode('manual')).toBe('manual');
      expect(decode('upload_txt')).toBe('upload_txt');
      expect(decode('upload_pdf')).toBe('upload_pdf');
      expect(decode('upload_docx')).toBe('upload_docx');
      expect(decode('upload_pptx')).toBe('upload_pptx');
    });

    it('rejects invalid sources', () => {
      expect(() => decode('invalid')).toThrow();
    });
  });

  describe('PodcastFormatSchema', () => {
    const decode = Schema.decodeUnknownSync(PodcastFormatSchema);

    it('accepts valid formats', () => {
      expect(decode('voice_over')).toBe('voice_over');
      expect(decode('conversation')).toBe('conversation');
    });

    it('rejects invalid formats', () => {
      expect(() => decode('interview')).toThrow();
    });
  });

  describe('VersionStatusSchema', () => {
    const decode = Schema.decodeUnknownSync(VersionStatusSchema);

    it('accepts all valid statuses', () => {
      expect(decode('drafting')).toBe('drafting');
      expect(decode('generating_script')).toBe('generating_script');
      expect(decode('script_ready')).toBe('script_ready');
      expect(decode('generating_audio')).toBe('generating_audio');
      expect(decode('ready')).toBe('ready');
      expect(decode('failed')).toBe('failed');
    });

    it('rejects invalid statuses', () => {
      expect(() => decode('archived')).toThrow();
    });
  });

  describe('VoiceoverStatusSchema', () => {
    const decode = Schema.decodeUnknownSync(VoiceoverStatusSchema);

    it('accepts valid statuses', () => {
      expect(decode('drafting')).toBe('drafting');
      expect(decode('generating_audio')).toBe('generating_audio');
      expect(decode('ready')).toBe('ready');
      expect(decode('failed')).toBe('failed');
    });

    it('rejects invalid statuses', () => {
      expect(() => decode('processing')).toThrow();
    });
  });

  describe('StylePropertySchema', () => {
    const decode = Schema.decodeUnknownSync(StylePropertySchema);

    it('accepts valid style property', () => {
      expect(decode({ key: 'Background', value: '#fff' })).toEqual({
        key: 'Background',
        value: '#fff',
      });
    });

    it('accepts style property with type', () => {
      expect(
        decode({ key: 'Background', value: '#fff', type: 'color' }),
      ).toEqual({ key: 'Background', value: '#fff', type: 'color' });
    });

    it('rejects invalid type value', () => {
      expect(() => decode({ key: 'x', value: 'y', type: 'invalid' })).toThrow();
    });
  });

  describe('StylePropertiesSchema', () => {
    const decode = Schema.decodeUnknownSync(StylePropertiesSchema);

    it('accepts an array of style properties', () => {
      const result = decode([
        { key: 'BG', value: '#000', type: 'color' },
        { key: 'Mood', value: 'dark' },
      ]);
      expect(result).toHaveLength(2);
    });

    it('accepts empty array', () => {
      expect(decode([])).toEqual([]);
    });
  });

  describe('InfographicFormatSchema', () => {
    const decode = Schema.decodeUnknownSync(InfographicFormatSchema);

    it('accepts valid formats', () => {
      expect(decode('portrait')).toBe('portrait');
      expect(decode('square')).toBe('square');
      expect(decode('landscape')).toBe('landscape');
      expect(decode('og_card')).toBe('og_card');
    });

    it('rejects invalid formats', () => {
      expect(() => decode('panorama')).toThrow();
    });
  });

  describe('InfographicStatusSchema', () => {
    const decode = Schema.decodeUnknownSync(InfographicStatusSchema);

    it('accepts valid statuses', () => {
      expect(decode('draft')).toBe('draft');
      expect(decode('generating')).toBe('generating');
      expect(decode('ready')).toBe('ready');
      expect(decode('failed')).toBe('failed');
    });

    it('rejects invalid statuses', () => {
      expect(() => decode('pending')).toThrow();
    });
  });

  describe('JobStatusSchema', () => {
    const decode = Schema.decodeUnknownSync(JobStatusSchema);

    it('accepts valid statuses', () => {
      expect(decode('pending')).toBe('pending');
      expect(decode('processing')).toBe('processing');
      expect(decode('completed')).toBe('completed');
      expect(decode('failed')).toBe('failed');
    });

    it('rejects invalid statuses', () => {
      expect(() => decode('queued')).toThrow();
    });
  });
});
