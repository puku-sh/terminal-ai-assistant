// Stub implementation for Installation functionality
export namespace Installation {
  export async function detect(): Promise<string | undefined> {
    // Stub implementation - just return undefined indicating no installation detected
    return undefined
  }
  
  export function getVersion(): string {
    return "1.0.0-stub"
  }
  
  export function getInstallationPath(): string | undefined {
    return undefined
  }
}