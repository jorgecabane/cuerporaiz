import type { User } from "@/lib/domain";
import type { Role } from "@/lib/domain/role";
import type { CenterId } from "@/lib/domain/user";

/**
 * Resultado de autenticación por credenciales.
 * El dominio no conoce cookies ni tokens; eso lo resuelve el adaptador HTTP.
 */
export interface AuthResult {
  user: User;
  role: Role;
  centerId: CenterId;
}

export interface IAuthService {
  /**
   * Valida credenciales y devuelve el usuario y su rol en el centro indicado.
   * Lanza o devuelve error si credenciales inválidas o usuario sin acceso al centro.
   */
  authenticateWithCredentials(
    email: string,
    password: string,
    centerId: CenterId
  ): Promise<AuthResult>;

  /**
   * Hashea una contraseña en claro (para registro).
   */
  hashPassword(plainPassword: string): Promise<string>;

  /**
   * Verifica que la contraseña coincida con el hash.
   */
  verifyPassword(plainPassword: string, hash: string): Promise<boolean>;
}
