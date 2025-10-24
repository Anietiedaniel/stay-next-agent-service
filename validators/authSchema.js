import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const forgotSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const resetSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

// ✅ NEW: Verification schema for /verify-email
export const verifyEmailSchema = z.object({
  token: z.string().min(10, "Verification token is required"),
});

export const imageUploadSchema = z.object({
  image: z
    .any()
    .refine((file) => file instanceof File || (file && file.mimetype), {
      message: "A valid image file is required",
    })
    .refine((file) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      return validTypes.includes(file.mimetype);
    }, {
      message: "Only .jpg, .jpeg, and .png files are allowed",
    })
    .refine((file) => file.size <= 2 * 1024 * 1024, {
      message: "Image must be less than 2MB",
    }),
});


