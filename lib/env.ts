export function getOptionalServerEnv(name: string) {
  return process.env[name];
}

export function getRequiredServerEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
