import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { useFixtureQuery } from '@/lib/fixtureQuery'
import { formatVnd, formatDateTime, maskPhone, addMoney } from '@/lib/format'

export function DevComponentsPage() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [progressVal, setProgressVal] = useState(65)

  // Test fixture query với dữ liệu mẫu, tự đổi theo ?state=loading|empty|error
  const testQuery = useFixtureQuery([
    { id: '1', title: 'Nạp tiền ví qua VNPAY', amount: '500000', status: 'SUCCESS' },
    { id: '2', title: 'Chuyển tiền P2P cho Khoa', amount: '200000', status: 'PENDING' }
  ])

  return (
    <div className="space-y-10 pb-16 max-w-5xl mx-auto">
      <PageHeader
        title="Trang Kiểm Thử Nền Móng UI (/dev/components)"
        description="Trang kiểm tra đầy đủ token màu, typography font Be Vietnam Pro, component shadcn và các trạng thái ?state=loading|empty|error."
        action={
          <Button onClick={() => setConfirmOpen(true)}>
            Mở ConfirmDialog
          </Button>
        }
      />

      {/* 1. TYPOGRAPHY & COLORS */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight border-b border-border pb-2">
          1. Bảng màu & Typography (Be Vietnam Pro)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl p-4 bg-primary text-primary-foreground shadow-sm">
            <p className="text-xs font-semibold uppercase">Primary (#00685b)</p>
            <p className="text-lg font-bold">Deep Teal</p>
          </div>
          <div className="rounded-xl p-4 bg-secondary text-secondary-foreground shadow-sm">
            <p className="text-xs font-semibold uppercase">Secondary (#466273)</p>
            <p className="text-lg font-bold">Slate Blue</p>
          </div>
          <div className="rounded-xl p-4 bg-surface-container border border-border text-on-surface">
            <p className="text-xs font-semibold uppercase">Surface (#f5faff)</p>
            <p className="text-lg font-bold">Soft Blue</p>
          </div>
          <div className="rounded-xl p-4 bg-destructive text-destructive-foreground">
            <p className="text-xs font-semibold uppercase">Error (#ba1a1a)</p>
            <p className="text-lg font-bold">Destructive</p>
          </div>
        </div>

        <div className="space-y-1 p-4 rounded-xl border border-border bg-card">
          <h1 className="text-3xl font-extrabold text-foreground">H1: FinVault Nền tảng ví điện tử</h1>
          <h2 className="text-2xl font-bold text-foreground">H2: Quản lý số dư và giao dịch an toàn</h2>
          <h3 className="text-xl font-semibold text-foreground">H3: Chuyển tiền P2P nhanh chóng</h3>
          <p className="text-base text-foreground">Body-LG: Thử nghiệm font tiếng Việt có đầy đủ dấu: Ả, Ắ, Ộ, Ợ, Ứ, Ỹ, đ.</p>
          <p className="text-sm text-muted-foreground">Body-MD (muted): Chân trang, mô tả phụ và chú thích hỗ trợ người dùng.</p>
        </div>
      </section>

      {/* 2. BUTTONS & INPUTS */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight border-b border-border pb-2">
          2. Buttons & Inputs
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="default">Primary Button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button loading>Đang xử lý</Button>
          <Button disabled>Bị khóa</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="demo-input">Họ và tên</Label>
            <Input id="demo-input" placeholder="Nhập tên người nhận..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-amount">Số tiền (VNĐ)</Label>
            <Input id="demo-amount" defaultValue="100000" />
          </div>
        </div>
      </section>

      {/* 3. BADGES & PROGRESS & UTILS */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight border-b border-border pb-2">
          3. Badges, Progress & Format Helpers
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">Mặc định</Badge>
          <Badge variant="secondary">Cấp 1</Badge>
          <Badge variant="success">Hoàn thành</Badge>
          <Badge variant="warning">Chờ duyệt</Badge>
          <Badge variant="destructive">Thất bại</Badge>
          <Badge variant="outline">Mô phỏng</Badge>
        </div>

        <div className="space-y-2 max-w-md">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tiến độ hạn mức tháng</span>
            <span>{progressVal}%</span>
          </div>
          <Progress value={progressVal} />
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setProgressVal(30)}>30%</Button>
            <Button size="sm" variant="outline" onClick={() => setProgressVal(75)}>75%</Button>
            <Button size="sm" variant="outline" onClick={() => setProgressVal(100)}>100%</Button>
          </div>
        </div>

        <Card className="max-w-md">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Kiểm thử lib/format.ts (BigInt):</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p><strong>formatVnd(1250000):</strong> {formatVnd('1250000')}</p>
            <p><strong>addMoney(1000000, 250000):</strong> {formatVnd(addMoney('1000000', '250000'))}</p>
            <p><strong>maskPhone:</strong> {maskPhone('0987654321')}</p>
            <p><strong>formatDateTime:</strong> {formatDateTime(new Date())}</p>
          </CardContent>
        </Card>
      </section>

      {/* 4. TABS & TABLE */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight border-b border-border pb-2">
          4. Tabs & Table
        </h2>
        <Tabs defaultValue="account" className="w-full">
          <TabsList>
            <TabsTrigger value="account">Tài khoản</TabsTrigger>
            <TabsTrigger value="history">Lịch sử giao dịch</TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">AN</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-semibold text-base">An Nguyễn (Tài khoản mẫu)</h4>
                <p className="text-xs text-muted-foreground">an.nguyen@finvault.local • Đã xác minh Cấp 1</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="history">
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã giao dịch</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-xs">TXN_9921</TableCell>
                    <TableCell>Nạp tiền VNPAY</TableCell>
                    <TableCell className="font-semibold text-emerald-600">+500.000 ₫</TableCell>
                    <TableCell><Badge variant="success">Thành công</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">TXN_9920</TableCell>
                    <TableCell>Chuyển tiền P2P</TableCell>
                    <TableCell className="font-semibold text-destructive">-200.000 ₫</TableCell>
                    <TableCell><Badge variant="secondary">Hoàn tất</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* 5. QUERY BOUNDARY & DEV STATE */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-2">
          <h2 className="text-xl font-bold tracking-tight">
            5. QueryBoundary & DevState (?state=...)
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span>Thử URL:</span>
            <a href="?state=loading" className="text-primary underline">?state=loading</a>
            <a href="?state=empty" className="text-primary underline">?state=empty</a>
            <a href="?state=error" className="text-primary underline">?state=error</a>
            <a href="?" className="text-muted-foreground underline">mặc định</a>
          </div>
        </div>

        <QueryBoundary
          query={testQuery}
          skeleton={<Skeleton className="h-28 w-full rounded-xl" />}
          emptyFallback={<EmptyState title="Không có giao dịch nào" description="Bạn chưa thực hiện giao dịch nào." />}
        >
          {(items) => (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-semibold">{item.title}</CardTitle>
                    <CardDescription className="text-xs">
                      Số tiền: {formatVnd(item.amount)}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </QueryBoundary>
      </section>

      {/* ConfirmDialog Modal */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xác nhận giao dịch chuyển tiền"
        description="Bạn có chắc chắn muốn chuyển 200.000 ₫ cho người nhận này không? Hành động này không thể hoàn tác."
        confirmText="Đồng ý chuyển"
        onConfirm={() => {
          setConfirmOpen(false)
        }}
      />
    </div>
  )
}

export default DevComponentsPage
