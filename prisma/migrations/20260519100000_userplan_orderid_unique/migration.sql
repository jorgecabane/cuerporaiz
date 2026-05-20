-- Defense-in-depth: previene minteo duplicado de UserPlan por retries concurrentes
-- del webhook MP. Postgres trata NULL como distinto en UNIQUE por default, así que
-- las asignaciones manuales (orderId IS NULL) no se ven afectadas; sólo se limita
-- a 1 UserPlan por order pagada.
CREATE UNIQUE INDEX "UserPlan_orderId_key" ON "UserPlan"("orderId");
