import '@testing-library/jest-dom'

// Polyfill TextEncoder/TextDecoder for protobuf
// Jest's jsdom environment doesn't include these by default
import { TextEncoder, TextDecoder } from 'util'

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder