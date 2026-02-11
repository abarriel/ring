import { Button, Card, CardContent, Input, Label, Text } from '@ring/ui'
import { useMutation } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, View } from 'react-native'
import { saveUser } from '@/lib/auth'
import { client } from '@/lib/orpc'

export default function LoginScreen() {
  const [name, setName] = useState('')

  const loginMutation = useMutation({
    mutationFn: (input: { name: string }) => client.auth.login(input),
    onSuccess: async (user) => {
      await saveUser(user)
      router.replace('/')
    },
  })

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    loginMutation.mutate({ name: trimmed })
  }

  return (
    <LinearGradient colors={['#fff1f2', '#fce7f3']} className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 items-center justify-center px-6">
          {/* Logo */}
          <LinearGradient
            colors={['#fb7185', '#ec4899']}
            className="h-20 w-20 items-center justify-center rounded-full shadow-lg"
          >
            <Text className="text-4xl font-bold text-white">R</Text>
          </LinearGradient>

          {/* Title */}
          <Text className="mt-3 text-3xl font-bold text-foreground">Ring</Text>

          {/* Subtitle */}
          <Text className="mb-8 mt-1 text-sm text-muted-foreground">Trouve ton match parfait</Text>

          {/* Login Card */}
          <Card className="w-full rounded-2xl border-0 shadow-lg">
            <CardContent className="p-6 px-5">
              <Label className="mb-2 text-sm font-medium">Pseudo</Label>
              <Input
                placeholder="ton_pseudo"
                value={name}
                onChangeText={setName}
                autoCapitalize="none"
                autoCorrect={false}
                className="mb-5 h-12 rounded-xl text-base"
              />
              <LinearGradient colors={['#fb7185', '#ec4899']} className="rounded-xl shadow-md">
                <Button
                  className="h-12 w-full rounded-xl bg-transparent"
                  onPress={handleSubmit}
                  disabled={loginMutation.isPending || !name.trim()}
                >
                  <Text className="text-base font-semibold text-white">
                    {loginMutation.isPending ? 'Connexion...' : "C'est parti"}
                  </Text>
                </Button>
              </LinearGradient>
            </CardContent>
          </Card>

          {/* Footer hint */}
          <Text className="mt-6 text-xs text-muted-foreground">
            Pas de mot de passe, juste un pseudo.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}
