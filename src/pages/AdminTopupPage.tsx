import { useState } from 'react'
import {
  CreditCard,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Check,
  DollarSign,
  Download,
  AlertCircle
} from 'lucide-react'
import { formatVnd } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface TopupRecord {
  id: string
  transactionCode: string
  userName: string
  phone: string
  walletId: string
  amount: number
  fee: number
  paymentMethod: string
  bankCode: string
  vnpayTxnRef: string
  vnpayTransactionNo: string
  vnpayResponseCode: string
  time: string
  status: 'SUCCESS' | 'PENDING' | 'DISPUTED'
}

const INITIAL_TOPUPS: TopupRecord[] = [
  {
    id: 'TOP-01',
    transactionCode: 'TOPUP-20261106-9921',
    userName: 'Nguyễn Văn An',
    phone: '0909 123 456',
    walletId: 'WAL-881920',
    amount: 100000,
    fee: 0,
    paymentMethod: 'VNPAY-QR',
    bankCode: 'VIETCOMBANK',
    vnpayTxnRef: '17309029108',
    vnpayTransactionNo: '14829102',
    vnpayResponseCode: '00 (Thành công)',
    time: '10:14 hôm nay',
    status: 'SUCCESS'
  },
  {
    id: 'TOP-02',
    transactionCode: 'TOPUP-20261106-9920',
    userName: 'Trần Thị Bích',
    phone: '0912 889 102',
    walletId: 'WAL-772911',
    amount: 500000,
    fee: 0,
    paymentMethod: 'Thẻ ATM Nội địa (Napas)',
    bankCode: 'TECHCOMBANK',
    vnpayTxnRef: '17309028812',
    vnpayTransactionNo: '14828741',
    vnpayResponseCode: '00 (Ngân hàng đã trừ tiền - IPN trễ)',
    time: '09:48 hôm nay',
    status: 'DISPUTED'
  },
  {
    id: 'TOP-03',
    transactionCode: 'TOPUP-20261106-9919',
    userName: 'Lê Hoàng Quân',
    phone: '0988 456 789',
    walletId: 'WAL-661029',
    amount: 2000000,
    fee: 0,
    paymentMethod: 'VNPAY-QR',
    bankCode: 'MBBANK',
    vnpayTxnRef: '17309027419',
    vnpayTransactionNo: '14828110',
    vnpayResponseCode: '00 (Thành công)',
    time: '09:12 hôm nay',
    status: 'SUCCESS'
  },
  {
    id: 'TOP-04',
    transactionCode: 'TOPUP-20261106-9918',
    userName: 'Phạm Minh Đức',
    phone: '0971 621 345',
    walletId: 'WAL-550182',
    amount: 200000,
    fee: 0,
    paymentMethod: 'Thẻ Quốc tế (Visa)',
    bankCode: 'ACB',
    vnpayTxnRef: '17309026102',
    vnpayTransactionNo: '14827902',
    vnpayResponseCode: 'Pending (Đang chờ 3D Secure)',
    time: '08:35 hôm nay',
    status: 'PENDING'
  },
  {
    id: 'TOP-05',
    transactionCode: 'TOPUP-20261106-9915',
    userName: 'Đỗ Thùy Trang',
    phone: '0934 333 888',
    walletId: 'WAL-449102',
    amount: 1500000,
    fee: 0,
    paymentMethod: 'VNPAY-QR',
    bankCode: 'BIDV',
    vnpayTxnRef: '17309024190',
    vnpayTransactionNo: '14826550',
    vnpayResponseCode: '00 (Thành công)',
    time: 'Hôm qua 18:20',
    status: 'SUCCESS'
  }
]

