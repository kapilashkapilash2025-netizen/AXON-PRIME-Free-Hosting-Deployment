-- CreateIndex
CREATE UNIQUE INDEX "DailyLockEvent_userId_tradeDate_key" ON "DailyLockEvent"("userId", "tradeDate");

-- CreateIndex
CREATE INDEX "Trade_userId_symbol_closedAt_idx" ON "Trade"("userId", "symbol", "closedAt");

-- CreateIndex
CREATE INDEX "Trade_userId_openedAt_idx" ON "Trade"("userId", "openedAt");
