/**
 * Authentication helper utilities
 */

export function getInitials(name = "") {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function formatRole(role = "PATIENT") {
  switch (role?.toUpperCase()) {
    case "ADMIN":
      return "Administrator";
    case "DOCTOR":
      return "Medical Doctor";
    case "PATIENT":
    default:
      return "Verified Patient";
  }
}

export function checkPasswordStrength(password = "") {
  let score = 0;
  if (!password) return { score: 0, label: "Empty", color: "bg-slate-200" };

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500", textClass: "text-rose-600" };
  if (score <= 3) return { score: 2, label: "Medium", color: "bg-amber-500", textClass: "text-amber-600" };
  if (score === 4) return { score: 3, label: "Strong", color: "bg-emerald-500", textClass: "text-emerald-600" };
  return { score: 4, label: "Very Strong", color: "bg-teal-600", textClass: "text-teal-600" };
}

