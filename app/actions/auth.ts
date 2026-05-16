"use server"

import { prisma } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["PATIENT", "DOCTOR", "RECEPTION"] as const),
});

export async function register(formData: FormData) {
  try {
    const rawData = Object.fromEntries(formData.entries());

    if (rawData.role === "ADMIN" || rawData.role === "SUPER_ADMIN") {
      return {
        success: false,
        error: "Admin accounts must be created by an existing administrator.",
      };
    }

    const validated = registerSchema.safeParse(rawData);

    if (!validated.success) {
      return { 
        success: false, 
        error: "Validation failed", 
        details: validated.error.flatten().fieldErrors 
      };
    }

    const { name, email, password, role } = validated.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return { success: false, error: "User with this email already exists" };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: role as UserRole,
        }
      });

      // Create role-specific profile
      if (role === "PATIENT") {
        await tx.patientProfile.create({
          data: { userId: user.id }
        });
      } else if (role === "DOCTOR") {
        await tx.doctorProfile.create({
          data: { 
            userId: user.id,
            specialization: "General Physician" // Default for now
          }
        });
      } else if (role === "RECEPTION") {
        await tx.receptionProfile.create({
          data: { userId: user.id }
        });
      }

      return user;
    });

    return { success: true, userId: result.id };
  } catch (error) {
    console.error("[REGISTER_ERROR]", error);
    return { success: false, error: "An unexpected error occurred during registration." };
  }
}
