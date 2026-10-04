import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log("MongoDB user sync started");
  try {
    const { userId } = await auth();

    if (!userId) {
      console.log("Clerk authentication failed: No user ID");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    console.log(`Clerk user ID: ${userId}`);

    try {
      console.log("MongoDB: attempting connection");
      await connectToDatabase();
      console.log("MongoDB: connected");
      console.log("MongoDB database: bitnbuild");
    } catch (dbError) {
      console.error("MongoDB connection failed", dbError);
      return new NextResponse("MongoDB connection failed", { status: 500 });
    }

    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      console.log("Clerk authentication failed: User not found in Clerk");
      return new NextResponse("User not found in Clerk", { status: 404 });
    }

    const primaryEmail = clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

    try {
      // Sync user: update if exists, create if doesn't exist
      const user = await User.findOneAndUpdate(
        { clerkId: clerkUser.id },
        {
          $set: {
            email: primaryEmail,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            imageUrl: clerkUser.imageUrl,
          },
        },
        { upsert: true, returnDocument: "after" }
      );
      
      console.log("MongoDB user found/created");
      return NextResponse.json(user);
    } catch (syncError) {
      console.error("MongoDB user creation failed", syncError);
      return new NextResponse("MongoDB user creation failed", { status: 500 });
    }

  } catch (error) {
    console.error("[ME_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
