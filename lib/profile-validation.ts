export interface UserProfileInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  governmentIdType?: string;
  governmentIdNumber?: string;
  nationality?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  seatPreference?: string;
  dietaryPreference?: string;
  specialAssistance?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized: UserProfileInput;
}

export const VALID_GENDERS = ["MALE", "FEMALE", "NON_BINARY", "PREFER_NOT_TO_SAY", "OTHER"] as const;
export const VALID_GOV_ID_TYPES = ["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE", "AADHAAR", "OTHER"] as const;
export const VALID_SEAT_PREFERENCES = ["ANY", "WINDOW", "AISLE", "FRONT_ROW", "VIP"] as const;
export const VALID_DIETARY_PREFERENCES = ["NONE", "VEGETARIAN", "VEGAN", "HALAL", "KOSHER", "GLUTEN_FREE", "OTHER"] as const;
export const VALID_SPECIAL_ASSISTANCE = ["NONE", "WHEELCHAIR", "VISUAL", "HEARING", "OTHER"] as const;

/**
 * Calculates accurate age based on Date of Birth string (YYYY-MM-DD).
 */
export function calculateAge(dobString: string | null | undefined, referenceDate: Date = new Date()): number | null {
  if (!dobString || typeof dobString !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobString.trim());
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);

  const birthDate = new Date(Date.UTC(year, month, day));
  if (isNaN(birthDate.getTime())) return null;

  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth();
  const refDay = referenceDate.getUTCDate();

  let age = refYear - year;
  if (refMonth < month || (refMonth === month && refDay < day)) {
    age--;
  }

  return age >= 0 && age <= 130 ? age : null;
}

/**
 * Validates and sanitizes user profile input.
 */
