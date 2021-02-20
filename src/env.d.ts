declare namespace NodeJS {
  export interface ProcessEnv {
    ENV: string;
    PORT: string;
    CORS_ORIGIN: string;
    DISCORD_TOKEN: string;
  }
}
