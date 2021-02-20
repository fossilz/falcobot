# falcobot

## Notes

If you are going to dive into Node js, you might as well do it right with typescript (easier builds + intellisense!) and yarn (instead of npm as it's much faster!).

## Installation

[Install yarn globally](https://yarnpkg.com/getting-started/install)

```bash
npm install -g yarn
```

[Install typescript globally](https://www.typescriptlang.org/download)

```bash
npm install -g typescript
```

If you have already installed this project from previous, delete the node_modules folder and start again.

Clone the repo (after merging this branch to master)

```bash
git clone https://github.com/fossilz/falcobot
```

Install dependencies

```bash
# Installs all dependencies using yarn
yarn
```

## Adding More Dependencies using Yarn

If you need to add dependencies:

```bash
# Adds a dependency
yarn add dependency-name

# Adds a DEV dependency
yarn add -D dependency-name

# It is always a good idea when using typescript to try and install type declarations for dependencies
yarn add @types/dependency-name
```

If the @types/dependency-name does not exist, not to worry, the package comes with prebuilt types, or you need to add the following declare statement in `./src/types.d.ts`;

```ts
declare module "dependency-name";
```

## Environment Variables

This package uses [dotenv-safe](https://github.com/rolodato/dotenv-safe) to load environment variables.

Copy the .env.example file twice to make the following 2 files:

`.env` file - This is your DEVELOPEMENT environment file

```
ENV=development
PORT=4000
CORS_ORIGIN=*
DISCORD_TOKEN=this_token_cannot_be_empty_or_an_error_is_thrown
```

`.env.production` file - This is your PRODUCTION environment file

```
ENV=production
PORT=4000
CORS_ORIGIN=*
DISCORD_TOKEN=this_token_cannot_be_empty_or_an_error_is_thrown
```

### Adding New Environment Variables

Add the new environment variables to both your `.env` file AND your `.env.production` file if need be.

```
ENV=development
PORT=4000
CORS_ORIGIN=*
DISCORD_TOKEN=this_token_cannot_be_empty_or_an_error_is_thrown
NEW_ENV_VAR=hello
DISCORD_WEBHOOK=https://discord.com/api/webhooks/id/token
```

After adding your new env variables, run the following script:

```bash
yarn gen:env:types
```

This will update your .env.example file and it will update the strongly-typed ProcessEnv interface in your ./src/env.d.ts so typescript will recognise the new variable.

See [gen-env-types](https://github.com/benawad/gen-env-types) for more info.

## Build

**Take a look at the scripts in your package.json** to understand what commands are executed.

The build your typescript .ts files from your `src` folder into your `dist` folder

```bash
# Build ./src to ./dist
yarn build

# Build ./src to ./dist and watch for changes
yarn dev
```

### Building using a server

To start the dev server, in a separate terminal window, run the following command:

```bash
# Starts the dev server that reloads when you change files in your src using yarn dev (watched changes)
yarn start:dev

# If you just want to run the production server, or when your app is deployed on production, it should init with this
yarn start
```

Open up http://localhost:4000 in your browser.

Navigate to http://localhost:4000/discord to test that route.

Add more routes/logic to build out your application.

If you do not have [Postman](https://www.postman.com/), I suggest you install it to keep track of your different routes.

### Building using scripts

You can add more scripts to the `scripts` folder to try out code.

To execute the scripts, add a script alias to your scripts in `package.json`:

```json
{
  ...
  "scripts": {
    "example:script": "yarn build && ts-node -T ./scripts/example.script.ts",
    "discord:login": "yarn build && ts-node -T ./scripts/discord.login.ts",
    ...
  },
  ...
}
```

To run the scripts, just run the command using yarn

```bash
# Runs the example script
yarn example:script

# Runs the async discord login script
yarn discord:login
```

## Testing

Testing uses commonjs format( using require). Mark sure to require files from your `dist` folders for testing.

[Testing with AVA](https://github.com/avajs/ava)

```bash
# Runs all tests
yarn test

# Run a single test (-v is verbose)
yarn ava -m <test.name> -v

# Run a single test example
yarn ava -m config.port -v
```

## Database

A sqlite db is fine.

You might want to also consider creating a Firebase Project and Firebase Realtime / Firestore DB. It's free and super simple to use.

Check out [Fireabse](https://firebase.google.com/)

## Deployment

If I were you, I would complete a full deployment to your production machine right from the start. This helps you get env variables right and CI/CD pipelines.

How are you going to deploy? GitHub Actions/Workflows? Create a docker container? Etc.
