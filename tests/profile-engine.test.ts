import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateUserActivity,
  buildUserProfilePayload,
  type AllocationRecord,
  type DropSummary,
  type ParticipationRecord,
  type QueueEntryRecord,
} from "../lib/profile-engine.ts";

test("aggregateUserActivity correctly extracts active queues and confirmed tickets", () => {
  const clerkId = "user_clerk_123";

  const drops: DropSummary[] = [
    {
      dropId: "drop-demo-1",
      name: "Global Launch Drop",
      capacity: 500,
      status: "ACTIVE",
      startsAt: "2026-10-01T10:00:00.000Z",
      endsAt: null,
    },
    {
      dropId: "drop-demo-2",
      name: "VIP Concert Access",
      capacity: 200,
      status: "ACTIVE",
      startsAt: "2026-10-03T18:00:00.000Z",
      endsAt: null,
    },
  ];

  const participations: ParticipationRecord[] = [
    {
      participantId: "p_1",
      dropId: "drop-demo-1",
      clerkId,
      joinedAt: "2026-10-01T10:05:00.000Z",
      status: "JOINED",
    },
    {
      participantId: "p_2",
      dropId: "drop-demo-2",
      clerkId,
      joinedAt: "2026-10-03T18:05:00.000Z",
      status: "JOINED",
    },
  ];

  const queueEntries: QueueEntryRecord[] = [
    {
      queueEntryId: "qe_1",
      dropId: "drop-demo-1",
      participantId: "p_1",
      clerkId,
      sequence: 14,
      status: "ACTIVE",
      joinedAt: "2026-10-01T10:06:00.000Z",
    },
    {
      queueEntryId: "qe_2",
      dropId: "drop-demo-2",
      participantId: "p_2",
      clerkId,
      sequence: 42,
      status: "WAITING",
      joinedAt: "2026-10-03T18:06:00.000Z",
    },
  ];

  const allocations: AllocationRecord[] = [
    {
      allocationId: "alloc_999",
      dropId: "drop-demo-1",
      participantId: "p_1",
      clerkId,
      queueEntryId: "qe_1",
      queueSequence: 14,
      seatId: "A-14",
      status: "ALLOCATED",
      allocatedAt: "2026-10-01T10:10:00.000Z",
    },
  ];

  const activity = aggregateUserActivity({
    clerkId,
    participations,
    queueEntries,
    allocations,
    drops,
    getQueuePosition: (_dropId, sequence) => sequence, // Mock identity position
  });

  // Verify activity stats
  assert.equal(activity.totalDropsJoined, 2);
  assert.equal(activity.totalTicketsConfirmed, 1);
  assert.equal(activity.activeQueues.length, 2);

  // Check queue sorting (newest first)
  assert.equal(activity.activeQueues[0].dropId, "drop-demo-2");
  assert.equal(activity.activeQueues[0].dropName, "VIP Concert Access");
  assert.equal(activity.activeQueues[0].sequence, 42);
  assert.equal(activity.activeQueues[0].position, 42);
  assert.equal(activity.activeQueues[0].status, "WAITING");

  // Check bookings / tickets details
  assert.equal(activity.bookings.length, 1);
  const ticket = activity.bookings[0];
  assert.equal(ticket.bookingId, "alloc_999");
  assert.equal(ticket.eventName, "Global Launch Drop");
  assert.equal(ticket.seatId, "A-14");
  assert.equal(ticket.ticketStatus, "CONFIRMED");
  assert.equal(ticket.paymentStatus, "COMPLETED");
  assert.ok(ticket.qrPayload.includes("alloc_999"));
});

test("buildUserProfilePayload cleanly merges Clerk identity with DB profile", () => {
  const clerkUser = {
    id: "user_test_clerk",
    primaryEmail: "participant@fairdrop.io",
    firstName: "Sarah",
    lastName: "Connor",
    imageUrl: "https://img.clerk.com/avatar.jpg",
  };

  const dbUser = {
    firstName: "Sarah",
    middleName: "Jean",
    lastName: "Connor",
    phoneNumber: "+1 (555) 300-4000",
    dateOfBirth: "1994-08-12",
    gender: "FEMALE",
    governmentIdType: "PASSPORT",
    governmentIdNumber: "USA-882910",
    seatPreference: "WINDOW",
    dietaryPreference: "VEGAN",
    specialAssistance: "NONE",
    createdAt: "2026-01-15T00:00:00.000Z",
  };

  const activity = {
    activeQueues: [],
    bookings: [],
    totalDropsJoined: 0,
    totalTicketsConfirmed: 0,
  };

  const profile = buildUserProfilePayload({
    clerkUser,
    dbUser,
    activity,
  });

  assert.equal(profile.clerkId, "user_test_clerk");
  assert.equal(profile.email, "participant@fairdrop.io");
  assert.equal(profile.fullName, "Sarah Jean Connor");
  assert.equal(profile.middleName, "Jean");
  assert.equal(profile.phoneNumber, "+1 (555) 300-4000");
  assert.equal(profile.governmentIdType, "PASSPORT");
  assert.equal(profile.seatPreference, "WINDOW");
  assert.equal(profile.dietaryPreference, "VEGAN");
  assert.ok(profile.age && profile.age >= 31);
});

test("aggregateUserActivity returns empty lists for user with no activity", () => {
  const activity = aggregateUserActivity({
    clerkId: "new_user",
    participations: [],
    queueEntries: [],
    allocations: [],
    drops: [],
  });

  assert.equal(activity.totalDropsJoined, 0);
  assert.equal(activity.totalTicketsConfirmed, 0);
  assert.deepEqual(activity.activeQueues, []);
  assert.deepEqual(activity.bookings, []);
});
