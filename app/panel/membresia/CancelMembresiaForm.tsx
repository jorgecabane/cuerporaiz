"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cancelMembresia } from "./actions";

export function CancelMembresiaForm({ subscriptionId }: { subscriptionId: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <form
      action={async () => {
        setLoading(true);
        await cancelMembresia(subscriptionId);
      }}
    >
      <Button type="submit" variant="secondary" disabled={loading} className="border-red-300 text-red-700 hover:bg-red-50">
        {loading ? "Cancelando…" : "Dar de baja"}
      </Button>
    </form>
  );
}
