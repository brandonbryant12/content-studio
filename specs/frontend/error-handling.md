# Frontend Error Handling

This document defines the standard pattern for handling API errors in the web application.

## Overview

The frontend leverages oRPC's typed error system to provide rich, context-aware error messages instead of generic fallbacks.

## Key Utilities

### `isDefinedError(error)`

Type guard that narrows error to defined oRPC errors with typed `code` and `data`.

```typescript
import { isDefinedError } from '@repo/api/client';

if (isDefinedError(error)) {
  // error.code is typed
  // error.data is typed based on code
  console.log(error.code, error.data);
}
```

### `safe(promise)`

Wraps call to return `[error, data, isDefined, isSuccess]` tuple for imperative calls.

```typescript
import { safe } from '@repo/api/client';

const [error, data, isDefined, isSuccess] = await safe(
  client.documents.create(input)
);

if (!isSuccess) {
  if (isDefined) {
    // Handle typed error
  }
}
```

## Error Formatting Utility

Create centralized error formatting in `apps/web/src/lib/errors.ts`:

```typescript
import { isDefinedError } from '@repo/api/client';

// ============================================================================
// Helpers
// ============================================================================

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ============================================================================
// Error Message Formatter
// ============================================================================

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!isDefinedError(error)) {
    return (error as Error)?.message ?? fallback;
  }

  switch (error.code) {
    case 'DOCUMENT_TOO_LARGE': {
      const { fileName, fileSize, maxSize } = error.data as {
        fileName: string;
        fileSize: number;
        maxSize: number;
      };
      return `${fileName} (${formatBytes(fileSize)}) exceeds ${formatBytes(maxSize)} limit`;
    }

    case 'UNSUPPORTED_FORMAT': {
      const { mimeType, supportedFormats } = error.data as {
        mimeType: string;
        supportedFormats: string[];
      };
      return `${mimeType} not supported. Use: ${supportedFormats.join(', ')}`;
    }

    case 'RATE_LIMITED': {
      const data = error.data as { retryAfter?: number } | undefined;
      return data?.retryAfter
        ? `Too many requests. Try again in ${data.retryAfter} seconds.`
        : 'Too many requests. Please wait a moment.';
    }

    case 'DOCUMENT_QUOTA_EXCEEDED': {
      const { count, limit } = error.data as { count: number; limit: number };
      return `You've reached your document limit (${count}/${limit}). Upgrade to add more.`;
    }

    case 'GENERATION_IN_PROGRESS': {
      return 'This podcast is already being generated. Please wait.';
    }

    default:
      return error.message;
  }
};
```

## Usage Patterns

### Basic onError Handler

```typescript
// Before - generic message
onError: (error) => {
  toast.error(error.message ?? 'Failed to upload document');
}

// After - rich context
import { getErrorMessage } from '@/lib/errors';

onError: (error) => {
  toast.error(getErrorMessage(error, 'Failed to upload document'));
}
```

### Conditional UI Based on Error

```typescript
import { isDefinedError } from '@repo/api/client';

onError: (error) => {
  if (isDefinedError(error)) {
    switch (error.code) {
      case 'DOCUMENT_TOO_LARGE':
        // Show file size indicator UI
        setFileSizeError(error.data);
        return;

      case 'PODCAST_NOT_FOUND':
        // Navigate away
        navigate({ to: '/podcasts' });
        toast.error('Podcast no longer exists');
        return;

      case 'DOCUMENT_QUOTA_EXCEEDED':
        // Show upgrade modal
        setShowUpgradeModal(true);
        return;
    }
  }

  // Fallback for unhandled errors
  toast.error(getErrorMessage(error, 'Operation failed'));
}
```

### TanStack Query Integration

```typescript
import { useMutation } from '@tanstack/react-query';
import { getErrorMessage } from '@/lib/errors';

const uploadMutation = useMutation({
  mutationFn: (file: File) => client.documents.upload({ file }),
  onSuccess: (data) => {
    toast.success('Document uploaded');
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  },
  onError: (error) => {
    toast.error(getErrorMessage(error, 'Failed to upload document'));
  },
});
```

### Form Validation Errors

```typescript
import { isDefinedError } from '@repo/api/client';

