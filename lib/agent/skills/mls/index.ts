import { MlsProvider } from './types'
import { MockMlsProvider } from './mock'

export function getMlsProvider(): MlsProvider {
  const provider = process.env.MLS_PROVIDER || 'mock'
  if (provider === 'mock') return MockMlsProvider
  // if (provider === 'reso') return ResoMlsProvider
  return MockMlsProvider
}
