import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AccountingOverview from '@/components/accounting/AccountingOverview';
import IncomeledgerTab from '@/components/accounting/IncomeLedgerTab';
import ExpensesTab from '@/components/accounting/ExpensesTab';
import InvoicesTab from '@/components/accounting/InvoicesTab';

export default function Accounting() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Muhasebe</h1>
        <p className="text-muted-foreground text-sm">Gelir, gider, fatura ve kâr/zarar takibi</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="income">Gelir Defteri</TabsTrigger>
          <TabsTrigger value="expenses">Giderler</TabsTrigger>
          <TabsTrigger value="invoices">Faturalar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <AccountingOverview />
        </TabsContent>
        <TabsContent value="income" className="mt-4">
          <IncomeledgerTab />
        </TabsContent>
        <TabsContent value="expenses" className="mt-4">
          <ExpensesTab />
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <InvoicesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}