import { useQuery } from '@tanstack/react-query'
import { StyleSheet, Text, View } from 'react-native'
import { orpc } from '@/lib/orpc'

export default function HomeScreen() {
  const {
    data: users,
    isLoading,
    error,
  } = useQuery(orpc.user.list.queryOptions({ input: { limit: 10, offset: 0 } }))

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ring</Text>

      {isLoading && <Text>Loading...</Text>}

      {error && <Text style={styles.error}>Error: {error.message}</Text>}

      {users?.map((user) => (
        <View key={user.id} style={styles.card}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      ))}

      {users?.length === 0 && <Text style={styles.empty}>No users yet.</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  empty: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 48,
  },
  error: {
    fontSize: 14,
    color: 'red',
  },
})
