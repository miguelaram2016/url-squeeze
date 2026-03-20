import { signIn } from '@/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold mb-1">URL Squeeze</h1>
            <p className="text-sm text-muted-foreground">Sign in to access your dashboard</p>
          </div>
          <form
            action={async () => {
              'use server'
              await signIn('github')
            }}
          >
            <Button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600">
              Sign in with GitHub
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
