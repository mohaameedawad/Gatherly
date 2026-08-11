import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

const dateOrderValidator = (g: AbstractControl): ValidationErrors | null => {
  const start = g.get('startsAt')?.value;
  const end = g.get('endsAt')?.value;
  return start && end && new Date(end) <= new Date(start) ? { dateOrder: true } : null;
};

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  template: `<a class="back" routerLink="/conferences">← All conferences</a>
    <header class="page-head">
      <div>
        <span class="eyebrow">{{ editing() ? 'Edit draft' : 'New conference' }}</span>
        <h1>{{ editing() ? 'Edit conference draft' : 'Create a conference draft' }}</h1>
        <p>Drafts stay private until you publish them. You can leave and come back anytime.</p>
      </div>
    </header>
    <form class="card conference-form" [formGroup]="form" (ngSubmit)="submit()">
      <label
        >Title<input formControlName="title" placeholder="Cairo Product & AI Summit" />
        @if (fieldError('title'); as msg) {
          <small class="field-error">{{ msg }}</small>
        }
      </label>
      <label
        >Description
        <textarea
          formControlName="summary"
          rows="3"
          placeholder="What is this conference about?"
        ></textarea>
        @if (fieldError('summary'); as msg) {
          <small class="field-error">{{ msg }}</small>
        }
      </label>
      <div class="field-row">
        <label
          >Venue<input formControlName="venue" placeholder="The GrEEK Campus" />
          @if (fieldError('venue'); as msg) {
            <small class="field-error">{{ msg }}</small>
          }
        </label>
        <label
          >City<input formControlName="city" placeholder="Cairo" />
          @if (fieldError('city'); as msg) {
            <small class="field-error">{{ msg }}</small>
          }
        </label>
      </div>
      <div class="field-row">
        <label
          >Starts<input type="datetime-local" formControlName="startsAt" />
          @if (fieldError('startsAt'); as msg) {
            <small class="field-error">{{ msg }}</small>
          }
        </label>
        <label
          >Ends<input type="datetime-local" formControlName="endsAt" />
          @if (fieldError('endsAt'); as msg) {
            <small class="field-error">{{ msg }}</small>
          }
        </label>
      </div>
      @if (form.errors?.['dateOrder'] && form.controls.endsAt.touched) {
        <div class="alert">End date must be later than the start date.</div>
      }
      <div class="field-row">
        <label
          >Timezone<input formControlName="timezone" placeholder="Africa/Cairo" />
          @if (fieldError('timezone'); as msg) {
            <small class="field-error">{{ msg }}</small>
          }
        </label>
        <label
          >Capacity<input type="number" formControlName="capacity" min="1" />
          @if (fieldError('capacity'); as msg) {
            <small class="field-error">{{ msg }}</small>
          }
        </label>
      </div>
      @if (error()) {
        <div class="alert">{{ error() }}</div>
      }
      <button class="btn primary full" [disabled]="form.invalid || saving()">
        {{ saving() ? 'Saving…' : editing() ? 'Save changes' : 'Create draft' }}
      </button>
    </form>`,
})
export class ConferenceForm {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private id = this.route.snapshot.paramMap.get('id');
  editing = signal(!!this.id);
  saving = signal(false);
  error = signal('');
  form = new FormGroup(
    {
      title: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(3)],
      }),
      summary: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      venue: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)],
      }),
      city: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)],
      }),
      startsAt: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      endsAt: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      timezone: new FormControl(Intl.DateTimeFormat().resolvedOptions().timeZone, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      capacity: new FormControl(100, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(1)],
      }),
    },
    { validators: dateOrderValidator },
  );
  constructor() {
    if (this.id) {
      this.api.conference(this.id).subscribe((c) =>
        this.form.patchValue({
          title: c.title,
          summary: c.summary,
          venue: c.venue,
          city: c.city,
          startsAt: c.startsAt.slice(0, 16),
          endsAt: c.endsAt.slice(0, 16),
          timezone: c.timezone,
          capacity: c.capacity,
        }),
      );
    }
  }
  fieldError(name: keyof typeof this.form.controls): string {
    const c = this.form.controls[name];
    if (!c.touched || c.valid) return '';
    if (c.errors?.['required']) return 'This field is required.';
    if (c.errors?.['minlength'])
      return `Must be at least ${c.errors['minlength'].requiredLength} characters.`;
    if (c.errors?.['min']) return `Must be at least ${c.errors['min'].min}.`;
    return 'This value is not valid.';
  }
  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    const payload = { ...v, startsAt: this.toIso(v.startsAt), endsAt: this.toIso(v.endsAt) };
    const req = this.id
      ? this.api.updateConference(+this.id, payload)
      : this.api.createConference(payload);
    req.subscribe({
      next: (c) => this.router.navigate(['/conferences']),
      error: (e) => {
        this.error.set(e.error?.message ?? 'Unable to save the conference');
        this.saving.set(false);
      },
    });
  }
  private toIso = (v: string) => (v.length === 16 ? `${v}:00` : v);
}
