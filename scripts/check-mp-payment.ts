import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const PAYMENT_ID = "159192764346";
const MP_USER_ID = "3352249942";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const cfg = await prisma.centerMercadoPagoConfig.findFirst({
    where: { mpUserId: MP_USER_ID },
    include: { center: { select: { id: true, name: true, slug: true } } },
  });

  if (!cfg) {
    console.log(`No center found with mpUserId=${MP_USER_ID}`);
    return;
  }

  console.log("Center:", cfg.center);
  console.log("MP config enabled:", cfg.enabled);
  console.log("Token expires at:", cfg.tokenExpiresAt);

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${PAYMENT_ID}`, {
    headers: { Authorization: `Bearer ${cfg.accessToken}` },
  });

  console.log("\nMP /v1/payments status:", res.status);
  const data = await res.json().catch(() => ({}));
  console.log("Payment data:");
  console.log(JSON.stringify(data, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
