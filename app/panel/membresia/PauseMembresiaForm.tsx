"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { pauseMembresia } from "./actions";

export function PauseMembresiaForm({ subscriptionId }: { subscriptionId: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <form
      action={async () => {
        setLoading(true);
        await pauseMembresia(subscriptionId);
      }}
    >
      <Button type="submit" variant="secondary" disabled={loading}>
        {loading ? "Pausando…" : "Pausar 1 mes"}
      </Button>
    </form>
  );
}
