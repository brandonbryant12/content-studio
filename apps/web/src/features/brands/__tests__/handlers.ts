// features/brands/__tests__/handlers.ts
// MSW handlers for brand API mocking

import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3035/api';

// Mock brand data
const mockBrands = [
  {
    id: 'brd_test000000000001',
    name: 'TechCorp',
    description: 'A technology company focused on innovation',
    mission: 'Making technology accessible',
    values: ['Innovation', 'Quality', 'Trust'],
    colors: { primary: '#6366f1', secondary: null, accent: null },
    brandGuide: null,
    chatMessages: [],
    personas: [
      {
        id: 'persona-1',
        name: 'Alex',
        role: 'Host',
        voiceId: 'voice-1',
        personalityDescription: 'Friendly and knowledgeable',
        speakingStyle: 'Conversational',
        exampleQuotes: ['Welcome to the show!'],
      },
    ],
    segments: [
      {
        id: 'segment-1',
        name: 'Developers',
        description: 'Software developers and engineers',
        messagingTone: 'Technical but approachable',
        keyBenefits: ['Productivity', 'Innovation'],
      },
    ],
    personaCount: 1,
    segmentCount: 1,
    createdBy: 'user-1',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'brd_test000000000002',
    name: 'EcoFriendly',
    description: 'Sustainable products for everyday life',
    mission: 'Protecting our planet',
    values: ['Sustainability', 'Transparency'],
    colors: { primary: '#10b981', secondary: null, accent: null },
    brandGuide: null,
    chatMessages: [],
    personas: [],
    segments: [],
    personaCount: 0,
    segmentCount: 0,
    createdBy: 'user-1',
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
  },
];

export const brandHandlers = {
  // List brands - success
  listSuccess: http.get(`${API_URL}/brands`, () => {
    return HttpResponse.json(mockBrands.map(({ chatMessages, personas, segments, brandGuide, ...rest }) => rest));
  }),

  // List brands - empty
  listEmpty: http.get(`${API_URL}/brands`, () => {
    return HttpResponse.json([]);
  }),

  // List brands - error
  listError: http.get(`${API_URL}/brands`, () => {
    return HttpResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Server error' },
      { status: 500 },
    );
  }),

  // Get brand - success
  getSuccess: http.get(`${API_URL}/brands/:id`, ({ params }) => {
    const brand = mockBrands.find((b) => b.id === params.id);
    if (brand) {
      return HttpResponse.json(brand);
    }
    return HttpResponse.json(
      { code: 'BRAND_NOT_FOUND', message: 'Brand not found' },
      { status: 404 },
    );
  }),

  // Get brand - not found
  getNotFound: http.get(`${API_URL}/brands/:id`, () => {
    return HttpResponse.json(
      { code: 'BRAND_NOT_FOUND', message: 'Brand not found' },
      { status: 404 },
    );
  }),

  // Create brand - success
  createSuccess: http.post(`${API_URL}/brands`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: 'brd_new000000000001',
      name: body.name,
      description: body.description ?? null,
      mission: body.mission ?? null,
      values: body.values ?? [],
      colors: body.colors ?? null,
      brandGuide: null,
      chatMessages: [],
      personas: [],
      segments: [],
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  // Create brand - validation error
  createValidationError: http.post(`${API_URL}/brands`, () => {
    return HttpResponse.json(
      {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        data: { name: 'Name is required' },
      },
      { status: 400 },
    );
  }),

  // Update brand - success
  updateSuccess: http.patch(`${API_URL}/brands/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const brand = mockBrands.find((b) => b.id === params.id);
    if (brand) {
      return HttpResponse.json({
        ...brand,
        ...body,
        updatedAt: new Date().toISOString(),
      });
    }
    return HttpResponse.json(
      { code: 'BRAND_NOT_FOUND', message: 'Brand not found' },
      { status: 404 },
    );
  }),

  // Delete brand - success
  deleteSuccess: http.delete(`${API_URL}/brands/:id`, () => {
    return HttpResponse.json({});
  }),

  // Delete brand - not found
  deleteNotFound: http.delete(`${API_URL}/brands/:id`, () => {
    return HttpResponse.json(
      { code: 'BRAND_NOT_FOUND', message: 'Brand not found' },
      { status: 404 },
    );
  }),
};
