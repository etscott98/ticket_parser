import { ILogger } from '../interfaces'

export class LoggerService implements ILogger {
  constructor(private context: string) {}

  info(message: string, data?: any): void {
    console.log(`[${this.context}] ${message}`, data ? JSON.stringify(data, null, 2) : '')
  }

  error(message: string, error?: any): void {
    console.error(`[${this.context}] ERROR: ${message}`, error)
  }

  warn(message: string, data?: any): void {
    console.warn(`[${this.context}] WARNING: ${message}`, data)
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.context}] DEBUG: ${message}`, data)
    }
  }
}

export function createLogger(context: string): ILogger {
  return new LoggerService(context)
}