export function validateUserProfileInput(
  input: unknown,
  referenceDate: Date = new Date()
): ValidationResult {
  const errors: Record<string, string> = {};
  const sanitized: UserProfileInput = {};

  if (!input || typeof input !== "object") {
    return {
      valid: false,
      errors: { _general: "Invalid input payload" },
      sanitized,
    };
  }

  const raw = input as Record<string, unknown>;

  // First Name (optional update, but if provided must be 1..60 chars)
  if (raw.firstName !== undefined) {
    if (typeof raw.firstName !== "string") {
      errors.firstName = "First name must be a string.";
    } else {
      const trimmed = raw.firstName.trim();
      if (trimmed.length < 1 || trimmed.length > 60) {
        errors.firstName = "First name must be between 1 and 60 characters.";
      } else {
        sanitized.firstName = trimmed;
      }
    }
  }

  // Middle Name (optional, max 60 chars)
  if (raw.middleName !== undefined) {
    if (typeof raw.middleName !== "string") {
      errors.middleName = "Middle name must be a string.";
    } else {
      const trimmed = raw.middleName.trim();
      if (trimmed.length > 60) {
        errors.middleName = "Middle name cannot exceed 60 characters.";
      } else {
        sanitized.middleName = trimmed;
      }
    }
  }

  // Last Name (optional update, but if provided must be 1..60 chars)
  if (raw.lastName !== undefined) {
    if (typeof raw.lastName !== "string") {
      errors.lastName = "Last name must be a string.";
    } else {
      const trimmed = raw.lastName.trim();
      if (trimmed.length < 1 || trimmed.length > 60) {
        errors.lastName = "Last name must be between 1 and 60 characters.";
      } else {
        sanitized.lastName = trimmed;
      }
    }
  }

  // Phone Number
  if (raw.phoneNumber !== undefined) {
    if (typeof raw.phoneNumber !== "string") {
      errors.phoneNumber = "Phone number must be a string.";
    } else {
      const trimmed = raw.phoneNumber.trim();
      if (trimmed === "") {
        sanitized.phoneNumber = "";
      } else {
        const digitsOnly = trimmed.replace(/\D/g, "");
        const validFormat = /^[+]?[\d\s\-().]{7,25}$/.test(trimmed);
        if (digitsOnly.length < 7 || digitsOnly.length > 16 || !validFormat) {
          errors.phoneNumber = "Please provide a valid phone number (e.g. +1 555-0199).";
        } else {
          sanitized.phoneNumber = trimmed;
        }
      }
    }
  }

  // Date of Birth (YYYY-MM-DD)
  if (raw.dateOfBirth !== undefined) {
    if (typeof raw.dateOfBirth !== "string") {
      errors.dateOfBirth = "Date of birth must be a date string (YYYY-MM-DD).";
    } else {
      const trimmed = raw.dateOfBirth.trim();
      if (trimmed === "") {
        sanitized.dateOfBirth = "";
      } else {
        const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
        if (!dateMatch) {
          errors.dateOfBirth = "Date of birth must follow YYYY-MM-DD format.";
        } else {
          const age = calculateAge(trimmed, referenceDate);
          if (age === null) {
            errors.dateOfBirth = "Date of birth must be a realistic valid past date.";
          } else {
            sanitized.dateOfBirth = trimmed;
          }
        }
      }
    }
  }

  // Gender
  if (raw.gender !== undefined) {
    if (typeof raw.gender !== "string") {
      errors.gender = "Gender must be a string.";
    } else {
      const upper = raw.gender.trim().toUpperCase();
      if (upper === "") {
        sanitized.gender = "";
      } else if (!VALID_GENDERS.includes(upper as (typeof VALID_GENDERS)[number])) {
        errors.gender = `Gender must be one of: ${VALID_GENDERS.join(", ")}.`;
      } else {
        sanitized.gender = upper;
      }
    }
  }

  // Government ID Type
  if (raw.governmentIdType !== undefined) {
    if (typeof raw.governmentIdType !== "string") {
      errors.governmentIdType = "Government ID type must be a string.";
    } else {
      const upper = raw.governmentIdType.trim().toUpperCase();
      if (upper === "") {
        sanitized.governmentIdType = "";
      } else if (!VALID_GOV_ID_TYPES.includes(upper as (typeof VALID_GOV_ID_TYPES)[number])) {
        errors.governmentIdType = `ID type must be one of: ${VALID_GOV_ID_TYPES.join(", ")}.`;
      } else {
        sanitized.governmentIdType = upper;
      }
    }
  }

  // Government ID Number
  if (raw.governmentIdNumber !== undefined) {
    if (typeof raw.governmentIdNumber !== "string") {
      errors.governmentIdNumber = "Government ID number must be a string.";
    } else {
      const trimmed = raw.governmentIdNumber.trim();
      if (trimmed.length > 50) {
        errors.governmentIdNumber = "Government ID number cannot exceed 50 characters.";
      } else {
        sanitized.governmentIdNumber = trimmed;
      }
    }
  }

  // Nationality
  if (raw.nationality !== undefined) {
    if (typeof raw.nationality !== "string") {
      errors.nationality = "Nationality must be a string.";
    } else {
      const trimmed = raw.nationality.trim();
      if (trimmed.length > 60) {
        errors.nationality = "Nationality cannot exceed 60 characters.";
      } else {
        sanitized.nationality = trimmed;
      }
    }
  }

  // Emergency Contact Name
  if (raw.emergencyContactName !== undefined) {
    if (typeof raw.emergencyContactName !== "string") {
      errors.emergencyContactName = "Emergency contact name must be a string.";
    } else {
      const trimmed = raw.emergencyContactName.trim();
      if (trimmed.length > 100) {
        errors.emergencyContactName = "Emergency contact name cannot exceed 100 characters.";
      } else {
        sanitized.emergencyContactName = trimmed;
      }
    }
  }

  // Emergency Contact Phone
  if (raw.emergencyContactPhone !== undefined) {
    if (typeof raw.emergencyContactPhone !== "string") {
      errors.emergencyContactPhone = "Emergency contact phone must be a string.";
    } else {
      const trimmed = raw.emergencyContactPhone.trim();
      if (trimmed === "") {
        sanitized.emergencyContactPhone = "";
      } else {
        const digitsOnly = trimmed.replace(/\D/g, "");
        const validFormat = /^[+]?[\d\s\-().]{7,25}$/.test(trimmed);
        if (digitsOnly.length < 7 || digitsOnly.length > 16 || !validFormat) {
          errors.emergencyContactPhone = "Please provide a valid emergency contact phone number.";
        } else {
          sanitized.emergencyContactPhone = trimmed;
        }
      }
    }
  }

  // Seat Preference
  if (raw.seatPreference !== undefined) {
    if (typeof raw.seatPreference !== "string") {
      errors.seatPreference = "Seat preference must be a string.";
    } else {
      const upper = raw.seatPreference.trim().toUpperCase();
      if (upper === "") {
        sanitized.seatPreference = "";
      } else if (!VALID_SEAT_PREFERENCES.includes(upper as (typeof VALID_SEAT_PREFERENCES)[number])) {
        errors.seatPreference = `Seat preference must be one of: ${VALID_SEAT_PREFERENCES.join(", ")}.`;
      } else {
        sanitized.seatPreference = upper;
      }
    }
  }

  // Dietary Preference
  if (raw.dietaryPreference !== undefined) {
    if (typeof raw.dietaryPreference !== "string") {
      errors.dietaryPreference = "Dietary preference must be a string.";
    } else {
      const upper = raw.dietaryPreference.trim().toUpperCase();
      if (upper === "") {
        sanitized.dietaryPreference = "";
      } else if (!VALID_DIETARY_PREFERENCES.includes(upper as (typeof VALID_DIETARY_PREFERENCES)[number])) {
        errors.dietaryPreference = `Dietary preference must be one of: ${VALID_DIETARY_PREFERENCES.join(", ")}.`;
      } else {
        sanitized.dietaryPreference = upper;
      }
    }
  }

  // Special Assistance
  if (raw.specialAssistance !== undefined) {
    if (typeof raw.specialAssistance !== "string") {
      errors.specialAssistance = "Special assistance must be a string.";
    } else {
      const upper = raw.specialAssistance.trim().toUpperCase();
      if (upper === "") {
        sanitized.specialAssistance = "";
      } else if (!VALID_SPECIAL_ASSISTANCE.includes(upper as (typeof VALID_SPECIAL_ASSISTANCE)[number])) {
        errors.specialAssistance = `Special assistance must be one of: ${VALID_SPECIAL_ASSISTANCE.join(", ")}.`;
      } else {
        sanitized.specialAssistance = upper;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}
