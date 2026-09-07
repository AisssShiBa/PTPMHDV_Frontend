import { ecosystemFeatures } from '@/features/home/data/mockHomeData'

function WorldMapDots() {
  return (
    <div className="absolute right-0 bottom-0 top-0 w-full sm:w-1/2 opacity-25 pointer-events-none overflow-hidden flex items-center justify-end pr-4">
      <svg
        className="w-full max-w-sm h-auto text-primary"
        viewBox="0 0 1000 500"
        fill="currentColor"
      >
        <path
          d="M150,120 Q180,100 240,110 T300,160 T250,230 T180,210 Z"
          opacity="0.4"
        />
        <path
          d="M220,260 Q260,250 280,310 T250,420 T200,380 T210,290 Z"
          opacity="0.4"
        />
        <path
          d="M480,100 Q550,80 600,120 T620,180 T540,220 T460,160 Z"
          opacity="0.4"
        />
        <path
          d="M490,230 Q540,210 580,260 T560,380 T500,360 T460,280 Z"
          opacity="0.4"
        />
        <path
          d="M630,90 Q780,60 880,110 T850,230 T720,240 T640,150 Z"
          opacity="0.4"
        />
        <path d="M720,290 Q800,280 840,340 T780,410 T710,360 Z" opacity="0.4" />

        <circle
          cx="230"
          cy="150"
          r="8"
          className="animate-ping text-primary fill-primary"
        />
        <circle cx="230" cy="150" r="5" className="fill-primary" />
        <circle cx="530" cy="130" r="5" className="fill-primary" />
        <circle
          cx="750"
          cy="160"
          r="7"
          className="animate-ping text-emerald-400 fill-emerald-400"
        />
        <circle cx="750" cy="160" r="4" className="fill-emerald-400" />
        <circle cx="540" cy="310" r="4" className="fill-primary" />
        <circle cx="770" cy="340" r="4" className="fill-primary" />

        <line
          x1="230"
          y1="150"
          x2="530"
          y2="130"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.6"
        />
        <line
          x1="530"
          y1="130"
          x2="750"
          y2="160"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.6"
        />
        <line
          x1="530"
          y1="130"
          x2="540"
          y2="310"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.5"
        />
        <line
          x1="750"
          y1="160"
          x2="770"
          y2="340"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.5"
        />
      </svg>
    </div>
  )
}

export function EcosystemFeatures() {
  return (
    <section className="space-y-10">
      {/* Section Heading */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
          Hệ sinh thái Quản lý Toàn diện
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Trải nghiệm nền tảng tài chính được thiết kế với độ chính xác cao
          nhất, đáp ứng các tiêu chuẩn khắt khe nhất của thị trường toàn cầu.
        </p>
      </div>

      {/* Feature Cards Grid (2x2) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {ecosystemFeatures.map((f) => {
          const Icon = f.icon
          return (
            <div
              key={f.id}
              className={`relative ${f.colSpanClass} rounded-2xl border border-border/60 bg-card/80 p-6 sm:p-7 shadow-sm overflow-hidden transition-all hover:shadow-lg ${f.hoverBorderClass}`}
            >
              {f.hasWorldMap && <WorldMapDots />}

              <div className="relative z-10 max-w-md">
                <div
                  className={`size-11 rounded-xl flex items-center justify-center mb-5 ring-1 ${f.iconContainerClass}`}
                >
                  <Icon className={`size-5 ${f.iconClass}`} />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">
                  {f.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
