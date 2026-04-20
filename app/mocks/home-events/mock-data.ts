export type MockEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: Date;
  location: string;
  price: string;
  image: string;
  tag: string;
};

const now = new Date("2026-04-18T10:00:00-04:00");

function daysFromNow(days: number, hour = 18): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export const MOCK_EVENTS: MockEvent[] = [
  {
    id: "1",
    title: "Círculo de luna llena",
    description: "Encuentro guiado de meditación y escritura para honrar el ciclo.",
    startsAt: daysFromNow(6, 19),
    location: "Cuerpo Raíz, Santiago",
    price: "$12.000",
    tag: "Encuentro",
    image: "https://images.unsplash.com/photo-1528319725582-ddc096101511?w=800&q=80",
  },
  {
    id: "2",
    title: "Taller de respiración consciente",
    description: "Una tarde para conocer tu respiración y aprender técnicas que puedes llevar contigo.",
    startsAt: daysFromNow(14, 17),
    location: "Cuerpo Raíz, Santiago",
    price: "$25.000",
    tag: "Taller",
    image: "https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80",
  },
  {
    id: "3",
    title: "Retiro de fin de semana",
    description: "Dos días de práctica, silencio, comida nutritiva y naturaleza. Cupos limitados.",
    startsAt: daysFromNow(28, 9),
    location: "Cajón del Maipo",
    price: "$180.000",
    tag: "Retiro",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
  },
  {
    id: "4",
    title: "Conversatorio: sexualidad y cuerpo",
    description: "Charla abierta con invitadas especiales. Un espacio para hacer preguntas.",
    startsAt: daysFromNow(42, 19),
    location: "Online",
    price: "Gratis",
    tag: "Charla",
    image: "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800&q=80",
  },
];
