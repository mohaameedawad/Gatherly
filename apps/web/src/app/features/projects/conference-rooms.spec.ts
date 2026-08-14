import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ConferenceRooms } from './conference-rooms';

const setup = async () => {
  await TestBed.configureTestingModule({
    imports: [ConferenceRooms],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ConferenceRooms);
  const http = TestBed.inject(HttpTestingController);
  http.expectOne('http://localhost:3000/api/conferences/1/rooms').flush([]);
  http.expectOne('http://localhost:3000/api/conferences/1/tracks').flush([]);
  return { component: fixture.componentInstance, http };
};

describe('ConferenceRooms (US-2.2)', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('loads rooms and tracks for the conference', async () => {
    const { component } = await setup();
    expect(component.rooms()).toEqual([]);
    expect(component.tracks()).toEqual([]);
  });

  it('submits a new room and reloads the list', async () => {
    const { component, http } = await setup();
    component.newRoomName = 'Hall A';
    component.newRoomCapacity = 20;
    component.addRoom();
    const post = http.expectOne('http://localhost:3000/api/conferences/1/rooms');
    expect(post.request.method).toBe('POST');
    post.flush({ id: 1, conferenceId: 1, name: 'Hall A', capacity: 20 });
    http
      .expectOne('http://localhost:3000/api/conferences/1/rooms')
      .flush([{ id: 1, conferenceId: 1, name: 'Hall A', capacity: 20 }]);
    expect(component.rooms()[0].name).toBe('Hall A');
    expect(component.newRoomName).toBe('');
  });

  it('does not submit an empty room name', async () => {
    const { component } = await setup();
    component.newRoomName = '   ';
    component.addRoom();
  });

  it('enters and cancels edit mode for a room', async () => {
    const { component } = await setup();
    const room = { id: 5, conferenceId: 1, name: 'Hall B', capacity: 30 };
    component.startRoomEdit(room);
    expect(component.editingRoomId()).toBe(5);
    expect(component.editRoomName).toBe('Hall B');
    component.cancelRoomEdit();
    expect(component.editingRoomId()).toBeNull();
  });

  it('surfaces a room API error without clearing the list', async () => {
    const { component, http } = await setup();
    component.newRoomName = 'Hall A';
    component.addRoom();
    http
      .expectOne('http://localhost:3000/api/conferences/1/rooms')
      .flush({ message: 'That name is already used in this conference' }, { status: 409, statusText: 'Conflict' });
    expect(component.roomError()).toBe('That name is already used in this conference');
  });
});
