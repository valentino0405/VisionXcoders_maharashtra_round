import { calculateAge, type UserProfileInput } from "./profile-validation.ts";

export interface DropSummary {
  dropId: string;
  name: string;
  capacity: number;
  status: string;
  startsAt: Date | string;
  endsAt: Date | string | null;
}

export interface QueueEntryRecord {
  queueEntryId: string;
  dropId: string;
  participantId: string;
  clerkId: string;
  sequence: number;
  status: "WAITING" | "ACTIVE";
  joinedAt: Date | string;
}

export interface AllocationRecord {
  allocationId: string;
  dropId: string;
  participantId: string;
  clerkId: string;
  queueEntryId: string;
  queueSequence: number;
  seatId: string;
  status: string;
  allocatedAt: Date | string;
}

export interface ParticipationRecord {
  participantId: string;
  dropId: string;
  clerkId: string;
  joinedAt: Date | string;
  status: string;
}

export interface ActiveQueueItem {
  queueEntryId: string;
  dropId: string;
  dropName: string;
  sequence: number;
  position: number;
  status: "WAITING" | "ACTIVE";
  joinedAt: string;
  startsAt: string | null;
  endsAt: string | null;
  capacity: number;
}

export interface BookingTicketItem {
  bookingId: string;
  allocationId: string;
  dropId: string;
  eventName: string;
  seatId: string;
  queueSequence: number;
  ticketStatus: "CONFIRMED" | "ALLOCATED" | "EXPIRED" | "CANCELLED";
  paymentStatus: "COMPLETED" | "FREE_DROP_CLAIM" | "PAID" | "PENDING";
  allocatedAt: string;
  eventDate: string | null;
  qrPayload: string;
}

export interface AggregatedUserActivity {
  activeQueues: ActiveQueueItem[];
  bookings: BookingTicketItem[];
  totalDropsJoined: number;
  totalTicketsConfirmed: number;
}

export interface FullUserProfilePayload {
  clerkId: string;
  email: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  imageUrl: string;
  phoneNumber: string;
  dateOfBirth: string;
  age: number | null;
  gender: string;
  governmentIdType: string;
  governmentIdNumber: string;
  nationality: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  seatPreference: string;
  dietaryPreference: string;
  specialAssistance: string;
  createdAt: string;
  activity: AggregatedUserActivity;
}

/**
 * Aggregates user's queues, allocations, participations, and drops into a clean,
 * deterministic activity profile.
 */
export function aggregateUserActivity(params: {
  clerkId: string;
  participations: ParticipationRecord[];
  queueEntries: QueueEntryRecord[];
  allocations: AllocationRecord[];
  drops: DropSummary[];
  getQueuePosition?: (dropId: string, sequence: number) => number;
}): AggregatedUserActivity {
  const { clerkId, participations, queueEntries, allocations, drops, getQueuePosition } = params;

  const dropMap = new Map<string, DropSummary>();
  for (const drop of drops) {
    dropMap.set(drop.dropId, drop);
  }

  // Active Queues:
  // For each queue entry belonging to this user, determine their position and drop details
  const activeQueues: ActiveQueueItem[] = queueEntries
    .filter((q) => q.clerkId === clerkId)
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
    .map((q) => {
      const drop = dropMap.get(q.dropId);
      const position = getQueuePosition ? getQueuePosition(q.dropId, q.sequence) : q.sequence;
      return {
        queueEntryId: q.queueEntryId,
        dropId: q.dropId,
        dropName: drop?.name ?? q.dropId,
        sequence: q.sequence,
        position,
        status: q.status,
        joinedAt: new Date(q.joinedAt).toISOString(),
        startsAt: drop?.startsAt ? new Date(drop.startsAt).toISOString() : null,
        endsAt: drop?.endsAt ? new Date(drop.endsAt).toISOString() : null,
        capacity: drop?.capacity ?? 500,
      };
    });

  // Bookings / Ticket History:
  // For each allocation, build the verified ticket record
  const bookings: BookingTicketItem[] = allocations
    .filter((a) => a.clerkId === clerkId)
    .sort((a, b) => new Date(b.allocatedAt).getTime() - new Date(a.allocatedAt).getTime())
    .map((a) => {
      const drop = dropMap.get(a.dropId);
      const isAllocated = a.status === "ALLOCATED";
      return {
        bookingId: a.allocationId,
        allocationId: a.allocationId,
        dropId: a.dropId,
        eventName: drop?.name ?? "FairDrop Allocation",
        seatId: a.seatId,
        queueSequence: a.queueSequence,
        ticketStatus: isAllocated ? "CONFIRMED" : "ALLOCATED",
        paymentStatus: "COMPLETED",
        allocatedAt: new Date(a.allocatedAt).toISOString(),
        eventDate: drop?.startsAt ? new Date(drop.startsAt).toISOString() : null,
        qrPayload: `FAIRDROP:TICKET:${a.allocationId}:${a.dropId}:${a.seatId}`,
      };
    });

  const userParticipations = participations.filter((p) => p.clerkId === clerkId);

  return {
    activeQueues,
    bookings,
    totalDropsJoined: userParticipations.length,
    totalTicketsConfirmed: bookings.length,
  };
}

/**
 * Builds the complete unified user profile by merging Clerk identity data with
 * MongoDB profile details and aggregated activity.
 */
export function buildUserProfilePayload(params: {
  clerkUser: {
    id: string;
    primaryEmail: string;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string | null;
  };
  dbUser?: Partial<UserProfileInput> & {
    clerkId?: string;
    email?: string;
    imageUrl?: string;
    createdAt?: Date | string;
  };
  activity: AggregatedUserActivity;
}): FullUserProfilePayload {
  const { clerkUser, dbUser, activity } = params;

  const firstName = dbUser?.firstName || clerkUser.firstName || "";
  const middleName = dbUser?.middleName || "";
  const lastName = dbUser?.lastName || clerkUser.lastName || "";
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
  const dateOfBirth = dbUser?.dateOfBirth || "";
  const age = calculateAge(dateOfBirth);

  return {
    clerkId: clerkUser.id,
    email: clerkUser.primaryEmail || dbUser?.email || "",
    firstName,
    middleName,
    lastName,
    fullName: fullName || "FairDrop Participant",
    imageUrl: dbUser?.imageUrl || clerkUser.imageUrl || "",
    phoneNumber: dbUser?.phoneNumber || "",
    dateOfBirth,
    age,
    gender: dbUser?.gender || "",
    governmentIdType: dbUser?.governmentIdType || "",
    governmentIdNumber: dbUser?.governmentIdNumber || "",
    nationality: dbUser?.nationality || "",
    emergencyContactName: dbUser?.emergencyContactName || "",
    emergencyContactPhone: dbUser?.emergencyContactPhone || "",
    seatPreference: dbUser?.seatPreference || "ANY",
    dietaryPreference: dbUser?.dietaryPreference || "NONE",
    specialAssistance: dbUser?.specialAssistance || "NONE",
    createdAt: dbUser?.createdAt ? new Date(dbUser.createdAt).toISOString() : new Date().toISOString(),
    activity,
  };
}
