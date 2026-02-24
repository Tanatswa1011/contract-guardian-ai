import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Check, CreditCard } from 'lucide-react';

export default function BillingPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground text-sm">Manage your subscription and view invoices.</p>
      </div>

      {/* Current Plan */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Current Plan</CardTitle>
              <CardDescription>You're on the Starter plan</CardDescription>
            </div>
            <Badge className="bg-primary/10 text-primary">Free</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 mb-4">
            {['5 contracts', 'AI extraction', 'Email notifications', 'Basic deadline tracking'].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary" />
                {f}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Upgrade */}
      <Card className="shadow-sm border-primary/30">
        <CardHeader>
          <CardTitle className="text-base">Upgrade to Professional</CardTitle>
          <CardDescription>Unlock unlimited contracts and advanced features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-3xl font-bold">$19</span>
            <span className="text-muted-foreground">/month</span>
          </div>
          <ul className="space-y-2 mb-6">
            {['Unlimited contracts', 'Advanced deadline tracking', 'Priority support'].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary" />
                {f}
              </li>
            ))}
          </ul>
          <Button className="w-full gap-2"><CreditCard className="h-4 w-4" /> Upgrade Now</Button>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Invoice History</CardTitle>
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
                <TableCell className="text-sm">Feb 1, 2026</TableCell>
                <TableCell className="text-sm">Starter Plan</TableCell>
                <TableCell className="text-sm">$0.00</TableCell>
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
