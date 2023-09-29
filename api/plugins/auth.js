import cors from "@fastify/cors";
import formDataPlugin from "@fastify/formbody";
import fastifyPlugin from "fastify-plugin";

// Used to run GoToSocial command
import { exec } from "child_process";

import supertokens from "supertokens-node";
import Session from "supertokens-node/recipe/session/index.js";
import EmailPassword from "supertokens-node/recipe/emailpassword/index.js";
import Passwordless from "supertokens-node/recipe/passwordless/index.js";
import { SMTPService } from "supertokens-node/recipe/passwordless/emaildelivery/index.js";
import ThirdPartyEmailPassword from "supertokens-node/recipe/thirdpartyemailpassword/index.js";
import {
  plugin,
  errorHandler,
} from "supertokens-node/framework/fastify/index.js";

async function auth(server, options) {
  supertokens.init({
    framework: "fastify",
    supertokens: {
      // These are the connection details of the app you created on supertokens.com
      connectionURI: server.config.SUPERTOKENS_CONNECTION_URI,
      apiKey: server.config.SUPERTOKENS_API_KEY,
    },
    appInfo: {
      // learn more about this on https://supertokens.com/docs/session/appinfo
      appName: server.config.SUPERTOKENS_APPNAME,
      apiDomain: server.config.SUPERTOKENS_API_DOMAIN,
      websiteDomain: server.config.SUPERTOKENS_WEBSITE_DOMAIN,
      apiBasePath: server.config.SUPERTOKENS_API_BASE_PATH,
      websiteBasePath: server.config.SUPERTOKENS_WEBSITE_BASE_PATH,
    },
    recipeList: [
      Passwordless.init({
        // flowType: "USER_INPUT_CODE_AND_MAGIC_LINK",
        flowType: "USER_INPUT_CODE",
        contactMethod: "EMAIL_OR_PHONE",
        emailDelivery: {
          service: new SMTPService({
            smtpSettings: {
              host: server.config.SMTP_HOST,
              authUsername: server.config.SMTP_USER, // this is optional. In case not given, from.email will be used
              password: server.config.SMTP_PASSWORD,
              port: server.config.SMTP_PORT,
              from: {
                name: server.config.SMTP_FROM,
                email: server.config.SMTP_EMAIL,
              },
              secure: server.config.SMTP_SECURE,
            },
          }),
        },
      }),
      EmailPassword.init({
        signUpFeature: {
          formFields: [
            {
              id: "name",
            },
            {
              id: "username",
            },
          ],
        },
        override: {
          apis: (originalImplementation) => {
            return {
              ...originalImplementation,
              signUpPOST: async function (input) {
                if (originalImplementation.signUpPOST === undefined) {
                  throw Error("Should never come here");
                }

                // These are the input form fields values that the user used while signing up
                let formFields = input.formFields;
                console.log(formFields);

                const name = formFields.find(
                  (element) => element.id === "name"
                );
                const email = formFields.find(
                  (element) => element.id === "email"
                );
                const username = formFields.find(
                  (element) => element.id === "username"
                );
                const password = formFields.find(
                  (element) => element.id === "password"
                );

                console.log(name.value, email.value, username.value);

                // First we try the API insert, this will ensure valid values for the rest of the process.
                const client = await server.pg.connect();
                  try {
                    const result = await client.query(
                      "INSERT INTO nugget.members(name, email, username) VALUES ($1, $2, $3)",
                      [name.value, email.value, username.value]
                    );
                    // Note: avoid doing expensive computation here, this will block releasing the client
                    console.log("RESULTTTTTTTTTTT", result);

                    const goToSocialCommand = [
                      "./gotosocial/gotosocial --config-path ./gotosocial/config.yaml admin account create",
                    ];
                    goToSocialCommand.push(...["--username", username.value]);
                    goToSocialCommand.push(...["--email", email.value]);
                    goToSocialCommand.push(...["--password", password.value]);

                    const commandStr = goToSocialCommand.join(" ");

                    console.log("GOTOSOCIAL COMMAND \n", commandStr);

                    // Run GoToSocial command to add the user
                    exec(commandStr, (err, output) => {
                      // once the command has completed, the callback function is called
                      if (err) {
                        // log and return if we encounter an error
                        console.error("could not execute command: ", err);
                        return;
                      }
                      // log the output received from the command
                      console.log("GOTOSOCIAL RESULT: \n", output);
                    });
                  } catch (e) {
                    console.log("ERROR!!!!!!!!!!!!!!!!!!!!!!! \n", e);
                  } finally {
                    // Release the client immediately after query resolves, or upon error
                    client.release();
                  }

                // Second we call the original implementation of signUpPOST.
                let response = await originalImplementation.signUpPOST(input);

                // Post sign up response, we check if it was successful
                if (response.status === "OK") {
                  
                }
                return response;
              },
            };
          },
        },
      }), // initializes signin / sign up features
      Session.init({
        getTokenTransferMethod: () => "cookie", // "header",
        exposeAccessTokenToFrontendInCookieBasedAuth: true,
        override: {
          functions: (originalImplementation) => {
            return {
              ...originalImplementation,

              // here we are only overriding the function that's responsible
              // for creating a new session
              consumeCode: async function (input) {
                // TODO: some custom logic

                // or call the default behaviour as show below
                const originalResult = await originalImplementation.consumeCode(
                  input
                );

                console.log("ORIGINAL", originalResult);
              },
              // signUp: async function (input) {
              //   // TODO: some custom logic

              //   const superTokensInput = {
              //     "formFields": [
              //       {
              //         "id": "email",
              //         "value": input.email
              //       },
              //       {
              //         "id": "password",
              //         "value": input.password
              //       }
              //     ]
              //   }
              //   const platformInput = [input.commonName, input.email, input.username];

              //   // Add to SuperTokens, if this fails we don't create anything else
              //   const originalResult = await originalImplementation.signUp(input);
              //   console.log('ORIGINAL RESULT', originalResult)

              //   const client = await server.pg.connect()
              //   try {
              //     const result = await client.query(
              //       'INSERT INTO nugget.member(common_name, email, username) VALUES (?, ?, ?)', platformInput,
              //     )
              //     // Note: avoid doing expensive computation here, this will block releasing the client
              //     console.log('RESULTTTTTTTTTTT', result)
              //   } catch(e) {
              //     console.log("ERROR!!!!!!!!!!!!!!!!!!!!!!! \n", e)
              //   } finally {

              //     // Release the client immediately after query resolves, or upon error
              //     client.release()
              //   }

              //   const goToSocialCommand = ["../../../gotosocial --config-path ./config.yaml admin account create"];
              //   goToSocialCommand.push(...['--username', input.username]);
              //   goToSocialCommand.push(...['--email', input.email]);
              //   goToSocialCommand.push(...['--password', input.password]);

              //   const commandStr = goToSocialCommand.join(' ');

              //   console.log('GOTOSOCIAL COMMAND \n', commandStr)

              //   // // Run GoToSocial command to add the user
              //   // exec(commandStr, (err, output) => {
              //   //     // once the command has completed, the callback function is called
              //   //     if (err) {
              //   //         // log and return if we encounter an error
              //   //         console.error("could not execute command: ", err)
              //   //         return
              //   //     }
              //   //     // log the output received from the command
              //   //     console.log("GOTOSOCIAL RESULT: \n", output)
              //   // })

              //   // Create platform account

              //   console.log('ORIGINAL', originalResult);
              // },
              // ...
              // TODO: override more functions
            };
          },
        },
      }), // initializes session features
    ],
  });

  // we register a CORS route to allow requests from the frontend
  server.register(cors, {
    origin: server.config.CORS_ORIGIN_URL,
    allowedHeaders: [
      "Content-Type",
      "anti-csrf",
      "rid",
      "fdi-version",
      "authorization",
      "st-auth-mode",
    ],
    methods: ["GET", "PUT", "POST", "DELETE", "PATCH"],
    credentials: true,
  });

  server.register(formDataPlugin);
  server.register(plugin);

  server.setErrorHandler(errorHandler());
}

export default fastifyPlugin(auth);