const handleSubmit = async (data: FormData) => {
  try {
    await client.documents.create(data);
    toast.success('Document created');
  } catch (error) {
    if (isDefinedError(error) && error.code === 'VALIDATION_ERROR') {
      // Set form-level errors
      const fieldErrors = error.data as Record<string, string>;
      Object.entries(fieldErrors).forEach(([field, message]) => {
        form.setError(field, { message });
      });
      return;
    }
    toast.error(getErrorMessage(error, 'Failed to create document'));
  }
};
```

## Error Code Reference

| Code | Data Shape | UI Treatment |
|------|------------|--------------|
| `DOCUMENT_TOO_LARGE` | `{ fileName, fileSize, maxSize }` | Show size comparison |
| `UNSUPPORTED_FORMAT` | `{ mimeType, supportedFormats }` | List allowed formats |
| `RATE_LIMITED` | `{ retryAfter? }` | Show countdown or wait message |
| `DOCUMENT_QUOTA_EXCEEDED` | `{ count, limit }` | Show upgrade CTA |
| `DOCUMENT_NOT_FOUND` | `{ documentId }` | Navigate away |
| `PODCAST_NOT_FOUND` | `{ podcastId }` | Navigate away |
| `GENERATION_IN_PROGRESS` | `{ podcastId, jobId }` | Show progress indicator |
| `UNAUTHORIZED` | - | Redirect to login |

## Testing Error Handling

```typescript
// apps/web/src/lib/errors.test.ts
import { describe, it, expect } from 'vitest';
import { getErrorMessage, formatBytes } from './errors';

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1572864)).toBe('1.5 MB');
  });
});

describe('getErrorMessage', () => {
  it('returns fallback for non-defined errors', () => {
    const error = new Error('Something went wrong');
    expect(getErrorMessage(error, 'Upload failed')).toBe('Something went wrong');
  });

  it('returns fallback for null errors', () => {
    expect(getErrorMessage(null, 'Upload failed')).toBe('Upload failed');
  });

  it('formats DOCUMENT_TOO_LARGE with details', () => {
    const error = {
      code: 'DOCUMENT_TOO_LARGE',
      message: 'File too large',
      data: { fileName: 'big.pdf', fileSize: 15728640, maxSize: 10485760 },
    };
    // Mock isDefinedError to return true
    expect(getErrorMessage(error, 'Failed'))
      .toBe('big.pdf (15.0 MB) exceeds 10.0 MB limit');
  });

  it('formats UNSUPPORTED_FORMAT with allowed types', () => {
    const error = {
      code: 'UNSUPPORTED_FORMAT',
      message: 'Unsupported format',
      data: { mimeType: 'video/mp4', supportedFormats: ['pdf', 'txt', 'docx'] },
    };
    expect(getErrorMessage(error, 'Failed'))
      .toBe('video/mp4 not supported. Use: pdf, txt, docx');
  });

  it('formats RATE_LIMITED with retry time', () => {
    const error = {
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      data: { retryAfter: 30 },
    };
    expect(getErrorMessage(error, 'Failed'))
      .toBe('Too many requests. Try again in 30 seconds.');
  });

  it('formats RATE_LIMITED without retry time', () => {
    const error = {
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      data: {},
    };
    expect(getErrorMessage(error, 'Failed'))
      .toBe('Too many requests. Please wait a moment.');
  });
});
```

## Anti-Patterns

### Don't Use Generic Fallbacks

```typescript
// WRONG - always shows generic message
onError: (error) => {
  toast.error('Something went wrong');
}

// CORRECT - use structured error data
onError: (error) => {
  toast.error(getErrorMessage(error, 'Operation failed'));
}
```

### Don't Ignore Error Data

```typescript
// WRONG - only using message
onError: (error) => {
  toast.error(error.message ?? 'Upload failed');
}

// CORRECT - using structured data
onError: (error) => {
  if (isDefinedError(error) && error.code === 'DOCUMENT_TOO_LARGE') {
    const { fileSize, maxSize } = error.data;
    toast.error(`File is ${formatBytes(fileSize)}, max is ${formatBytes(maxSize)}`);
    return;
  }
  toast.error(getErrorMessage(error, 'Upload failed'));
}
```

### Don't Duplicate Error Logic

```typescript
// WRONG - repeated switch in multiple files
// file1.tsx
if (error.code === 'DOCUMENT_TOO_LARGE') { ... }

// file2.tsx
if (error.code === 'DOCUMENT_TOO_LARGE') { ... }

// CORRECT - centralized utility
import { getErrorMessage } from '@/lib/errors';
toast.error(getErrorMessage(error, 'Failed'));
```

### Don't Forget Navigation Errors

```typescript
// WRONG - showing toast for navigation error
if (error.code === 'PODCAST_NOT_FOUND') {
  toast.error('Podcast not found');  // User is stuck on broken page!
}

// CORRECT - navigate away
if (error.code === 'PODCAST_NOT_FOUND') {
  navigate({ to: '/podcasts' });
  toast.error('Podcast no longer exists');
}
```
