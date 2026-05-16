import { auth } from "@/auth";
import { redirect } from "next/navigation";

type SessionUser = {
  role?: string;
};

function getDashboardPath(role?: string) {
  switch (role) {
    case "DOCTOR":
      return "/doctor/dashboard";
    case "RECEPTION":
      return "/reception/dashboard";
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin/dashboard";
    case "PATIENT":
    default:
      return "/patient/dashboard";
  }
}

export default async function HomePage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const role = (session.user as SessionUser).role || "PATIENT";
  redirect(getDashboardPath(role));
}
