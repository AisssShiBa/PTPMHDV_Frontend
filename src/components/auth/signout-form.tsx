import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNavigate } from 'react-router-dom'
const SignOutForm = () => {
  const { signOut } = useAuthStore()
  const navigate = useNavigate()
  const handleLogOut = async () => {
    try {
      await signOut()
      navigate('/signin')
    } catch (error) {
      console.error(error)
    }
  }
  return (
    <div>
      <Button onClick={handleLogOut}>LogOut</Button>
    </div>
  )
}
export default SignOutForm
