import { z } from "zod";

export const usernameSchema = z.string()
  .trim().min(3, "Username deve ter pelo menos 3 caracteres.")
  .max(24, "Username deve ter no máximo 24 caracteres.")
  .regex(/^[a-zA-Z0-9_]+$/, "Use apenas letras, números e underline.")
  .transform(v => v.toLowerCase());

export const passwordSchema = z.string()
  .min(10, "A senha deve ter pelo menos 10 caracteres.")
  .max(72, "A senha deve ter no máximo 72 caracteres.");

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(v => v.password === v.confirmPassword, {
  path: ["confirmPassword"], message: "As senhas não coincidem."
});

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Informe sua senha.").max(72)
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  bio: z.string().trim().max(240).default("")
});