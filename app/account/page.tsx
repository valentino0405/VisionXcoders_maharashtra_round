import { currentUser } from "@clerk/nextjs/server";
import { UserProfile } from "@clerk/nextjs";
import { Shield, Clock, Ticket } from "lucide-react";

export default async function AccountPage() {
  const user = await currentUser();
  
  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-6 w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
      {/* Sidebar Profile info */}
      <div className="w-full md:w-1/3 flex flex-col gap-6">
        <div className="glass-card rounded-2xl p-6 border border-white/10">
          <h2 className="text-xl font-bold mb-6 text-white border-b border-white/10 pb-4">Profile</h2>
          {/* We could use Clerk's UserProfile but it brings its own heavy styling. 
              We'll use a custom UI for the summary and maybe embed Clerk below if needed. */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-violet-600 flex items-center justify-center text-white text-xl font-bold">
              {user?.firstName?.[0] || "U"}
            </div>
            <div>
              <div className="font-bold text-lg text-white">{user?.firstName} {user?.lastName}</div>
              <div className="text-sm text-gray-400">{user?.emailAddresses[0]?.emailAddress}</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-400 text-sm">Account Status</span>
              <span className="text-green-400 text-sm font-medium flex items-center gap-1"><Shield className="h-3 w-3" /> Verified</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-gray-400 text-sm">Member Since</span>
              <span className="text-white text-sm">Oct 2026</span>
            </div>
          </div>
        </div>
        
        {/* You can still mount the Clerk UI if you want them to manage passwords etc */}
        <div className="rounded-2xl overflow-hidden [&_.cl-rootBox]:w-full [&_.cl-card]:bg-[#0a0a0a] [&_.cl-card]:border [&_.cl-card]:border-white/10 [&_.cl-headerTitle]:text-white [&_.cl-headerSubtitle]:text-gray-400">
          <UserProfile routing="hash" />
        </div>
      </div>
      
      {/* Main Content: History */}
      <div className="w-full md:w-2/3 flex flex-col gap-6">
        <div className="glass-card rounded-2xl p-6 border border-white/10">
          <h2 className="text-xl font-bold mb-6 text-white border-b border-white/10 pb-4">Participation History</h2>
          
          <div className="space-y-4">
            {/* Mock History Item 1 */}
            <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center mt-1 shrink-0">
                  <Ticket className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Global Launch Drop</h3>
                  <p className="text-gray-400 text-sm flex items-center gap-1"><Clock className="h-3 w-3" /> Oct 3, 2026</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-green-400 font-bold mb-1">Allocated</div>
                <div className="text-sm text-gray-500 font-mono">Seat A-184</div>
              </div>
            </div>

            {/* Mock History Item 2 */}
            <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-500/20 flex items-center justify-center mt-1 shrink-0">
                  <Ticket className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Beta Test Drop</h3>
                  <p className="text-gray-400 text-sm flex items-center gap-1"><Clock className="h-3 w-3" /> Sep 15, 2026</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-gray-400 font-bold mb-1">Missed</div>
                <div className="text-sm text-gray-500 font-mono">Queue #12,401</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
