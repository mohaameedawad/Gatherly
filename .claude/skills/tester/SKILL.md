---
name: tester
description: Testing conventions for GATHERLY — vitest/supertest for API, vitest/TestBed for Angular. Load before writing any test in GATHERLY.
---

# Testing conventions (GATHERLY)

## API tests (apps/api)
vitest + supertest. Files colocated with source: `apps/api/src/<feature>.test.ts`.
Run: `npm run test -w @gatherly/api`

Pattern:
```ts
import request from 'supertest';
import { app } from '../app.js';

describe('POST /conferences', () => {
  it('returns 401 when unauthenticated', async () => {
    await request(app).post('/conferences').expect(401);
  });
  it('returns 400 on missing required field', async () => {
    await request(app)
      .post('/conferences')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ title: '' })
      .expect(400);
  });
});
```

Auth: use the test-token helper (see `app.test.ts`) — `signToken({ id, role })` — to produce JWTs for different roles without hitting the DB.

## Frontend tests (apps/web)
vitest + Angular TestBed. Files colocated: `apps/web/src/**/<component>.spec.ts`.
Run: `npm run test -w web -- --watch=false`

## What to cover
- Write **at most 1 new test case** per task — the single highest-value gap:
  - If developer covered happy path → test one validation failure
  - If developer covered validation → test one authorization boundary (401/403)
  - If developer covered both → test one edge case
- Do NOT rewrite tests the developer already wrote — look for gaps only

Pattern:
```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from '../../core/services/api.service';

describe('ConferenceForm', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [ConferenceForm],
    providers: [
      provideHttpClientTesting(),
      { provide: ApiService, useValue: { createConference: vi.fn() } },
    ],
  }));

  it('disables submit when form is invalid', () => { ... });
  it('shows field-error after touching a required field', () => { ... });
});
```

## What to cover
- Happy path per acceptance criteria
- Validation failures — missing required fields, format violations, constraint minimums
- Authorization boundaries — unauthenticated (401), wrong role (403), wrong owner
- Edge cases the acceptance criteria imply but don't state explicitly
- Do NOT rewrite tests the developer already wrote — look for gaps only

## Hard rules
- Run the full suite and confirm it passes before reporting done.
- If you find a bug in the implementation, report it back — do not patch it yourself.
- Never touch git.
