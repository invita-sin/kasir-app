import { AuthService } from "@/lib/services/auth.service";

export const signToken = AuthService.signToken.bind(AuthService);
export const verifyToken = AuthService.verifyToken.bind(AuthService);
