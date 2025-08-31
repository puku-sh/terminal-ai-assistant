// Stub implementation for Flag functionality
export namespace Flag {
  // Environment variable flags
  export const OPENCODE_AUTO_SHARE = process.env.OPENCODE_AUTO_SHARE === "true"
  export const OPENCODE_DEBUG = process.env.OPENCODE_DEBUG === "true"
  export const OPENCODE_DEV = process.env.NODE_ENV === "development"
  
  // Additional common flags can be added here as needed
  export function get(name: string): boolean {
    return process.env[name] === "true"
  }
  
  export function set(name: string, value: boolean): void {
    process.env[name] = value.toString()
  }
}