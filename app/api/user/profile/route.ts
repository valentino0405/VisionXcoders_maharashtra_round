import { auth, currentUser } from "@clerk/nextjs/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Drop from "@/models/Drop";
import Participation from "@/models/Participation";
import QueueEntry from "@/models/QueueEntry";
import Allocation from "@/models/Allocation";
import {
  aggregateUserActivity,
  buildUserProfilePayload,
} from "@/lib/profile-engine";
import { validateUserProfileInput } from "@/lib/profile-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    await connectToDatabase();

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return Response.json({ error: "CLERK_USER_NOT_FOUND" }, { status: 404 });
    }

    const primaryEmail =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
      clerkUser.emailAddresses[0]?.emailAddress ||
      "";

    // Find or initialize MongoDB User
    let dbUser = await User.findOne({ clerkId: userId });
    if (!dbUser) {
      dbUser = await User.create({
        clerkId: userId,
        email: primaryEmail,
        firstName: clerkUser.firstName || "",
        lastName: clerkUser.lastName || "",
        imageUrl: clerkUser.imageUrl || "",
      });
    } else {
      // Sync basic details from Clerk if empty in MongoDB
      let changed = false;
      if (!dbUser.email && primaryEmail) {
        dbUser.email = primaryEmail;
        changed = true;
      }
      if (!dbUser.imageUrl && clerkUser.imageUrl) {
        dbUser.imageUrl = clerkUser.imageUrl;
        changed = true;
      }
      if (changed) {
        await dbUser.save();
      }
    }

    // Query user's FairDrop activity
    const [participations, queueEntries, allocations] = await Promise.all([
      Participation.find({ clerkId: userId }).lean(),
      QueueEntry.find({ clerkId: userId }).lean(),
      Allocation.find({ clerkId: userId }).lean(),
    ]);

    // Gather drop IDs
    const dropIds = new Set<string>(["fairdrop-demo"]);
    for (const p of participations) dropIds.add(p.dropId);
    for (const q of queueEntries) dropIds.add(q.dropId);
    for (const a of allocations) dropIds.add(a.dropId);

    const drops = await Drop.find({ dropId: { $in: Array.from(dropIds) } }).lean();

    // Map queue positions
    const positions = new Map<string, number>();
    for (const q of queueEntries) {
      const pos = await QueueEntry.countDocuments({
        dropId: q.dropId,
        sequence: { $lte: q.sequence },
      });
      positions.set(`${q.dropId}:${q.sequence}`, pos);
    }

    const activity = aggregateUserActivity({
      clerkId: userId,
      participations: participations.map((p) => ({
        participantId: p.participantId,
        dropId: p.dropId,
        clerkId: p.clerkId,
        joinedAt: p.joinedAt,
        status: p.status,
      })),
      queueEntries: queueEntries.map((q) => ({
        queueEntryId: q.queueEntryId,
        dropId: q.dropId,
        participantId: q.participantId,
        clerkId: q.clerkId,
        sequence: q.sequence,
        status: q.status,
        joinedAt: q.joinedAt,
      })),
      allocations: allocations.map((a) => ({
        allocationId: a.allocationId,
        dropId: a.dropId,
        participantId: a.participantId,
        clerkId: a.clerkId,
        queueEntryId: a.queueEntryId,
        queueSequence: a.queueSequence,
        seatId: a.seatId,
        status: a.status,
        allocatedAt: a.allocatedAt,
      })),
      drops: drops.map((d) => ({
        dropId: d.dropId,
        name: d.name,
        capacity: d.capacity,
        status: d.status,
        startsAt: d.startsAt,
        endsAt: d.endsAt,
      })),
      getQueuePosition: (dropId, sequence) => positions.get(`${dropId}:${sequence}`) ?? sequence,
    });

    const profile = buildUserProfilePayload({
      clerkUser: {
        id: clerkUser.id,
        primaryEmail,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
      },
      dbUser: dbUser.toObject(),
      activity,
    });

    return Response.json({ success: true, profile });
  } catch (error) {
    console.error("[PROFILE_GET_ERROR]", error);
    return Response.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "INVALID_JSON_BODY" }, { status: 400 });
    }

    const validation = validateUserProfileInput(body);
    if (!validation.valid) {
      return Response.json(
        { error: "VALIDATION_FAILED", details: validation.errors },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const updatedUser = await User.findOneAndUpdate(
      { clerkId: userId },
      { $set: validation.sanitized },
      { returnDocument: "after", upsert: true }
    );

    return Response.json({
      success: true,
      message: "Profile updated successfully",
      profile: updatedUser,
    });
  } catch (error) {
    console.error("[PROFILE_PUT_ERROR]", error);
    return Response.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
