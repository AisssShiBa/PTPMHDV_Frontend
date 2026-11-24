import { Check, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export type TransferStep = 1 | 2 | 3

interface TransferStepsProps {
  currentStep: TransferStep
}

const STEPS = [
  { number: 1, title: '1. Thông tin chuyển', description: 'Người nhận & Báo giá' },
  { number: 2, title: '2. Xác nhận báo giá', description: 'Đếm ngược 60s' },
  { number: 3, title: '3. Hoàn tất', description: 'Biên lai giao dịch' }
]

function stepColors(number: number, currentStep: TransferStep): string {
  if (number === 3 && currentStep === 3) return 'bg-emerald-500 text-white ring-emerald-500/20'
  if (currentStep > number) return 'bg-primary text-primary-foreground'
  if (currentStep === number) return 'bg-primary text-primary-foreground ring-primary/20'
  return 'bg-muted text-muted-foreground'
}

export function TransferSteps({ currentStep }: TransferStepsProps) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div role="list" aria-label="Tiến trình chuyển tiền" className="relative flex items-center justify-between max-w-2xl mx-auto">
          <div aria-hidden="true" className="absolute left-6 right-6 top-5 -translate-y-1/2 h-0.5 bg-muted -z-0">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(currentStep - 1) * 50}%` }} />
          </div>
          {STEPS.map(step => (
            <div key={step.number} role="listitem" aria-current={currentStep === step.number ? 'step' : undefined}
              className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors shadow-sm ring-4 ring-background ${stepColors(step.number, currentStep)}`}>
                {step.number === 3 ? <CheckCircle2 className="h-5 w-5" />
                  : currentStep > step.number ? <Check className="h-5 w-5" /> : step.number}
              </div>
              <span className="mt-2 text-xs sm:text-sm font-semibold text-foreground">{step.title}</span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">{step.description}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
