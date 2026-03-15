import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Check, CreditCard } from 'lucide-react';

export default function BillingPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground text-xs mt-1">Manage your subscription and view invoices.</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Current Plan</CardTitle>
              <CardDescription className="text-sm mt-1">You're on the Starter plan</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">Free</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 mb-4">
            {['5 contracts', 'AI extraction', 'Email notifications', 'Basic deadline tracking'].map(f => (
              <li key={f} className="flex items-center gap-2 text-xs">
                <Check className="h-3 w-3 text-foreground" />
                {f}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-foreground/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Upgrade to Professional</CardTitle>
          <CardDescription className="text-sm mt-1">Unlock unlimited contracts and advanced features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-2xl font-bold tracking-tight">$19</span>
            <span className="text-xs text-muted-foreground">/month</span>
          </div>
          <ul className="space-y-2 mb-5">
            {['Unlimited contracts', 'Advanced deadline tracking', 'Priority support'].map(f => (
              <li key={f} className="flex items-center gap-2 text-xs">
                <Check className="h-3 w-3 text-foreground" />
                {f}
              </li>
            ))}
          </ul>
          <Button className="w-full gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Upgrade Now</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-xs">Feb 1, 2026</TableCell>
                <TableCell className="text-xs">Starter Plan</TableCell>
                <TableCell className="text-xs">$0.00</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">Free</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full">Open Billing Portal</Button>
    </div>
  );
}
