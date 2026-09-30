export interface NewsletterSubscriber {
  id: string;
  centerId: string;
  email: string;
  subscribedAt: Date;
  unsubscribedAt: Date | null;
}

export interface INewsletterSubscriberRepository {
  /** Crea o reactiva la suscripción (email ya normalizado). */
  subscribe(centerId: string, email: string): Promise<void>;
  /** Marca la baja si existe; no crea filas. */
  unsubscribe(centerId: string, email: string): Promise<void>;
  listByCenter(centerId: string): Promise<NewsletterSubscriber[]>;
  listActiveEmails(centerId: string): Promise<string[]>;
}
