import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '../../../components/ui/label'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import React from 'react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { useNavigate } from 'react-router-dom'
const signupSchema = z.object({
  email: z.email('Vui lòng nhập email hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  username: z.string().min(1, 'Tên đăng nhập là bắt buộc'),
  firstName: z.string().min(1, 'Tên là bắt buộc'),
  lastName: z.string().min(1, 'Họ là bắt buộc')
})
type SignupFormValues = z.infer<typeof signupSchema>
export function SignupForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const { signUp } = useAuthStore()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema)
  })

  const onSubmit = async (data: SignupFormValues) => {
    //goi api backend de dang ky nguoi dung
    const { email, password, username, firstName, lastName } = data
    if (await signUp(username, password, email, firstName, lastName)) navigate('/signin')
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
                <h1 className=" text-2xl font-bold">Tạo tài khoản Mama</h1>
                <p className="text-muted-foreground text-balance">
                  chào mừng bạn! Hãy đăng kí để bắt đầu!
                </p>
              </div>
              {/* ho ten */}
              <div className="grid grid-cols-2  gap-3">
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="block text-sm">
                    Họ
                  </Label>

                  <Input type="text" id="lastName" {...register('lastName')} />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="block text-sm">
                    Tên
                  </Label>

                  <Input
                    type="text"
                    id="firstName"
                    {...register('firstName')}
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
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
              {/* email */}
              <div className="flex flex-col gap-3">
                <div className="space-y-2">
                  <Label htmlFor="email" className="block text-sm">
                    Email
                  </Label>

                  <Input
                    type="email"
                    id="email"
                    placeholder="mama@example.com"
                    {...register('email')}
                  />

                  {errors.email && (
                    <p className="text-red-500 text-sm">
                      {errors.email.message}
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
              {/* nut dang ky */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Đăng ký
              </Button>
              <div className="text-center text-sm">
                Bạn đã có tài khoản?{' '}
                <a href="/signin" className="text-primary underline">
                  Đăng nhập
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
