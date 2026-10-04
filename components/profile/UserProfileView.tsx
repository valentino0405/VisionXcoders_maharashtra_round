"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  Armchair,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  QrCode,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
  UserCheck,
} from "lucide-react";
import {
  calculateAge,
  VALID_DIETARY_PREFERENCES,
  VALID_GENDERS,
  VALID_GOV_ID_TYPES,
  VALID_SEAT_PREFERENCES,
  VALID_SPECIAL_ASSISTANCE,
} from "@/lib/profile-validation";
import type { FullUserProfilePayload } from "@/lib/profile-engine";

interface ProfileFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phoneNumber: string;
  governmentIdType: string;
  governmentIdNumber: string;
  nationality: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  seatPreference: string;
  dietaryPreference: string;
  specialAssistance: string;
}

export default function UserProfileView() {
  const [profile, setProfile] = useState<FullUserProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "queues" | "tickets">("profile");

  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    phoneNumber: "",
    governmentIdType: "",
    governmentIdNumber: "",
    nationality: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    seatPreference: "ANY",
    dietaryPreference: "NONE",
    specialAssistance: "NONE",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, startSaving] = useTransition();

  async function reloadProfile() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/profile", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          setError("Please sign in to view your profile and activity.");
        } else {
          setError("Failed to load user profile. Please try again.");
        }
        return;
      }
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setFormData({
          firstName: data.profile.firstName || "",
          middleName: data.profile.middleName || "",
          lastName: data.profile.lastName || "",
          dateOfBirth: data.profile.dateOfBirth || "",
          gender: data.profile.gender || "",
          phoneNumber: data.profile.phoneNumber || "",
          governmentIdType: data.profile.governmentIdType || "",
          governmentIdNumber: data.profile.governmentIdNumber || "",
          nationality: data.profile.nationality || "",
          emergencyContactName: data.profile.emergencyContactName || "",
          emergencyContactPhone: data.profile.emergencyContactPhone || "",
          seatPreference: data.profile.seatPreference || "ANY",
          dietaryPreference: data.profile.dietaryPreference || "NONE",
          specialAssistance: data.profile.specialAssistance || "NONE",
        });
      }
    } catch {
      setError("Network error while loading your profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          if (res.status === 401) {
            setError("Please sign in to view your profile and activity.");
          } else {
            setError("Failed to load user profile. Please try again.");
          }
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (data.profile) {
          setProfile(data.profile);
          setFormData({
            firstName: data.profile.firstName || "",
            middleName: data.profile.middleName || "",
            lastName: data.profile.lastName || "",
            dateOfBirth: data.profile.dateOfBirth || "",
            gender: data.profile.gender || "",
            phoneNumber: data.profile.phoneNumber || "",
            governmentIdType: data.profile.governmentIdType || "",
            governmentIdNumber: data.profile.governmentIdNumber || "",
            nationality: data.profile.nationality || "",
            emergencyContactName: data.profile.emergencyContactName || "",
            emergencyContactPhone: data.profile.emergencyContactPhone || "",
            seatPreference: data.profile.seatPreference || "ANY",
            dietaryPreference: data.profile.dietaryPreference || "NONE",
            specialAssistance: data.profile.specialAssistance || "NONE",
          });
        }
      } catch {
        if (!cancelled) {
          setError("Network error while loading your profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setSaveSuccess(false);
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaveSuccess(false);
    setFormErrors({});

    startSaving(async () => {
      try {
        const res = await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.details) {
            setFormErrors(data.details);
          } else {
            setFormErrors({ _general: data.error || "Failed to update profile." });
          }
          return;
        }

        setSaveSuccess(true);
        // Refresh aggregated data
        await reloadProfile();
        setTimeout(() => setSaveSuccess(false), 5000);
      } catch {
        setFormErrors({ _general: "Network error while saving changes." });
      }
    });
  }

  // Calculated Age
  const liveAge = calculateAge(formData.dateOfBirth);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
        <p className="text-sm font-medium text-slate-400">Loading FairDrop Profile & Activity…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-red-500/20 bg-red-950/20 p-8 text-center shadow-xl backdrop-blur-xl">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-xl font-bold text-white">Profile Unavailable</h2>
        <p className="mt-2 text-sm text-slate-300">{error}</p>
        <div className="mt-6 flex justify-center gap-4">
          <button
            type="button"
            onClick={reloadProfile}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-105"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const initials =
    (profile?.firstName?.[0] || "") + (profile?.lastName?.[0] || "") ||
    profile?.email?.[0]?.toUpperCase() ||
    "U";

  const activeQueues = profile?.activity?.activeQueues || [];
  const bookings = profile?.activity?.bookings || [];

  return (
    <div className="space-y-8">
      {/* Top Banner with Quick Summary */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-200/10 bg-gradient-to-br from-[#0c1930]/90 via-[#071325]/90 to-[#040813]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            {profile?.imageUrl ? (
              <Image
                src={profile.imageUrl}
                alt={profile.fullName}
                width={72}
                height={72}
                className="h-16 w-16 rounded-2xl border-2 border-cyan-400/30 object-cover shadow-[0_0_24px_rgba(34,211,238,0.25)] sm:h-20 sm:w-20"
                unoptimized
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-cyan-400/30 bg-gradient-to-br from-blue-600 to-cyan-400 text-2xl font-black text-white shadow-[0_0_24px_rgba(34,211,238,0.25)] sm:h-20 sm:w-20">
                {initials}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {profile?.fullName || "FairDrop Participant"}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{profile?.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-cyan-300" />
                  Clerk ID: <span className="font-mono text-slate-300">{profile?.clerkId.slice(0, 14)}...</span>
                </span>
                {liveAge !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-cyan-200">
                    Age: {liveAge} yrs
                  </span>
                )}
                {profile?.gender && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-300">
                    {profile.gender}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <div className="rounded-2xl border border-white/[0.08] bg-black/30 px-4 py-3 text-center min-w-[5.5rem]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Queues
              </div>
              <div className="mt-1 font-mono text-xl font-black text-cyan-300">
                {activeQueues.length}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-black/30 px-4 py-3 text-center min-w-[5.5rem]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tickets Confirmed
              </div>
              <div className="mt-1 font-mono text-xl font-black text-emerald-300">
                {bookings.length}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-black/30 px-4 py-3 text-center min-w-[5.5rem]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Drops Joined
              </div>
              <div className="mt-1 font-mono text-xl font-black text-indigo-300">
                {profile?.activity?.totalDropsJoined ?? 0}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="mt-8 flex border-b border-white/[0.08] gap-2 overflow-x-auto pb-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all ${
              activeTab === "profile"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <User className="h-4 w-4" />
            Passenger Profile
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("queues")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all ${
              activeTab === "queues"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Radio className="h-4 w-4" />
            Active Queues
            {activeQueues.length > 0 && (
              <span className="ml-1 rounded-full bg-cyan-400/20 px-2 py-0.5 text-xs text-cyan-300">
                {activeQueues.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tickets")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all ${
              activeTab === "tickets"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Ticket className="h-4 w-4" />
            Ticket & Booking History
            {bookings.length > 0 && (
              <span className="ml-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs text-emerald-300">
                {bookings.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ──────────────── TAB 1: PASSENGER PROFILE FORM ──────────────── */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {saveSuccess && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <span>Your profile and passenger details have been saved successfully.</span>
            </div>
          )}

          {formErrors._general && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
              <span>{formErrors._general}</span>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Identity & Personal Info */}
            <div className="space-y-5 rounded-3xl border border-white/[0.08] bg-[#071124]/80 p-6 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-2.5 border-b border-white/[0.08] pb-3 text-cyan-300">
                <User className="h-5 w-5" />
                <h3 className="font-bold text-white text-base">Personal Information</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="firstName" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    First Name <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    placeholder="Jane"
                    required
                  />
                  {formErrors.firstName && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="middleName" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Middle Name <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    id="middleName"
                    name="middleName"
                    type="text"
                    value={formData.middleName}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    placeholder="Anne"
                  />
                  {formErrors.middleName && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.middleName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Last Name <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    placeholder="Doe"
                    required
                  />
                  {formErrors.lastName && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="dateOfBirth" className="block text-xs font-semibold text-slate-300">
                      Date of Birth
                    </label>
                    {liveAge !== null && (
                      <span className="text-[11px] font-mono text-cyan-300">
                        Age: {liveAge} yrs
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                  {formErrors.dateOfBirth && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.dateOfBirth}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="gender" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    <option value="" className="bg-[#0b1629]">Select Gender</option>
                    {VALID_GENDERS.map((g) => (
                      <option key={g} value={g} className="bg-[#0b1629]">
                        {g.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  {formErrors.gender && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.gender}</p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      value={profile?.email || ""}
                      readOnly
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-400"
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-semibold uppercase text-emerald-400">
                      Clerk ID
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Primary login identity managed through Clerk.
                  </p>
                </div>

                <div>
                  <label htmlFor="phoneNumber" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 000-0000"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                  {formErrors.phoneNumber && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.phoneNumber}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Travel & Passenger Ticket Verification */}
            <div className="space-y-5 rounded-3xl border border-white/[0.08] bg-[#071124]/80 p-6 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-2.5 border-b border-white/[0.08] pb-3 text-cyan-300">
                <FileText className="h-5 w-5" />
                <h3 className="font-bold text-white text-base">Travel & Passenger Verification</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="governmentIdType" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Government ID Type
                  </label>
                  <select
                    id="governmentIdType"
                    name="governmentIdType"
                    value={formData.governmentIdType}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    <option value="" className="bg-[#0b1629]">Select ID Type</option>
                    {VALID_GOV_ID_TYPES.map((id) => (
                      <option key={id} value={id} className="bg-[#0b1629]">
                        {id.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  {formErrors.governmentIdType && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.governmentIdType}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="governmentIdNumber" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    ID / Document Number
                  </label>
                  <input
                    id="governmentIdNumber"
                    name="governmentIdNumber"
                    type="text"
                    value={formData.governmentIdNumber}
                    onChange={handleInputChange}
                    placeholder="e.g. A12345678"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                  {formErrors.governmentIdNumber && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.governmentIdNumber}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="nationality" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nationality / Country of Citizenship
                </label>
                <input
                  id="nationality"
                  name="nationality"
                  type="text"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  placeholder="e.g. United States, India, Canada"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
                {formErrors.nationality && (
                  <p className="mt-1 text-xs text-red-400">{formErrors.nationality}</p>
                )}
              </div>

              {/* Emergency Contact */}
              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div>
                  <label htmlFor="emergencyContactName" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Emergency Contact Name
                  </label>
                  <input
                    id="emergencyContactName"
                    name="emergencyContactName"
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={handleInputChange}
                    placeholder="Full name"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                  {formErrors.emergencyContactName && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.emergencyContactName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="emergencyContactPhone" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Emergency Contact Phone
                  </label>
                  <input
                    id="emergencyContactPhone"
                    name="emergencyContactPhone"
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={handleInputChange}
                    placeholder="+1 555-0199"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                  {formErrors.emergencyContactPhone && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.emergencyContactPhone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Event & Seating Preferences (Span 2 cols) */}
            <div className="space-y-5 rounded-3xl border border-white/[0.08] bg-[#071124]/80 p-6 shadow-xl backdrop-blur-xl lg:col-span-2">
              <div className="flex items-center gap-2.5 border-b border-white/[0.08] pb-3 text-cyan-300">
                <Armchair className="h-5 w-5" />
                <h3 className="font-bold text-white text-base">Drop & Seat Allocation Preferences</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="seatPreference" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Preferred Seat Placement
                  </label>
                  <select
                    id="seatPreference"
                    name="seatPreference"
                    value={formData.seatPreference}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    {VALID_SEAT_PREFERENCES.map((sp) => (
                      <option key={sp} value={sp} className="bg-[#0b1629]">
                        {sp.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="dietaryPreference" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Dietary Requirements
                  </label>
                  <select
                    id="dietaryPreference"
                    name="dietaryPreference"
                    value={formData.dietaryPreference}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    {VALID_DIETARY_PREFERENCES.map((dp) => (
                      <option key={dp} value={dp} className="bg-[#0b1629]">
                        {dp.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="specialAssistance" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Special Assistance & Accessibility
                  </label>
                  <select
                    id="specialAssistance"
                    name="specialAssistance"
                    value={formData.specialAssistance}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    {VALID_SPECIAL_ASSISTANCE.map((sa) => (
                      <option key={sa} value={sa} className="bg-[#0b1629]">
                        {sa.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-4">
            <span className="text-xs text-slate-500">
              Your details are encrypted and preserved securely for fair drop verification.
            </span>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-7 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(37,99,235,0.35)] transition duration-300 hover:scale-[1.02] hover:shadow-[0_0_32px_rgba(6,182,212,0.5)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Changes…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Save Profile Changes
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ──────────────── TAB 2: ACTIVE QUEUES ──────────────── */}
      {activeTab === "queues" && (
        <div className="space-y-6">
          {activeQueues.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-[#071124]/60 p-12 text-center backdrop-blur-xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                <Radio className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">No Active Queue Entries</h3>
              <p className="mt-2 max-w-md text-sm text-slate-400">
                You are not currently waiting in any drop queues. Open drops assign a fair, server-side queue position when you join.
              </p>
              <Link
                href="/drop"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105"
              >
                Explore Active Drops
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {activeQueues.map((queue) => (
                <div
                  key={queue.queueEntryId}
                  className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#0c1a32]/95 via-[#071224]/95 to-[#040813]/95 p-6 shadow-xl backdrop-blur-2xl"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        Queue Active
                      </span>
                      <h4 className="mt-2 text-lg font-bold text-white">{queue.dropName}</h4>
                      <p className="text-xs text-slate-400 font-mono">Drop ID: {queue.dropId}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-semibold text-slate-500">Queue Position</div>
                      <div className="font-mono text-3xl font-black text-cyan-300">
                        #{queue.position}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5">Sequence Number</span>
                      <span className="font-mono text-slate-200 font-semibold">{queue.sequence}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-0.5">Queue Status</span>
                      <span className="font-semibold text-cyan-300">{queue.status}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-0.5">Joined Time</span>
                      <span className="text-slate-300">
                        {new Date(queue.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-0.5">Drop Capacity</span>
                      <span className="font-mono text-slate-300">{queue.capacity} participants</span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href="/queue"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500/15 border border-cyan-400/30 px-4 py-2.5 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/25"
                    >
                      <Radio className="h-3.5 w-3.5" />
                      Live Queue Monitor
                    </Link>

                    <Link
                      href="/ticket"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      Ticket Room
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 3: TICKET & BOOKING HISTORY ──────────────── */}
      {activeTab === "tickets" && (
        <div className="space-y-6">
          {bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-[#071124]/60 p-12 text-center backdrop-blur-xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                <Ticket className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-white">No Confirmed Bookings Yet</h3>
              <p className="mt-2 max-w-md text-sm text-slate-400">
                When you participate in a drop and claim your allocation, your verified ticket pass and seat reservation will appear here.
              </p>
              <div className="mt-6 flex gap-4">
                <Link
                  href="/drop"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105"
                >
                  Join Next Drop
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/ticket"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10"
                >
                  Preview Ticket Pass
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.bookingId}
                  className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#0c1a32]/95 via-[#071325]/95 to-[#040813]/95 p-6 shadow-xl backdrop-blur-2xl transition hover:border-cyan-400/40"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                        <Ticket className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xl font-bold text-white">{booking.eventName}</h4>
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                            {booking.ticketStatus}
                          </span>
                          <span className="rounded-full border border-blue-400/30 bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                            {booking.paymentStatus}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="font-mono">Ref: {booking.bookingId}</span>
                          <span>•</span>
                          <span>Drop: {booking.dropId}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:text-right">
                      <div className="rounded-2xl border border-white/[0.08] bg-black/40 px-4 py-2.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Allocated Seat
                        </div>
                        <div className="font-mono text-2xl font-black text-cyan-300">
                          {booking.seatId}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-4 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5">Booking Timestamp</span>
                      <span className="font-mono text-slate-300">
                        {new Date(booking.allocatedAt).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-0.5">Queue Sequence</span>
                      <span className="font-mono text-slate-300">#{booking.queueSequence}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-0.5">Cryptographic Integrity</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                        <ShieldCheck className="h-3.5 w-3.5" /> HMAC Signed
                      </span>
                    </div>

                    <div className="flex items-center sm:justify-end">
                      <Link
                        href={`/ticket?allocationId=${encodeURIComponent(booking.allocationId)}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:scale-105"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        View Ticket Pass
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
