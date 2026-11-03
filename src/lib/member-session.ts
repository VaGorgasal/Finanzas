import { ServiceError } from "./service-error.ts";
type VerifiedMember = { id: string; isAnonymous: boolean };
type Dependencies = {
  enabled: boolean;
  configured: boolean;
  betaUserIds?: string;
  verify: (token: string) => Promise<VerifiedMember | null>;
};
/** Session verification for fixed, cached public data. Does not consume a paid-provider quota. */
export async function memberSession(
  request: Request,
  deps: Dependencies,
): Promise<string> {
  if (!deps.enabled || !deps.configured)
    throw new ServiceError(
      "Servicio pendiente de activación. Puedes seguir usando las funciones locales.",
    );
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (\S+)$/)?.[1];
  if (!token)
    throw new ServiceError(
      "Inicia sesión en Mi cuenta para usar este servicio.",
      401,
    );
  const member = await deps.verify(token);
  if (!member?.id || member.isAnonymous)
    throw new ServiceError(
      "La sesión no es válida. Vuelve a iniciar sesión.",
      401,
    );
  if (
    deps.betaUserIds &&
    !deps.betaUserIds
      .split(",")
      .map((x) => x.trim())
      .includes(member.id)
  )
    throw new ServiceError(
      "Tu cuenta todavía no tiene acceso a la beta de servicios.",
      403,
    );
  return member.id;
}
