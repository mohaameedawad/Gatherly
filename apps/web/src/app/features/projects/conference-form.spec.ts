import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ConferenceForm } from './conference-form';

const setup = async () => {
  await TestBed.configureTestingModule({
    imports: [ConferenceForm],
    providers: [
      provideHttpClient(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
    ],
  }).compileComponents();
  return TestBed.createComponent(ConferenceForm).componentInstance;
};

describe('ConferenceForm (US-2.1)', () => {
  it('starts invalid with empty required fields', async () => {
    const c = await setup();
    expect(c.form.invalid).toBe(true);
  });

  it('rejects an end date at or before the start date', async () => {
    const c = await setup();
    c.form.patchValue({
      title: 'A Valid Title',
      summary: 'A sufficiently long description of the event.',
      venue: 'Test Hall',
      city: 'Cairo',
      startsAt: '2027-05-02T09:00',
      endsAt: '2027-05-01T09:00',
      timezone: 'Africa/Cairo',
      capacity: 10,
    });
    expect(c.form.errors?.['dateOrder']).toBe(true);
    expect(c.form.invalid).toBe(true);
  });

  it('is valid once every field is filled correctly', async () => {
    const c = await setup();
    c.form.patchValue({
      title: 'A Valid Title',
      summary: 'A sufficiently long description of the event.',
      venue: 'Test Hall',
      city: 'Cairo',
      startsAt: '2027-05-01T09:00',
      endsAt: '2027-05-02T09:00',
      timezone: 'Africa/Cairo',
      capacity: 10,
    });
    expect(c.form.valid).toBe(true);
  });
});