export function AdminTopupPage() {
  const [topups, setTopups] = useState<TopupRecord[]>(INITIAL_TOPUPS)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'DISPUTED'>('ALL')
  const [isSyncing, setIsSyncing] = useState(false)

  // Dialog tra soát chi tiết
  const [selectedRecord, setSelectedRecord] = useState<TopupRecord | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Lọc danh sách giao dịch
  const filteredTopups = topups.filter((item) => {
    const matchStatus = statusFilter === 'ALL' || item.status === statusFilter
    const matchQuery =
      item.transactionCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery) ||
      item.vnpayTxnRef.includes(searchQuery) ||
      item.vnpayTransactionNo.includes(searchQuery)
    return matchStatus && matchQuery
  })

  // Đồng bộ IPN thủ công với Cổng VNPAY
  const handleSyncIpn = () => {
    setIsSyncing(true)
    setTimeout(() => {
      setIsSyncing(false)
      toast.success('Đồng bộ IPN Gateway thành công!', {
        description: 'Đã nhận phản hồi đối soát trạng thái mới nhất từ hệ thống VNPAY Sandbox.'
      })
    }, 1000)
  }

  // Mở modal tra soát
  const handleInspect = (record: TopupRecord) => {
    setSelectedRecord(record)
    setDialogOpen(true)
  }

  // Xác nhận cộng tiền thủ công cho giao dịch bị treo (Manual Credit)
  const handleManualCredit = (recordId: string) => {
    setTopups((prev) =>
      prev.map((item) =>
        item.id === recordId ? { ...item, status: 'SUCCESS' as const } : item
      )
    )
    setDialogOpen(false)
    toast.success('Cộng tiền thủ công thành công!', {
      description: `Đã cộng ${formatVnd(
        selectedRecord?.amount || 0
      )} vào số dư ví của khách hàng ${selectedRecord?.userName}. Hệ thống đã gửi thông báo biến động số dư.`
    })
  }

  // Số lượng lệnh cần tra soát
  const disputedCount = topups.filter((t) => t.status === 'DISPUTED').length

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Đồng bộ Cổng VNPAY */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground border-none font-bold text-xs gap-1">
              <CreditCard className="h-3.5 w-3.5" />
              GATEWAY RECONCILIATION
            </Badge>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-xs font-semibold gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              VNPAY IPN Active
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Quản lý Giao dịch Nạp tiền & Tra soát Cổng VNPAY
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Kiểm tra các lệnh nạp tiền vào ví điện tử, đối chiếu mã tham chiếu ngân hàng và giải quyết khiếu nại trễ số dư.
          </p>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            disabled={isSyncing}
            onClick={handleSyncIpn}
            className="h-10 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-primary' : ''}`} />
            <span>{isSyncing ? 'Đang đồng bộ IPN...' : 'Đồng bộ IPN Gateway'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => toast.success('Đang tạo và tải file Excel đối soát nạp tiền...')}
            className="h-10 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Xuất file Excel</span>
          </Button>
        </div>
      </div>

      {/* 4 Thẻ Chỉ số Nạp tiền (Topup Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Tổng tiền nạp hôm nay */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Tổng tiền nạp hôm nay</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight">
              1.004.800.000 <span className="text-sm font-normal text-muted-foreground">₫</span>
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+8.5% so với hôm qua</span>
              <span className="font-mono text-muted-foreground">3.140 lệnh</span>
            </div>
          </CardContent>
        </Card>

        {/* Thẻ 2: Tỷ lệ tự động thành công */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Tự động thành công qua IPN</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight">
              99.2%
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs text-muted-foreground">
              <span>Độ trễ cộng tiền trung bình</span>
              <span className="font-mono text-primary font-bold">450ms</span>
            </div>
          </CardContent>
        </Card>

        {/* Thẻ 3: Lệnh cần tra soát thủ công */}
        <Card className="border-border shadow-xs hover:border-destructive/40 transition-all bg-destructive/5 border-destructive/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-destructive">Lệnh cần tra soát thủ công</span>
              <div className="p-2 rounded-xl bg-destructive/15 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-destructive tracking-tight">
              {disputedCount} <span className="text-sm font-normal text-muted-foreground">lệnh</span>
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-destructive/20 text-xs">
              <span className="text-muted-foreground">Ngân hàng đã trừ, IPN chậm</span>
              <span className="text-destructive font-semibold">Cần can thiệp</span>
            </div>
          </CardContent>
        </Card>

        {/* Thẻ 4: Phí xử lý cổng đối tác */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Phí xử lý cổng đối tác (1.1%)</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight">
              11.050.000 <span className="text-sm font-normal text-muted-foreground">₫</span>
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs text-muted-foreground">
              <span>Khách hàng: Miễn phí 100%</span>
              <span className="text-primary font-semibold">T+1 đối soát</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Thanh công cụ lọc: Tìm kiếm & Lọc trạng thái */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-muted/50 rounded-2xl border border-border">
        {/* Bộ lọc trạng thái */}
        <div className="flex items-center gap-1 overflow-x-auto p-0.5">
          <Button
            type="button"
            variant={statusFilter === 'ALL' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('ALL')}
            className="h-8 text-xs font-semibold rounded-xl cursor-pointer"
          >
            Tất cả ({topups.length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === 'SUCCESS' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('SUCCESS')}
            className="h-8 text-xs font-semibold rounded-xl cursor-pointer"
          >
            Thành công ({topups.filter((t) => t.status === 'SUCCESS').length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === 'DISPUTED' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('DISPUTED')}
            className="h-8 text-xs font-semibold rounded-xl text-destructive hover:text-destructive cursor-pointer"
          >
            Cần tra soát ({topups.filter((t) => t.status === 'DISPUTED').length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === 'PENDING' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('PENDING')}
            className="h-8 text-xs font-semibold rounded-xl cursor-pointer"
          >
            Đang chờ ({topups.filter((t) => t.status === 'PENDING').length})
          </Button>
        </div>

        {/* Ô tìm kiếm nhanh */}
        <div className="relative w-full sm:w-80 px-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo Mã GD, Tên, SĐT, VNPAY Ref..."
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      {/* Bảng Danh sách Giao dịch Nạp tiền */}
      <Card className="border-border shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60 bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-foreground">
              Nhật ký Giao dịch Nạp tiền qua Cổng
            </CardTitle>
            <Badge variant="outline" className="text-xs font-mono font-semibold text-primary border-primary/30">
              {filteredTopups.length} giao dịch hiển thị
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Dữ liệu đối chiếu trực tiếp giữa máy chủ ví FinVault và Cổng thanh toán VNPAY
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Mã GD / Thời gian</th>
                  <th className="py-3 px-4">Khách hàng / Ví</th>
                  <th className="py-3 px-4">Kênh & Ngân hàng</th>
                  <th className="py-3 px-4">Mã VNPAY Ref</th>
                  <th className="py-3 px-4 text-right">Số tiền nạp</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {filteredTopups.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-muted/40 transition-colors ${
                      item.status === 'DISPUTED' ? 'bg-destructive/5' : ''
                    }`}
                  >
                    {/* Mã GD & Thời gian */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                      <div>{item.transactionCode}</div>
                      <span className="text-[11px] text-muted-foreground font-normal">{item.time}</span>
                    </td>

                    {/* Khách hàng / Ví */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground text-sm">{item.userName}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {item.phone} • {item.walletId}
                      </div>
                    </td>

                    {/* Kênh & Ngân hàng */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">{item.paymentMethod}</div>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground mt-0.5 font-mono">
                        {item.bankCode}
                      </Badge>
                    </td>

                    {/* Mã VNPAY Ref */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="text-foreground">{item.vnpayTxnRef}</div>
                      <div className="text-[11px] text-muted-foreground">ID: #{item.vnpayTransactionNo}</div>
                    </td>

                    {/* Số tiền nạp */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                        +{formatVnd(item.amount)}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4 text-center">
                      {item.status === 'SUCCESS' ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-[10px] font-bold">
                          THÀNH CÔNG
                        </Badge>
                      ) : item.status === 'DISPUTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive animate-pulse">
                          CẦN TRA SOÁT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                          ĐANG CHỜ IPN
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        type="button"
                        variant={item.status === 'DISPUTED' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleInspect(item)}
                        className="h-8 text-xs font-semibold gap-1 cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>{item.status === 'DISPUTED' ? 'Tra soát ngay' : 'Chi tiết'}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-border/60 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
            <span>Hệ thống ghi log toàn bộ chu kỳ phản hồi IPN từ VNPAY để đối soát T+1 độc lập.</span>
            <span className="font-mono text-primary font-bold">{filteredTopups.length} giao dịch</span>
          </div>
        </CardContent>
      </Card>

      {/* MODAL CHI TIẾT & TRA SOÁT LỆNH NẠP TIỀN */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Tra soát Giao dịch Nạp tiền VNPAY
              </DialogTitle>
              {selectedRecord?.status === 'DISPUTED' && (
                <Badge variant="destructive" className="text-[10px] font-bold">
                  SỰ VỤ TREO
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Đối chiếu thông tin hạch toán cổng thanh toán và số dư tài khoản ví người dùng
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Bảng chi tiết kỹ thuật */}
              <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mã GD FinVault:</span>
                  <span className="font-mono font-bold text-foreground">{selectedRecord.transactionCode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Khách hàng nhận:</span>
                  <strong className="text-foreground">{selectedRecord.userName} ({selectedRecord.phone})</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mã ví thụ hưởng:</span>
                  <span className="font-mono font-bold text-primary">{selectedRecord.walletId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Số tiền yêu cầu nạp:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    {formatVnd(selectedRecord.amount)}
                  </strong>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/60">
                  <span className="text-muted-foreground">Mã VNPAY TxnRef:</span>
                  <span className="font-mono font-semibold text-foreground">{selectedRecord.vnpayTxnRef}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mã VNPAY TransactionNo:</span>
                  <span className="font-mono font-semibold text-foreground">#{selectedRecord.vnpayTransactionNo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ngân hàng phát hành:</span>
                  <span className="font-semibold text-foreground">{selectedRecord.bankCode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mã phản hồi Gateway:</span>
                  <span className="font-mono text-primary font-bold">{selectedRecord.vnpayResponseCode}</span>
                </div>
              </div>

              {/* Thông báo tình trạng sự vụ */}
              {selectedRecord.status === 'DISPUTED' ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <p className="text-xs leading-relaxed">
                    Khách hàng đã bị trừ tiền thành công tại <strong>{selectedRecord.bankCode}</strong> (ResponseCode 00), nhưng hệ thống chưa ghi nhận cộng số dư do sự cố timeout đường truyền IPN.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                  <p className="text-xs leading-relaxed">
                    Giao dịch hợp lệ và đã hoàn tất ghi nhận cộng tiền vào số dư ví của khách hàng.
                  </p>
                </div>
              )}

              {/* Các nút xử lý trong dialog */}
              <div className="pt-2 flex gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1 h-10 text-xs font-semibold cursor-pointer"
                >
                  Đóng
                </Button>

                {selectedRecord.status === 'DISPUTED' && (
                  <Button
                    type="button"
                    onClick={() => handleManualCredit(selectedRecord.id)}
                    className="flex-1 h-10 text-xs font-bold gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>Cộng tiền thủ công ngay</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminTopupPage
