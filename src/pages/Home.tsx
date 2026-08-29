import SignOutForm from '@/components/auth/signout-form'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const Home = () => {
  const user = useAuthStore((state) => state.user)
  const handleOnClick = async () => {
    try {
      await api.get('/user/test', { withCredentials: true })
      toast.success('ok')
    } catch (error) {
      console.error(error)
      toast.error('fail')
    }
  }
  return (
    <div>
      {user?.username}
      <SignOutForm />
      <Button onClick={handleOnClick}> test</Button>
    </div>
  )
}

export default Home
