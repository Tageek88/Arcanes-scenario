import { addDays, format } from "date-fns";

/**
 * Les dates des séances d'exemple sont recalculées à l'ajout : la séance jouée est dans le passé, la séance planifiée dans le futur,
 * quelle que soit la date du jour (sinon la séance planifiée finit par être « passée » et disparaît des prochaines sessions).
 */
export function withRelativeSessionDates(sessions, now = new Date()) {
  return sessions.map((session) => ({
    ...session,
    date: format(addDays(now, session.status === "jouee" ? -14 : 10), "yyyy-MM-dd"),
  }));
}
