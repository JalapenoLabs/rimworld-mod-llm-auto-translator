# Rimworld Auto Translator

## Installation
You must have [Node.js](https://nodejs.org/en) and [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/#windows-stable) installed.
Install these tools to your system first, before continuing.

We recommend adding this as a submoudle to your mod repository
```shell
git submodule add git@github.com:JalapenoLabs/rimworld-mod-llm-auto-translator.git
```

Or, if you want you can just clone it directly:
```shell
git clone git@github.com:JalapenoLabs/rimworld-mod-llm-auto-translator.git
```

**It's very important that you clone this repository into the root of your project!!**
This project will look for all XML files in the parent (../) repository from where it was cloned.

Add a .env file in the root of the cloned repo:
```shell
cd rimworld-mod-llm-auto-translator
touch .env
```

In the .env file, you must add an [OpenAI API Key](https://platform.openai.com/api-keys).
Then, update the contents of the `.env` file to:
```dotenv
OPENAI_API_KEY=sk-proj-
```

Finally, install necessary dependencies.
```
yarn install
```

## Running
Make sure you `cd` into the cloned translation repository before running this command! :)
```
yarn start
```

## Warning
Before uploading your new workshop files to Steam, make sure you delete the .env file!!!
This may accidentally expose your OpenAI API key, which you won't want.
We also recommend deleting the entire translation directory before uploading, just to keep your output files clean.
