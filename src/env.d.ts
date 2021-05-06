declare namespace NodeJS {
  export interface ProcessEnv {
    ENV: string;
    PORT: string;
    CORS_ORIGIN: string;
    DISCORD_TOKEN: string;
    SQLITE_FILENAME: string;
    SCREW_THIS_GUY: string;
    API_STATIC_TOKEN: string;
    API_STATIC_USERID: string;
  }
}
