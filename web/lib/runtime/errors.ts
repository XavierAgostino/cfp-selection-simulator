export class HostedConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HostedConfigurationError";
  }
}
