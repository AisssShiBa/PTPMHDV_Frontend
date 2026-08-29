import { SignupForm } from '@/components/auth/signup-form'
const SignUpPage = () => {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(125% 125% at 50% 10%, #fff 20%, #6366f1 100%)'
        }}
      />

      <div className="relative z-10 w-full max-w-sm md:max-w-4xl">
        <SignupForm />
      </div>
    </div>
  )
}

export default SignUpPage
