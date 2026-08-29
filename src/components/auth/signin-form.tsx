import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import React from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNavigate } from 'react-router-dom'
const signinSchema = z.object({
  username: z.string().min(1, 'Tên đăng nhập là bắt buộc'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
})
type SigninFormValues = z.infer<typeof signinSchema>
export function SigninForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const { signIn } = useAuthStore()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SigninFormValues>({
    resolver: zodResolver(signinSchema)
  })

  const onSubmit = async (data: SigninFormValues) => {
    //goi api backend de dang ky nguoi dung
    const { username, password } = data
    await signIn(username, password)
    navigate('/')
  }
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden p-0 border border-border">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-6">
              {/* header */}
              <div className="flex flex-col items-center text-center gap-2">
                <a href="/" className="mx-auto block w-fit text-center">
                  <img src="mama_logo_icon.png" alt="logo" className="w-44" />
                </a>
                <h1 className=" text-2xl font-bold">Chào mừng trở lại</h1>
                <p className="text-muted-foreground text-balance">
                  Đăng nhập vào tài khoản của bạn
                </p>
              </div>

              {/* username */}
              <div className="flex flex-col gap-3">
                <div className="space-y-2">
                  <Label htmlFor="username" className="block text-sm">
                    Tên đăng nhập
                  </Label>

                  <Input
                    type="text"
                    id="username"
                    placeholder="mama"
                    {...register('username')}
                  />
                  {errors.username && (
                    <p className="text-red-500 text-sm">
                      {errors.username.message}
                    </p>
                  )}
                </div>
              </div>

              {/* password */}
              <div className="flex flex-col gap-3">
                <div className="space-y-2">
                  <Label htmlFor="password" className="block text-sm">
                    Mật khẩu
                  </Label>

                  <Input
                    type="password"
                    id="password"
                    {...register('password')}
                  />

                  {errors.password && (
                    <p className="text-red-500 text-sm">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </div>
              {/* nut dang nhap */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Đăng nhập
              </Button>
              <div className="text-center text-sm">
                Bạn chưa có tài khoản?{' '}
                <a href="/signup" className="text-primary underline">
                  đăng ký
                </a>
              </div>
            </div>
          </form>
          <div className="relative hidden bg-muted md:block">
            <img
              src="/test.jpg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <div className="px-6 text-center">
        Bằng cách tiếp tục, bạn đồng ý với {''}
        <a href="#" className="text-purple-600 hover:text-purple-500">
          Điều khoản dịch vụ {''}
        </a>
        và {''}
        <a href="#" className="text-purple-600 hover:text-purple-500">
          Chính sách bảo mật của chúng tôi
        </a>
        .
      </div>
    </div>
  )
}
