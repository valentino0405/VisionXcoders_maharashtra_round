import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAge,
  validateUserProfileInput,
} from "../lib/profile-validation.ts";

test("calculateAge correctly determines age from date of birth", () => {
  const refDate = new Date("2026-10-04T00:00:00.000Z");

  // Birthday hasn't happened yet this year (Dec 15)
  assert.equal(calculateAge("1995-12-15", refDate), 30);

  // Birthday already happened this year (Jan 10)
  assert.equal(calculateAge("1995-01-10", refDate), 31);

  // Birthday is today (Oct 04)
  assert.equal(calculateAge("2000-10-04", refDate), 26);

  // Future date is invalid
  assert.equal(calculateAge("2030-01-01", refDate), null);

  // Unrealistic age (>130) is invalid
  assert.equal(calculateAge("1850-01-01", refDate), null);

  // Invalid date format or non-string
  assert.equal(calculateAge("invalid-date", refDate), null);
  assert.equal(calculateAge("", refDate), null);
  assert.equal(calculateAge(null, refDate), null);
});

test("validateUserProfileInput accepts valid passenger profile data", () => {
  const input = {
    firstName: "Jane",
    middleName: "Marie",
    lastName: "Doe",
    dateOfBirth: "1998-05-20",
    gender: "female",
    phoneNumber: "+1 (555) 234-5678",
    governmentIdType: "passport",
    governmentIdNumber: "P12345678",
    nationality: "United States",
    emergencyContactName: "John Doe",
    emergencyContactPhone: "+1 (555) 987-6543",
    seatPreference: "window",
    dietaryPreference: "vegetarian",
    specialAssistance: "none",
  };

  const result = validateUserProfileInput(input, new Date("2026-10-04T00:00:00.000Z"));
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
  assert.equal(result.sanitized.firstName, "Jane");
  assert.equal(result.sanitized.middleName, "Marie");
  assert.equal(result.sanitized.lastName, "Doe");
  assert.equal(result.sanitized.gender, "FEMALE");
  assert.equal(result.sanitized.governmentIdType, "PASSPORT");
  assert.equal(result.sanitized.seatPreference, "WINDOW");
  assert.equal(result.sanitized.dietaryPreference, "VEGETARIAN");
});

test("validateUserProfileInput rejects invalid inputs with clear error messages", () => {
  const input = {
    firstName: "",
    middleName: "A".repeat(70),
    lastName: "",
    dateOfBirth: "invalid-dob",
    gender: "UNKNOWN_GENDER",
    phoneNumber: "not-a-phone",
    governmentIdType: "STUDENT_ID",
    governmentIdNumber: "A".repeat(60),
    emergencyContactPhone: "123",
    seatPreference: "ROOF_SEAT",
  };

  const result = validateUserProfileInput(input);
  assert.equal(result.valid, false);
  assert.ok(result.errors.firstName);
  assert.ok(result.errors.middleName);
  assert.ok(result.errors.lastName);
  assert.ok(result.errors.dateOfBirth);
  assert.ok(result.errors.gender);
  assert.ok(result.errors.phoneNumber);
  assert.ok(result.errors.governmentIdType);
  assert.ok(result.errors.governmentIdNumber);
  assert.ok(result.errors.emergencyContactPhone);
  assert.ok(result.errors.seatPreference);
});

test("validateUserProfileInput allows clearing optional fields with empty strings", () => {
  const input = {
    phoneNumber: "",
    dateOfBirth: "",
    gender: "",
    governmentIdType: "",
    emergencyContactPhone: "",
  };

  const result = validateUserProfileInput(input);
  assert.equal(result.valid, true);
  assert.equal(result.sanitized.phoneNumber, "");
  assert.equal(result.sanitized.dateOfBirth, "");
  assert.equal(result.sanitized.gender, "");
});
