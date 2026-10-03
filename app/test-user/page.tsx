"use client";

import { useUser, SignInButton, SignUpButton, SignOutButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function TestUserPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [mongoUser, setMongoUser] = useState<any>(null);
  const [mongoStatus, setMongoStatus] = useState<string>("Loading...");

  const fetchUser = async () => {
    setMongoStatus("Fetching...");
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setMongoUser(data);
        setMongoStatus("Found");
      } else {
        const text = await res.text();
        setMongoStatus(`Error: ${res.status} - ${text}`);
      }
    } catch (err: any) {
      setMongoStatus(`Network Error: ${err.message}`);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchUser();
    } else {
      setMongoUser(null);
      setMongoStatus("Not Signed In");
    }
  }, [isSignedIn]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Clerk + MongoDB Atlas Test Page</h1>
      
      <div className="mb-4">
        <strong>Authentication Status:</strong> {isSignedIn ? "Signed in" : "Signed out"}
      </div>

      {!isSignedIn && (
        <div className="flex gap-4">
          <SignInButton mode="modal" forceRedirectUrl="/test-user">
            <button className="px-4 py-2 bg-blue-500 text-white rounded">Sign In</button>
          </SignInButton>
          <SignUpButton mode="modal" forceRedirectUrl="/test-user">
            <button className="px-4 py-2 bg-green-500 text-white rounded">Sign Up</button>
          </SignUpButton>
        </div>
      )}

      {isSignedIn && (
        <div className="flex flex-col gap-4">
          <div className="p-4 border rounded">
            <p><strong>Clerk User ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.primaryEmailAddress?.emailAddress}</p>
            <p><strong>Name:</strong> {user.fullName}</p>
          </div>

          <div className="p-4 border rounded">
            <p><strong>MongoDB Atlas User:</strong> {mongoStatus}</p>
            {mongoUser && (
              <div>
                <strong>MongoDB Record:</strong>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-auto text-black">
                  {JSON.stringify(mongoUser, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div>
            <SignOutButton>
              <button className="px-4 py-2 bg-red-500 text-white rounded">Sign Out</button>
            </SignOutButton>
          </div>
        </div>
      )}
    </div>
  );
}
